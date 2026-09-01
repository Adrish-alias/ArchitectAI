/* =========================
   Generation Step 2 — AWS Service Selection
========================= */

const TIER_STEP2 = {
  cost: `

TIER: COST-EFFICIENT — MINIMAL SERVERLESS ARCHITECTURE

HARD RULES FOR COST TIER:
1. MAXIMUM of 4-5 AWS services total. Strip everything non-essential.
2. ALWAYS use:
   - AWS Lambda (NEVER ECS/Fargate) — pay-per-invocation is cheapest
   - DynamoDB On-Demand mode — no provisioned capacity
   - API Gateway HTTP API (NOT REST) — 71% cheaper than REST API
3. NEVER include these services in cost tier:
   - ElastiCache (use DynamoDB DAX only if caching is critical)
   - OpenSearch (use DynamoDB query/scan instead)
   - CloudFront (skip CDN unless static site hosting)
   - SQS (process synchronously in Lambda instead)
   - ECS/Fargate (too expensive for low-traffic)
   - WAF, CloudWatch custom metrics, Redshift, Athena
4. For file storage: Use S3 Standard-IA or S3 One Zone-IA
5. For search: Use DynamoDB Global Secondary Indexes instead of OpenSearch
6. Authentication: Use Cognito User Pools with free tier (50k MAU free)
7. Monitoring: Use CloudWatch basic (free tier) only

ARCHITECTURE PATTERN: Simple serverless monolith — single Lambda handling all routes.`,

  balanced: `

TIER: BALANCED — STANDARD PRODUCTION ARCHITECTURE

RULES FOR BALANCED TIER:
1. Target 6-8 AWS services — enough for production readiness.
2. COMPUTE: Use Lambda for API + separate Lambda for background workers.
   Switch to ECS Fargate ONLY if scale >= large_scale.
3. INCLUDE if features warrant:
   - SQS for async processing (background jobs, webhooks)
   - S3 + CloudFront for static assets and file storage
   - ElastiCache ONLY if realtime_needs = high
4. DO NOT include:
   - WAF (save for performance tier)
   - Redshift (use Athena if analytics needed)
   - Multi-AZ for DynamoDB (it's already global)
5. DynamoDB: Use provisioned capacity with auto-scaling for predictable cost
6. Monitoring: CloudWatch with basic alarms
7. Include proper CI/CD considerations in implementation steps

ARCHITECTURE PATTERN: Event-driven microservices with async processing.`,

  performance: `

TIER: HIGH-PERFORMANCE — ENTERPRISE GRADE ARCHITECTURE

HARD RULES FOR PERFORMANCE TIER:
1. Target 10-14 AWS services — full enterprise stack.
2. COMPUTE: Use ECS Fargate with auto-scaling (NEVER Lambda for primary API).
   Keep Lambda only for event-driven workers and webhooks.
3. ALWAYS include ALL of these:
   - Amazon ECS Fargate — primary API compute with multi-AZ
   - Amazon ElastiCache Redis — caching layer, multi-AZ replication
   - Amazon CloudFront — global CDN for all responses
   - AWS WAF — web application firewall on CloudFront
   - Amazon SQS — async processing with dead-letter queues
   - AWS Lambda — background workers and event handlers
   - Amazon CloudWatch — full observability with custom metrics and dashboards
   - Amazon S3 — asset storage with cross-region replication
4. ADDITIONALLY include if features match:
   - Amazon OpenSearch — full-text search cluster (3 nodes minimum)
   - Amazon API Gateway WebSocket + ElastiCache pub/sub
   - Amazon Redshift — analytics data warehouse
   - AWS Secrets Manager — credential management
   - Amazon Route 53 — DNS with health checks and failover
5. DynamoDB: Use provisioned capacity with reserved capacity for cost savings
6. All services must be Multi-AZ or globally replicated
7. Include disaster recovery and failover in architecture strategy

ARCHITECTURE PATTERN: Distributed microservices with multi-AZ redundancy, CDN edge caching, and full observability.`
};

/**
 * Build the Step 2 system prompt.
 * @param {{ tier: string }} params
 * @returns {string}
 */
function buildServiceSelectionSystemPrompt({ tier }) {
  const archTier = ["cost", "balanced", "performance"].includes(tier) ? tier : "balanced";
  return `
You are a Principal AWS Solutions Architect.
Select ONLY the AWS services this project actually needs. Output feeds directly into a JSON builder.

MANDATORY BASELINE (always included):
  - Amazon Cognito                 [authentication]
  - Amazon API Gateway             [HTTP API layer]
  - AWS Lambda OR Amazon ECS       [compute — see tier rules]
  - Amazon DynamoDB                [primary database]

CONDITIONAL — add ONLY when the classification AND tier rules say so:

IF REALTIME_NEEDS = high:
  + Amazon API Gateway (WebSocket)
  + AWS Lambda (WebSocket Handler)
  + Amazon ElastiCache (Redis)

IF COMPUTE_INTENSITY = high OR features include background jobs:
  + Amazon SQS
  + AWS Lambda (Background Worker)

IF DATA_COMPLEXITY = high OR features include "search":
  + Amazon OpenSearch Service

IF features include "files", "images", "video", "uploads", "documents", "storage":
  + Amazon S3
  + Amazon CloudFront

IF scale = large_scale OR scale = distributed:
  REPLACE AWS Lambda (API Handler) with Amazon ECS (Fargate)

IF features include payments:
  + AWS Lambda (Payment Webhook Handler)

OUTPUT FORMAT — plain text:

## Architecture Strategy
<2-4 sentences of rationale specific to THIS project AND this tier>

## Selected AWS Services
(repeat the block below for each service, no numbering)

SERVICE: <exact AWS service name>
ROLE: <specific technical role in this system>
JUSTIFICATION: <which feature or scale requirement forces inclusion>
DATA_FLOW: <one sentence: what enters and what leaves>
${TIER_STEP2[archTier]}
`;
}

/**
 * Build the Step 2 user prompt.
 * @param {{ analysis: string, idea: string, features?: string[], users: string, budget?: string }} params
 * @returns {string}
 */
function buildServiceSelectionUserPrompt({ analysis, idea, features, users, budget }) {
  return `
Classification:
${analysis}

Project:
Idea: ${idea}
Features: ${(features || []).join(", ") || "none specified"}
Users: ${users}
Budget: ${budget || "not specified"}
`;
}

module.exports = {
  TIER_STEP2,
  buildServiceSelectionSystemPrompt,
  buildServiceSelectionUserPrompt
};
