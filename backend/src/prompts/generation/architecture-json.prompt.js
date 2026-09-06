/* =========================
   Generation Step 3 — Structured Architecture JSON Assembly
========================= */

const TIER_STEP3 = {
  cost: `

TIER: COST-EFFICIENT
COST RULES:
- Total monthly estimate MUST be between $15 and $200/month for most apps.
- Use AWS Free Tier pricing where applicable (Lambda: 1M free requests, DynamoDB: 25 WCU/RCU free, S3: 5GB free, Cognito: 50k MAU free).
- Every per_service cost MUST reflect the cheapest configuration.
- cost_notes MUST include: "Leverages AWS Free Tier extensively. Costs shown are for usage beyond free tier allocations."
- Add "tier": "cost" to root JSON.
- scale_analysis MUST mention this is optimized for minimal operational cost.
- architecture_overview.strategy MUST emphasize cost minimization and serverless simplicity.
- DO NOT pad costs — if a service is free tier eligible, show "$0 – $5" not "$50 – $100".

COST EXAMPLES (calibrate from these):
  Lambda 1M requests/mo: $0.20 (beyond free tier)
  DynamoDB 1M reads/mo: $0.25
  API Gateway HTTP API 1M calls: $1.00
  S3 10GB storage: $0.23
  Cognito 1k MAU: $0 (free tier)
  CloudWatch basic: $0 (free tier)`,

  balanced: `

TIER: BALANCED
COST RULES:
- Total monthly estimate MUST be between $200 and $2,500/month for most apps.
- Use standard pricing — not free tier, not premium reserved.
- per_service costs should reflect moderate production usage.
- cost_notes MUST include specific cost optimization tips.
- Add "tier": "balanced" to root JSON.
- scale_analysis MUST describe this as right-sized for production.
- architecture_overview.strategy MUST balance cost vs performance.
- Each service cost should reflect realistic production workloads.

COST EXAMPLES (calibrate from these):
  Lambda 10M requests/mo: $20
  DynamoDB provisioned 50 WCU/RCU: $35/mo
  API Gateway REST 10M calls: $35
  ECS Fargate 2 tasks (0.5vCPU, 1GB): $35/mo
  S3 100GB + transfers: $5
  SQS 5M messages: $2
  CloudFront 100GB transfer: $8.50
  ElastiCache t3.micro: $12/mo`,

  performance: `

TIER: HIGH-PERFORMANCE / ENTERPRISE
COST RULES:
- Total monthly estimate MUST be between $2,000 and $25,000/month for most apps.
- Use production/enterprise pricing with multi-AZ and redundancy.
- per_service costs MUST reflect enterprise-grade configurations.
- cost_notes MUST include: "Includes multi-AZ redundancy, auto-scaling headroom, and enterprise support costs."
- Add "tier": "performance" to root JSON.
- scale_analysis MUST describe enterprise-grade requirements and 99.99% uptime target.
- architecture_overview.strategy MUST emphasize fault tolerance, global distribution, and observability.
- Include reserved instance pricing notes where applicable.

COST EXAMPLES (calibrate from these):
  ECS Fargate 4 tasks Multi-AZ (1vCPU, 2GB): $145/mo
  ElastiCache r6g.large Multi-AZ: $190/mo
  CloudFront 1TB transfer: $85
  WAF with managed rules: $30/mo
  DynamoDB provisioned 200 WCU/RCU reserved: $100/mo
  SQS 50M messages + DLQ: $20
  CloudWatch full observability: $50/mo
  OpenSearch 3-node cluster: $350/mo
  S3 1TB cross-region: $25/mo
  Lambda 50M worker invocations: $100/mo
  Route 53 health checks + DNS: $15/mo`
};

/**
 * Build the Step 3 system prompt.
 * @param {{ tier: string }} params
 * @returns {string}
 */
function buildArchitectureJsonSystemPrompt({ tier }) {
  const archTier = ["cost", "balanced", "performance"].includes(tier) ? tier : "balanced";
  const tierLabel = archTier === "cost" ? "Cost-Efficient" : archTier === "balanced" ? "Balanced" : "High-Performance";

  return `
You output ONLY a single valid JSON object. No markdown. No backticks. No comments. No text outside the JSON.

PRODUCE THIS EXACT SCHEMA — fill every field:
{
  "tier": "${archTier}",
  "tier_label": "${tierLabel}",
  "tier_description": "1-2 sentences explaining what this tier optimizes for and who it is best suited for",
  "scale_analysis": "2-3 sentences: scale tier, key drivers, and why this tier is appropriate",
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
- For RAG-grounded services, explain the architectural decision that caused the service to be selected without claiming unsupported decisions.
${TIER_STEP3[archTier]}
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
  TIER_STEP3,
  buildArchitectureJsonSystemPrompt,
  buildArchitectureJsonUserPrompt
};
