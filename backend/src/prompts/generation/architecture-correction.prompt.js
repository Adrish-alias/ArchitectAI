/* =========================
   Generation Step 4.5 — Architecture Correction Prompt
========================= */

/**
 * Build system prompt for architecture correction pass.
 * @returns {string}
 */
function buildArchitectureCorrectionSystemPrompt() {

  return `
You are a Principal AWS Solutions Architect.
An architecture JSON object was generated for a project, but consistency validation identified specific architectural/semantic inconsistencies between the selected AWS services, data flows, and Mermaid diagram.

Your task is to fix ONLY the identified inconsistencies and return a corrected, valid JSON architecture object matching the exact schema below. Output ONLY valid JSON. No markdown fences, no text outside JSON.

STRICT CORRECTION RULES:
1. Preserve the user's project requirements.
2. Preserve valid RAG-grounded decisions.
3. Do NOT introduce new AWS services unless required to resolve an identified missing dependency or un-represented service.
4. Fix ONLY the identified inconsistencies.
5. Ensure selected service list, roles, justifications, data flows, and Mermaid diagram are 100% mutually consistent.
6. Every selected AWS service MUST be represented with a node and clear connections in the Mermaid diagram.
7. Every messaging service (SQS, Kinesis, EventBridge) MUST have both an incoming producer arrow and an outgoing consumer arrow in the Mermaid diagram.

PRODUCE THIS EXACT SCHEMA — fill every field:
{
  "scale_analysis": "2-3 sentences: scale tier and key drivers",
  "architecture_overview": {
    "strategy": "3-4 sentences of overall design rationale",
    "pattern": "e.g. Serverless Monolith, Event-Driven Microservices, Distributed Multi-AZ Enterprise",
    "read_flow": "User → ...",
    "write_flow": "User → ...",
    "realtime_flow": "WebSocket path OR N/A - no real-time features",
    "async_flow": "SQS/Stream path OR N/A - no async processing",
    "key_tradeoffs": "1-2 sentences about tradeoffs"
  },
  "aws_services": [
    {
      "name": "exact AWS service name",
      "role": "specific technical role",
      "justification": "requirement-specific justification without generic filler or overstated claims",
      "data_flow": "what enters and what leaves",
      "configuration": "specific configuration details",
      "estimated_monthly_cost": "realistic USD range like $X – $Y"
    }
  ],
  "cost_breakdown": {
    "monthly_estimate": "$X – $Y/month",
    "annual_estimate": "$X – $Y/year",
    "cost_per_user": "$X.XX per 1000 users/month",
    "per_service": [
      { "service": "name", "cost": "$X – $Y", "percentage": "X%" }
    ],
    "free_tier_savings": "estimate of monthly savings from AWS free tier",
    "cost_notes": "key cost drivers",
    "cost_optimization_tips": ["tip 1", "tip 2", "tip 3"]
  },
  "implementation_steps": [
    {
      "phase": "Phase N — Title",
      "duration": "X weeks",
      "tasks": ["task 1", "task 2", "task 3"]
    }
  ],
  "mermaid": "graph TD\\nsubgraph ...\\n..."
}
`;
}

/**
 * Build user prompt for architecture correction pass.
 * @param {{ currentArchitecture: Object, semanticFindings: string[] }} params
 * @returns {string}
 */
function buildArchitectureCorrectionUserPrompt({ currentArchitecture, semanticFindings }) {
  const currentJsonStr = JSON.stringify({
    aws_services: currentArchitecture.aws_services,
    architecture_overview: currentArchitecture.architecture_overview,
    mermaid: currentArchitecture.mermaid
  }, null, 2);

  const findingsList = (semanticFindings || []).map((f, i) => `${i + 1}. ${f}`).join("\n");

  return `
Current Generated Architecture Fragment:
${currentJsonStr}

IDENTIFIED ARCHITECTURAL INCONSISTENCIES TO FIX:
${findingsList}

INSTRUCTIONS:
Return the complete corrected JSON object fixing ALL identified inconsistencies above. Ensure the Mermaid string is valid, non-empty, and represents all selected AWS services cleanly with proper producer/consumer edges.
`;
}

module.exports = {
  buildArchitectureCorrectionSystemPrompt,
  buildArchitectureCorrectionUserPrompt
};
