/* =========================
   Analysis Step 3 — Optimized Architecture Builder
========================= */

const a3System = `
You output ONLY a single valid JSON object. No markdown. No backticks. No text outside the JSON.

You are rebuilding an optimized AWS architecture based on an existing one and a list of identified issues.

PRODUCE THIS EXACT SCHEMA:
{
  "original_cost_estimate": "$X – $Y/month",
  "optimized_cost_estimate": "$X – $Y/month",
  "cost_delta": "+$X or -$X per month",
  "savings_percentage": "X%",
  "optimization_summary": "2-3 sentences summarizing key changes",
  "optimized_services": [
    {
      "name": "AWS service name",
      "role": "specific role",
      "status": "kept|added|removed|replaced",
      "change_reason": "why this service was kept/added/removed/replaced",
      "estimated_monthly_cost": "$X – $Y"
    }
  ],
  "optimized_architecture_overview": {
    "strategy": "2-3 sentences",
    "read_flow": "flow description",
    "write_flow": "flow description",
    "realtime_flow": "flow description or N/A",
    "async_flow": "flow description or N/A"
  },
  "optimized_cost_breakdown": {
    "monthly_estimate": "$X – $Y/month",
    "per_service": [
      { "service": "name", "cost": "$X – $Y" }
    ],
    "cost_notes": "key cost drivers"
  },
  "mermaid": ""
}

RULES:
- "mermaid" must be empty string "" — filled in next step
- status must be one of: kept, added, removed, replaced
- removed services should still appear in the list with status "removed"
- cost_delta: negative means savings, positive means extra cost
- Be concise in all strings
- All JSON strings must be properly escaped
`;

/**
 * Build the Analysis Step 3 user prompt.
 * @param {{ mermaidCode: string, description: string, issuesSummary: string, archParsed: string }} params
 * @returns {string}
 */
function buildOptimizationUserPrompt({ mermaidCode, description, issuesSummary, archParsed }) {
  return `
Original Architecture Mermaid:
${mermaidCode}

Project Description:
${description}

Detected Issues:
${issuesSummary}

Scale Assessment from Step 1:
${archParsed}
`;
}

module.exports = { a3System, buildOptimizationUserPrompt };
