const { callLLM } = require("./llm/llm.service");
const { refineArchitecture } = require("./gemini.service");
const { safeParse, attemptJsonRecovery } = require("./json.service");
const { buildArchitectureMermaid, sanitizeMermaid } = require("./mermaid.service");
const { validateArchitectureConsistency } = require("./validator.service");
const { ragRetrieve } = require("../rag/rag-service");
const { RAG_ENABLED } = require("../config/env");


const {
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt
} = require("../prompts/generation/classification.prompt");
const {
  buildServiceSelectionSystemPrompt,
  buildServiceSelectionUserPrompt
} = require("../prompts/generation/service-selection.prompt");
const {
  buildArchitectureJsonSystemPrompt,
  buildArchitectureJsonUserPrompt
} = require("../prompts/generation/architecture-json.prompt");
const {
  step4System,
  buildMermaidValidationUserPrompt
} = require("../prompts/generation/mermaid-validation.prompt");


const {
  buildArchitectureCorrectionSystemPrompt,
  buildArchitectureCorrectionUserPrompt
} = require("../prompts/generation/architecture-correction.prompt");
const {
  pricingService,
  getSchemasForServices,
  formatSchemasForPrompt,
  validatePricingPayload
} = require("./pricing");
const {
  buildPricingConfigSystemPrompt,
  buildPricingConfigUserPrompt
} = require("../prompts/generation/pricing-config.prompt");

/**
 * Extract canonical or raw service names from Step 2 markdown output.
 *
 * @param {string} serviceStackText
 * @returns {string[]}
 */
function extractSelectedServices(serviceStackText) {
  if (!serviceStackText || typeof serviceStackText !== "string") return [];
  const servicesSectionMatch = serviceStackText.match(/## Selected AWS Services\s*([\s\S]*)/i);
  const targetText = servicesSectionMatch ? servicesSectionMatch[1] : serviceStackText;

  const services = [];
  const regex = /^\s*(?:\*{1,2})?SERVICE(?:\*{1,2})?:\s*([^\r\n]+)/gmi;
  let match;
  while ((match = regex.exec(targetText)) !== null) {
    let name = match[1].trim();
    name = name
      .replace(/^[\s*_\-#:]+/, "")
      .replace(/[\s*_\-#:]+$/, "")
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .trim();
    if (name && !services.includes(name)) {
      services.push(name);
    }
  }
  return services;
}

/**
 * Run the full 5-step architecture generation pipeline.
 *
 * @param {{ idea: string, users: string, budget?: string, features?: string[] }} params
 * @returns {Promise<object>} finalData — the frontend-facing architecture JSON
 */
async function generateArchitecture({ idea, users, budget, features }) {
  // ─── STEP 1: Scale & Complexity Classifier ──────────────────────────────
  const step1System = buildClassificationSystemPrompt();
  const step1User   = buildClassificationUserPrompt({ idea, users, budget, features });

  const analysis = await callLLM(step1System, step1User, 600, { step: "Step 1: Classification" });
  console.log("STEP 1:\n", analysis);

  // ─── RAG RETRIEVAL ────────────────────────────────────────────────────────
  let ragResults = null;
  if (RAG_ENABLED) {
    ragResults = await ragRetrieve({
      idea,
      users,
      budget,
      features,
      classificationText: analysis
    });

    if (ragResults && Array.isArray(ragResults.results)) {
      const extractedConnections = ragResults.results.flatMap(r => (r.architecture.connections || []).map(c => `${c.from || c.source} -> ${c.to || c.target}: ${c.relationship || c.rel}`));
      console.log(`[RAG TOPOLOGY EXTRACTION] Extracted ${extractedConnections.length} topology connections from ${ragResults.results.length} retrieved references:`, extractedConnections);
    }
  } else {
    console.log("RAG disabled via RAG_ENABLED=false — skipping retrieval");
  }

  // ─── STEP 2: Service Selection ───────────────────────────────────────────
  const step2System = buildServiceSelectionSystemPrompt();
  const step2User   = buildServiceSelectionUserPrompt({ analysis, idea, features, users, budget, ragResults });

  const serviceStack = await callLLM(step2System, step2User, 4500, { step: "Step 2: Service Selection" });
  console.log("STEP 2:\n", serviceStack);

  const step2TopologyMatch = serviceStack.match(/## Architecture Topology\s*([\s\S]*?)(?=## Selected AWS Services|$)/i);
  const step2TopologyText  = step2TopologyMatch ? step2TopologyMatch[1].trim() : "None";
  console.log("[PIPELINE HANDOFF Step 2 -> Step 3] Extracted Step 2 Architecture Topology:\n", step2TopologyText);

  // ─── STEP 2.5: Pricing Configuration Generation (Lightweight & Safe) ───────
  let pricingResult = null;
  let pricingConfigs = [];
  let pricingStatus = "failed";
  let pricingError = null;

  try {
    const selectedServices = extractSelectedServices(serviceStack);
    console.log(`[STEP 2.5] Extracted ${selectedServices.length} selected services from Step 2:`, selectedServices);

    const { supportedSchemas, unsupportedServices } = getSchemasForServices(selectedServices);

    if (unsupportedServices.length > 0) {
      console.log(`[STEP 2.5] Services unsupported by deterministic pricing engine:`, unsupportedServices);
    }

    if (supportedSchemas.length === 0) {
      console.warn("[STEP 2.5] No supported services found for pricing configuration");
      pricingStatus = "skipped";
    } else {
      const schemasContext = formatSchemasForPrompt(supportedSchemas);
      const step25System = buildPricingConfigSystemPrompt(schemasContext);
      const step25User   = buildPricingConfigUserPrompt({
        idea,
        users,
        budget,
        features,
        selectedServices: supportedSchemas.map(s => s.service),
        analysis
      });

      console.log(`[STEP 2.5] Sizing ${supportedSchemas.length} supported AWS services with deterministic schemas...`);
      const pricingRaw = await callLLM(step25System, step25User, 2000, { step: "Step 2.5: Pricing Config Generation" });

      let parsedPricing = safeParse(pricingRaw);
      if (!parsedPricing) {
        console.warn("[STEP 2.5] JSON clean parse failed — attempting recovery");
        parsedPricing = attemptJsonRecovery(pricingRaw);
      }

      if (!parsedPricing) {
        throw new Error("Invalid or unrecoverable JSON from Step 2.5");
      }

      const validation = validatePricingPayload(parsedPricing, selectedServices);

      if (!validation.valid && validation.configs.length === 0) {
        throw new Error(`Pricing config validation failed: ${validation.errors.join("; ")}`);
      }

      pricingConfigs = validation.configs;
      console.log(`[STEP 2.5] Successfully validated ${pricingConfigs.length} pricing configs`);

      console.log("\n==================================================");
      console.log("[STEP 2.5] GENERATED PRICING CONFIGURATIONS");
      console.log("==================================================");
      console.log(`Selected services: ${selectedServices.join(", ")}`);
      console.log("Pricing configurations:");
      console.log(JSON.stringify(pricingConfigs, null, 2));
      console.log("==================================================\n");

      const pricingEngineInput = { services: pricingConfigs };
      console.log("[STEP 2.5] INPUT TO DETERMINISTIC PRICING ENGINE:");
      console.log(JSON.stringify(pricingEngineInput, null, 2));
      console.log("");

      // Run deterministic pricing calculation
      pricingResult = pricingService.calculateArchitectureCost(pricingEngineInput);
      pricingStatus = "success";

      console.log("[PRICING] DETERMINISTIC COST RESULT:");
      console.log(`Total monthly: $${pricingResult.totalMonthlyCostUsd}`);
      console.log("Per-service breakdown:");
      console.log(JSON.stringify(pricingResult.services, null, 2));
      console.log(`[STEP 2.5] Deterministic Monthly Cost: $${pricingResult.totalMonthlyCostUsd} (${pricingResult.summary.supportedServices} supported, ${pricingResult.summary.unsupportedServices} unsupported)\n`);
    }
  } catch (err) {
    console.warn("[STEP 2.5 WARNING] Pricing config generation failed — safely isolating from architecture pipeline:", err.message);
    pricingStatus = "failed";
    pricingError = err.message;
  }

  // ─── STEP 3: JSON Assembly ───────────────────────────────────────────────
  const step3System = buildArchitectureJsonSystemPrompt();
  const step3User   = buildArchitectureJsonUserPrompt({ analysis, serviceStack, idea, users, budget });

  const jsonRaw = await callLLM(step3System, step3User, 6000, { step: "Step 3: JSON Assembly" });

  let parsed = safeParse(jsonRaw);

  if (!parsed) {
    console.warn("Step 3: clean parse failed — attempting truncation recovery");
    parsed = attemptJsonRecovery(jsonRaw);
  }

  if (!parsed) {
    const err = new Error("Invalid JSON from Step 3 — even recovery failed");
    err.rawOutput = jsonRaw;
    err.statusCode = 500;
    throw err;
  }

  parsed.aws_services          = parsed.aws_services          || [];
  parsed.architecture_overview = parsed.architecture_overview || {};
  parsed.architecture_overview.topology_edges = parsed.architecture_overview.topology_edges || [];
  parsed.cost_breakdown        = parsed.cost_breakdown        || {};
  parsed.implementation_steps  = parsed.implementation_steps  || [];

  console.log(`STEP 3 OK. Services:`, parsed.aws_services.map(s => s.name));
  console.log(`[PIPELINE HANDOFF Step 3 -> Step 4] Parsed topology_edges (${parsed.architecture_overview.topology_edges.length} edges):`, JSON.stringify(parsed.architecture_overview.topology_edges, null, 2));

  if (ragResults && ragResults.referenceAnalysis?.topScore >= 0.82 && parsed.architecture_overview.topology_edges.length === 0) {
    console.warn("[PIPELINE WARNING] High-confidence RAG match present, but Step 3 topology_edges is empty!");
  }

  // ─── STEP 4: Mermaid Diagram Generator ──────────────────────────────────
  const preBuildDiagram = buildArchitectureMermaid(parsed);
  const step4User = buildMermaidValidationUserPrompt({ diagram: preBuildDiagram });
  const rawMermaid = await callLLM(step4System, step4User, 1800, { step: "Step 4: Mermaid Validation" });
  parsed.mermaid = sanitizeMermaid(rawMermaid);

  if (!parsed.mermaid.startsWith("graph")) {
    console.warn("Step 4: Llama output invalid — using pre-built diagram as fallback");
    parsed.mermaid = sanitizeMermaid(preBuildDiagram);
  }

  console.log("STEP 4 MERMAID:\n", parsed.mermaid);

  // ─── ARCHITECTURE CONSISTENCY VALIDATION & CORRECTION LOOP ───────────────
  let validationReport = validateArchitectureConsistency(parsed);
  let validationStatus = "PASS";
  let attempt = 0;
  const MAX_CORRECTION_ATTEMPTS = 2;

  if (validationReport.valid) {
    console.log("VALIDATION: PASS");
    validationStatus = "PASS";
  } else if (validationReport.hasSemanticIssues) {
    while (attempt < MAX_CORRECTION_ATTEMPTS && validationReport.hasSemanticIssues) {
      attempt++;
      console.log(`VALIDATION: CORRECTION_ATTEMPT_${attempt}`);

      try {
        const corrSystem = buildArchitectureCorrectionSystemPrompt();
        const corrUser   = buildArchitectureCorrectionUserPrompt({
          currentArchitecture: parsed,
          semanticFindings: validationReport.semanticFindings
        });

        const rawCorr = await callLLM(corrSystem, corrUser, 5000, { step: "Correction Loop" });
        const parsedCorr = safeParse(rawCorr) || attemptJsonRecovery(rawCorr);

        if (parsedCorr && Array.isArray(parsedCorr.aws_services)) {
          if (!parsedCorr.mermaid || !parsedCorr.mermaid.startsWith("graph")) {
            parsedCorr.mermaid = sanitizeMermaid(buildArchitectureMermaid(parsedCorr));
          } else {
            parsedCorr.mermaid = sanitizeMermaid(parsedCorr.mermaid);
          }

          parsed = parsedCorr;
          validationReport = validateArchitectureConsistency(parsed);

          if (validationReport.valid) {
            console.log("VALIDATION: PASS");
            validationStatus = "PASS";
            break;
          }
        }
      } catch (err) {
        console.warn(`[VALIDATOR] Correction attempt ${attempt} error:`, err.message);
      }
    }

    if (!validationReport.valid) {
      console.log("VALIDATION: NEEDS_REVIEW");
      validationStatus = "NEEDS_REVIEW";
    }
  }

  parsed.validation_status = validationStatus;
  parsed.validation_report = validationReport;

  // ─── STEP 5: Gemini Validation & Refinement ─────────────────────────────
  console.log("STEP 5 (Gemini) START");
  let finalData;
  try {
    finalData = await refineArchitecture(parsed);
    console.log("STEP 5 DONE");
  } catch (e) {
    console.error("Gemini failed — using Step 4 output:", e.message);
    finalData = parsed;
  }

  finalData.validation_status = validationStatus;
  finalData.validation_report = validationReport;

  // ─── FINAL PRICING ENRICHMENT ─────────────────────────────────────────────
  if (pricingStatus === "success" && pricingResult) {
    finalData.pricing = {
      status: "success",
      configs: pricingConfigs,
      cost_breakdown: {
        total_monthly_cost_usd: pricingResult.totalMonthlyCostUsd,
        raw_total_monthly_cost_usd: pricingResult.rawTotalMonthlyCostUsd,
        currency: pricingResult.currency || "USD",
        services: pricingResult.services,
        summary: pricingResult.summary
      }
    };

    // Additive non-breaking enrichment of existing cost_breakdown
    finalData.cost_breakdown = {
      ...finalData.cost_breakdown,
      monthly_estimate: `$${pricingResult.totalMonthlyCostUsd.toFixed(2)}/month`,
      annual_estimate: `$${(pricingResult.totalMonthlyCostUsd * 12).toFixed(2)}/year`,
      currency: "USD",
      deterministic_cost: pricingResult
    };
  } else {
    finalData.pricing = {
      status: pricingStatus,
      error: pricingError || "Pricing configuration unavailable"
    };
  }

  finalData.pricing_configs = pricingConfigs;
  finalData.pricing_config_status = pricingStatus;
  if (pricingError) {
    finalData.pricing_config_error = pricingError;
  }

  return finalData;
}

module.exports = { generateArchitecture };

