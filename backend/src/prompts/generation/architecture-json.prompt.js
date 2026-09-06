/**
 * Build the Step 3 system prompt.
 * @returns {string}
 */
function buildArchitectureJsonSystemPrompt() {

  return `
You output ONLY a single valid JSON object. No markdown. No backticks. No comments. No text outside the JSON.

PRODUCE THIS EXACT SCHEMA — fill every field:
{
  "scale_analysis": "2-3 sentences: scale tier, key drivers, and why this architecture is appropriate for the user's budget and scale",
  "architecture_overview": {
    "strategy": "3-4 sentences of overall design rationale specific to this tier's approach",
    "pattern": "e.g. Serverless Monolith, Event-Driven Microservices, Distributed Multi-AZ Enterprise",
    "read_flow": "User → Cognito → API Gateway → Lambda/ECS → [Cache] → DynamoDB",
    "write_flow": "User → API Gateway → Lambda/ECS → DynamoDB → [SQS → Worker]",
    "realtime_flow": "WebSocket path OR exactly the string: N/A - no real-time features",
    "async_flow": "SQS→Worker path OR exactly the string: N/A - no async processing",
    "key_tradeoffs": "1-2 sentences about what this tier sacrifices compared to other tiers",
    "topology_edges": [
      {
        "from": "node",
        "to": "node",
        "relationship": "string"
      }
    ]
  },
  "aws_services": [
    {
      "name": "exact AWS service name",
      "role": "specific technical role",
      "justification": "which feature or scale requirement forces inclusion",
      "data_flow": "what enters and what leaves",
      "configuration": "specific configuration details e.g. On-Demand, t3.micro, Multi-AZ",
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
    "cost_notes": "key cost drivers and specific reduction strategies for this tier",
    "cost_optimization_tips": ["tip 1", "tip 2", "tip 3"]
  },
  "implementation_steps": [
    {
      "phase": "Phase N — Title",
      "duration": "X weeks",
      "tasks": ["task 1", "task 2", "task 3"]
    }
  ],
  "mermaid": ""
}

STRICT RULES:
- "mermaid" must always be empty string "" — filled in next step
- Every service in aws_services must appear in at least one architecture_overview flow
- No service in aws_services that was not in the Step 2 input
- per_service percentages must sum to approximately 100%
- cost_per_user must be calculated: monthly_estimate midpoint / (users / 1000)
- Be concise in strings to avoid hitting length limits
- All JSON strings must be properly escaped

STRICT TOPOLOGY EDGES RULES:
- topology_edges MUST accurately reflect the \`## Architecture Topology\` section produced by Step 2.
- Do not silently discard topology edges during JSON assembly.
- Do not invent edges that were not represented in Step 2 unless required to make an explicitly selected service operationally connected.
- Every important service-to-service relationship represented in Step 2 should survive into topology_edges.
- The nodes in topology_edges must correspond to services/components actually present in the architecture.
- The topology_edges field exists specifically to preserve the architectural graph skeleton for the Mermaid generation stage.

SERVICE JUSTIFICATION RULES:
- Justifications MUST be requirement-specific and explain why THAT service is needed for THIS architecture.
- Avoid generic phrases such as "Chosen because AWS Lambda is scalable", "Chosen because DynamoDB is highly available", or "Required for the application".
- Do NOT overstate technical guarantees (e.g., do NOT claim "DynamoDB provides isolated tenant data" — instead say "DynamoDB implements the tenant data model, with tenant-aware authorization/data-access controls enforcing isolation"; do NOT claim "Cognito provides tenant isolation" — instead say "Cognito provides user authentication and issues JWT tokens containing tenant identity claims; application authorization layers enforce isolation").
DYNAMIC COST RULES:
- Adjust pricing estimates realistically based on the user's explicit budget and expected users/scale.
- If the project is low-budget/free-tier focused, leverage AWS Free Tier extensively (Lambda: 1M free requests, DynamoDB: 25 WCU free). Show $0-$5 for free-tier eligible services.
- If the project is standard production, reflect moderate usage costs (e.g. $200-$2,500/month).
- If the project is enterprise/high-scale, reflect multi-AZ redundancy and provisioned capacity (e.g. $2,000-$25,000/month).
- cost_notes MUST explain the primary cost drivers and optimization strategies based on the selected scale.
`;
}


/**
 * Build the Step 3 user prompt.
 * @param {{ analysis: string, serviceStack: string, idea: string, users: string, budget?: string }} params
 * @returns {string}
 */
function buildArchitectureJsonUserPrompt({ analysis, serviceStack, idea, users, budget }) {
  return `
Step 1 Classification:
${analysis}

Step 2 Service Selection:
${serviceStack}

Project: ${idea}
Users: ${users}, Budget: ${budget || "not specified"}
`;
}

module.exports = {
  buildArchitectureJsonSystemPrompt,
  buildArchitectureJsonUserPrompt
};
