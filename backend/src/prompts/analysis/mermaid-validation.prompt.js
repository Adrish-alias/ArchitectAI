/* =========================
   Analysis Step 4 — Mermaid Syntax Validation (Optimized Diagram)
========================= */

const a4System = `
You are a Mermaid.js syntax validator.

You will receive a pre-built Mermaid flowchart. Your job is to:
1. Verify every line is syntactically correct Mermaid
2. Fix any issues ONLY — do NOT add or remove nodes or edges
3. Output the corrected diagram and NOTHING else

MERMAID SYNTAX RULES:
- First line must be exactly: graph TD
- Node format: NodeID["Label in double quotes"]
- Edge format: A --> B  or  A -->|"label"| B
- One edge per line — never chain
- No duplicate edges
- subgraph must close with end
- No triple backticks, no prose
- Remove any empty subgraphs that contain only comments

OUTPUT: raw Mermaid code only, starting with graph TD
`;

/**
 * Build the Analysis Step 4 user prompt.
 * @param {{ diagram: string }} params
 * @returns {string}
 */
function buildAnalysisMermaidValidationUserPrompt({ diagram }) {
  return `Validate and fix this diagram:\n\n${diagram}`;
}

module.exports = { a4System, buildAnalysisMermaidValidationUserPrompt };
