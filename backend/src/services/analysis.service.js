const { callLLM } = require("./llm/llm.service");
const { refineAnalysis } = require("./gemini.service");
const { safeParse, attemptJsonRecovery } = require("./json.service");
const { buildOptimizedMermaid, sanitizeMermaid } = require("./mermaid.service");
const {
  a1System,
  buildArchitectureParserUserPrompt
} = require("../prompts/analysis/architecture-parser.prompt");
const {
  a2System,
  buildIssueDetectorUserPrompt
} = require("../prompts/analysis/issue-detector.prompt");
const {
  a3System,
  buildOptimizationUserPrompt
} = require("../prompts/analysis/optimization.prompt");
const {
  a4System,
  buildAnalysisMermaidValidationUserPrompt
} = require("../prompts/analysis/mermaid-validation.prompt");

/**
 * Run the full 5-step architecture analysis pipeline.
 *
 * @param {{ mermaid: string, description: string }} params
 * @returns {Promise<object>} data — the frontend-facing analysis JSON
 */
async function analyseArchitecture({ mermaid: mermaidCode, description }) {
  // ─── ANALYSE STEP 1: Architecture Parser ──────────────────────────────────
  const a1User = buildArchitectureParserUserPrompt({ description, mermaidCode });

  const archParsed = await callLLM(a1System, a1User, 1200);
  console.log("ANALYSE STEP 1:\n", archParsed);

  // ─── ANALYSE STEP 2: Issue Detector ───────────────────────────────────────
  const a2User = buildIssueDetectorUserPrompt({ archParsed, mermaidCode, description });

  const issuesRaw = await callLLM(a2System, a2User, 1800);
  console.log("ANALYSE STEP 2 raw:\n", issuesRaw);

  let issues = null;

  // Try to parse as array
  try {
    const trimmed = issuesRaw.trim();
    if (trimmed.startsWith("[")) {
      issues = JSON.parse(trimmed);
    }
  } catch { }

  if (!issues) {
    // Try extracting array from text
    const arrStart = issuesRaw.indexOf("[");
    const arrEnd   = issuesRaw.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd !== -1) {
      try {
        issues = JSON.parse(issuesRaw.slice(arrStart, arrEnd + 1));
      } catch { }
    }
  }

  if (!issues) {
    // Attempt recovery
    const arrStart = issuesRaw.indexOf("[");
    if (arrStart !== -1) {
      let text = issuesRaw.slice(arrStart);
      const qc = (text.match(/(?<!\\)"/g) || []).length;
      if (qc % 2 !== 0) text += '"';
      let br = 0, bk = 0;
      for (const ch of text) {
        if (ch === "{")      br++;
        else if (ch === "}") br--;
        else if (ch === "[") bk++;
        else if (ch === "]") bk--;
      }
      text = text.trimEnd();
      if (text.endsWith(",")) text = text.slice(0, -1);
      text += "}".repeat(Math.max(0, br));
      text += "]".repeat(Math.max(0, bk));
      try { issues = JSON.parse(text); } catch { }
    }
  }

  if (!issues || !Array.isArray(issues)) {
    issues = [{
      node_id: null,
      service_name: "General",
      type: "anti_pattern",
      severity: "medium",
      title: "Architecture review could not be fully parsed",
      description: "The AI analysis produced results but they could not be fully structured. The raw analysis is available.",
      recommendation: "Re-run the analysis or review the architecture manually."
    }];
  }

  // ─── ANALYSE STEP 3: Optimized Architecture Builder ───────────────────────
  const issuesSummary = issues.map(i =>
    `- [${i.type.toUpperCase()}] ${i.title}: ${i.recommendation}`
  ).join("\n");

  const a3User = buildOptimizationUserPrompt({ mermaidCode, description, issuesSummary, archParsed });

  const a3Raw = await callLLM(a3System, a3User, 2500);

  let optimized = safeParse(a3Raw);
  if (!optimized) {
    console.warn("Analyse Step 3: clean parse failed — attempting recovery");
    optimized = attemptJsonRecovery(a3Raw);
  }

  if (!optimized) {
    const err = new Error("Failed to generate optimized architecture JSON");
    err.statusCode = 500;
    err.issues = issues;
    throw err;
  }

  // Defaults
  optimized.optimized_services              = optimized.optimized_services              || [];
  optimized.optimized_architecture_overview = optimized.optimized_architecture_overview || {};
  optimized.optimized_cost_breakdown        = optimized.optimized_cost_breakdown        || {};

  console.log("ANALYSE STEP 3 OK. Services:", optimized.optimized_services.map(s => `${s.name} [${s.status}]`));

  // ─── ANALYSE STEP 4: Build Optimized Mermaid ──────────────────────────────
  const optimizedDiagram = buildOptimizedMermaid(optimized);

  const a4User = buildAnalysisMermaidValidationUserPrompt({ diagram: optimizedDiagram });
  const rawOptMermaid = await callLLM(a4System, a4User, 1200);
  optimized.mermaid = sanitizeMermaid(rawOptMermaid);

  if (!optimized.mermaid.startsWith("graph")) {
    console.warn("Analyse Step 4: Llama output invalid — using pre-built diagram");
    optimized.mermaid = sanitizeMermaid(optimizedDiagram);
  }

  console.log("ANALYSE STEP 4 MERMAID:\n", optimized.mermaid);

  // ─── ANALYSE STEP 5: Gemini Validation ────────────────────────────────────
  console.log("ANALYSE STEP 5 (Gemini) START");
  try {
    const geminiResult = await refineAnalysis({
      issues,
      optimized,
      original_mermaid: mermaidCode
    });
    if (geminiResult.issues)   issues   = geminiResult.issues;
    if (geminiResult.optimized) optimized = geminiResult.optimized;
    console.log("ANALYSE STEP 5 DONE");
  } catch (e) {
    console.error("Gemini analysis refinement failed:", e.message);
  }

  return {
    original_mermaid: mermaidCode,
    description,
    issues,
    ...optimized
  };
}

module.exports = { analyseArchitecture };
