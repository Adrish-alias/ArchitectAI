const { callLlama } = require("./llama.service");
const { refineArchitecture } = require("./gemini.service");
const { safeParse, attemptJsonRecovery } = require("./json.service");
const { buildArchitectureMermaid, sanitizeMermaid } = require("./mermaid.service");
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

/**
 * Run the full 5-step architecture generation pipeline.
 *
 * @param {{ idea: string, users: string, budget?: string, features?: string[], tier?: string }} params
 * @returns {Promise<object>} finalData — the frontend-facing architecture JSON
 */
async function generateArchitecture({ idea, users, budget, features, tier }) {
  // Tier validation
  const archTier = ["cost", "balanced", "performance"].includes(tier) ? tier : "balanced";

  // ─── STEP 1: Scale & Complexity Classifier ──────────────────────────────
  const step1System = buildClassificationSystemPrompt({ tier: archTier });
  const step1User   = buildClassificationUserPrompt({ idea, users, budget, features });

  const analysis = await callLlama(step1System, step1User, 300);
  console.log("STEP 1:\n", analysis);

  // ─── STEP 2: Service Selection ───────────────────────────────────────────
  const step2System = buildServiceSelectionSystemPrompt({ tier: archTier });
  const step2User   = buildServiceSelectionUserPrompt({ analysis, idea, features, users, budget });

  const serviceStack = await callLlama(step2System, step2User, 1500);
  console.log("STEP 2:\n", serviceStack);

  // ─── STEP 3: JSON Assembly ───────────────────────────────────────────────
  const step3System = buildArchitectureJsonSystemPrompt({ tier: archTier });
  const step3User   = buildArchitectureJsonUserPrompt({ analysis, serviceStack, idea, users, budget });

  const jsonRaw = await callLlama(step3System, step3User, 3500);

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

  // Ensure required keys exist (defensive defaults for truncated responses)
  parsed.aws_services          = parsed.aws_services          || [];
  parsed.architecture_overview = parsed.architecture_overview || {};
  parsed.cost_breakdown        = parsed.cost_breakdown        || {};
  parsed.implementation_steps  = parsed.implementation_steps  || [];

  // Ensure tier is set in output
  parsed.tier = archTier;
  console.log(`STEP 3 OK [${archTier}]. Services:`, parsed.aws_services.map(s => s.name));

  // ─── STEP 4: Mermaid Diagram Generator ──────────────────────────────────
  const preBuildDiagram = buildArchitectureMermaid(parsed);

  const step4User = buildMermaidValidationUserPrompt({ diagram: preBuildDiagram });
  const rawMermaid = await callLlama(step4System, step4User, 1200);
  parsed.mermaid = sanitizeMermaid(rawMermaid);

  if (!parsed.mermaid.startsWith("graph")) {
    console.warn("Step 4: Llama output invalid — using pre-built diagram as fallback");
    parsed.mermaid = sanitizeMermaid(preBuildDiagram);
  }

  console.log("STEP 4 MERMAID:\n", parsed.mermaid);

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

  return finalData;
}

module.exports = { generateArchitecture };
