const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../config/env");
const { sanitizeMermaid } = require("./mermaid.service");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/* =========================
   Gemini Architecture Refinement (Step 5 — /generate)
========================= */
async function refineArchitecture(data) {
  const prompt = `
You are a strict AWS architecture validator. Validate the JSON below and return a corrected version.

INPUT JSON:
${JSON.stringify(data, null, 2)}

VALIDATION CHECKS:

1. MERMAID SYNTAX
   - First line must be exactly: graph TD
   - Every node: NodeID["Label"] — double-quoted labels, NO parentheses inside labels
     WRONG:  ECS["Amazon ECS (Fargate)"]
     RIGHT:  ECS["Amazon ECS Fargate"]
   - No backticks or markdown fences anywhere
   - No chained edges (A --> B --> C) — must be split into two lines
   - No duplicate edges
   - All subgraphs must close with end

2. SERVICE CONSISTENCY
   - Every service in aws_services must appear in at least one architecture_overview flow
   - Every node in the mermaid diagram must map to a service in aws_services
   - If a node has no matching service, remove the node and its edges

3. COST SANITY
   - per_service costs must sum to approximately monthly_estimate
   - Costs must be realistic for the stated scale

4. FLOW LOGIC
   - ElastiCache must NOT connect directly to DynamoDB
   - SQS must always point to a Lambda Worker
   - User must connect to Cognito before API Gateway

OUTPUT RULES:
- Return ONLY valid JSON, no markdown, no backticks, no explanatory text
- Preserve the exact schema structure of the input
- mermaid field must use literal newlines, not \\n escape sequences
- All JSON strings must be properly escaped
`;

  const modelsToTry = ["gemini-2.5-flash"];
  let text = "";

  for (const modelName of modelsToTry) {
    try {
      console.log(`Gemini trying: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log(`Gemini OK: ${modelName}`);
      break;
    } catch (err) {
      console.warn(`Gemini ${modelName} failed:`, err.message);
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        throw new Error("All Gemini fallback attempts failed.");
      }
    }
  }

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in Gemini response");
    const refined = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    if (refined.mermaid) refined.mermaid = sanitizeMermaid(refined.mermaid);
    return refined;
  } catch (err) {
    console.error("Gemini parse failed:", err.message);
    return data;
  }
}

/* =========================
   Gemini Analysis Refinement (Step 5 — /analyse)
========================= */
async function refineAnalysis({ issues, optimized, original_mermaid }) {
  const prompt = `
You are an expert AWS architecture reviewer and Mermaid diagram validator.

You are given:
1. A list of architecture issues detected by an AI
2. An optimized architecture proposal
3. The original mermaid diagram

VALIDATE AND CORRECT:

1. ISSUES
   - Each issue must have: node_id, service_name, type, severity, title, description, recommendation
   - Types must be: unnecessary, missing, anti_pattern, or cost
   - Severity must be: high, medium, or low
   - Ensure node_ids match the ORIGINAL mermaid diagram nodes

2. OPTIMIZED MERMAID
   - First line: graph TD
   - Node format: NodeID["Label"] — NO parentheses in labels
   - No chained edges, no duplicate edges
   - All subgraphs close with end

3. COST CONSISTENCY
   - optimized costs should be realistic
   - cost_delta should match the difference between original and optimized estimates

Return ONLY valid JSON with this structure:
{
  "issues": [...corrected issues array...],
  "optimized": {...corrected optimized object...}
}

No markdown. No backticks. No explanatory text.

INPUT:
Issues: ${JSON.stringify(issues)}
Optimized: ${JSON.stringify(optimized)}
Original Mermaid: ${original_mermaid}
`;

  const modelsToTry = ["gemini-2.5-flash"];
  let text = "";

  for (const modelName of modelsToTry) {
    try {
      console.log(`Gemini analyse trying: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log(`Gemini analyse OK: ${modelName}`);
      break;
    } catch (err) {
      console.warn(`Gemini ${modelName} failed:`, err.message);
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        throw new Error("All Gemini attempts failed for analysis refinement.");
      }
    }
  }

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    if (parsed.optimized?.mermaid) {
      parsed.optimized.mermaid = sanitizeMermaid(parsed.optimized.mermaid);
    }
    return parsed;
  } catch (err) {
    console.error("Gemini analysis parse failed:", err.message);
    return { issues, optimized };
  }
}

module.exports = { refineArchitecture, refineAnalysis };
