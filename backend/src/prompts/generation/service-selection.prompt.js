/* =========================
   Generation Step 2 — AWS Service Selection
========================= */

const TIER_STEP2 = {
  cost: `

TIER CONSTRAINT: COST-EFFICIENT — MINIMAL & BUDGET-CONSCIOUS
- Goal: Minimize operational and infrastructure costs while satisfying core functional requirements.
- Target Service Count: Approximately 4-6 services.
- Architectural Preference: Serverless, pay-per-invocation, managed services (e.g. AWS Lambda, DynamoDB On-Demand, API Gateway HTTP API, S3 Standard-IA).
- Guidance: Avoid unnecessary infrastructure complexity, dedicated servers, or high baseline fixed-cost services unless explicitly justified by requirements or retrieved references.`,

  balanced: `

TIER CONSTRAINT: BALANCED — STANDARD PRODUCTION ARCHITECTURE
- Goal: Balance cost-efficiency, production readiness, maintainability, and operational simplicity.
- Target Service Count: Approximately 6-8 services.
- Architectural Preference: Serverless and managed container services (e.g. AWS Lambda, Amazon ECS Fargate, DynamoDB, Aurora/RDS, API Gateway, SQS, CloudFront).
- Guidance: Evaluate retrieved architecture patterns and user requirements. Include security (e.g. AWS WAF), caching, CDN, or database options if justified by requirements or retrieved evidence. Avoid gratuitous over-engineering.`,

  performance: `

TIER CONSTRAINT: HIGH-PERFORMANCE — ENTERPRISE GRADE ARCHITECTURE
- Goal: Maximum resilience, high throughput, low latency, advanced security, and comprehensive observability.
- Target Service Count: Approximately 8-12+ services.
- Architectural Preference: Multi-AZ container orchestration (ECS/EKS) or high-throughput serverless, dedicated caching (ElastiCache), edge protection (CloudFront + WAF), distributed queuing (SQS/Kinesis), and full-stack monitoring.
- Guidance: Prioritize fault tolerance, disaster recovery, security, and high-availability patterns derived from user requirements and retrieved reference architectures.`
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
Select ONLY the AWS services this system actually needs based on user requirements, workload constraints, and retrieved architectural evidence. Output feeds directly into a JSON builder.

SERVICE SELECTION PRINCIPLES:
1. Select AWS services based on the user's project requirements and retrieved architectural evidence. Do not include a service merely because it appears in a baseline list.
2. Baseline AWS components (e.g., Amazon Cognito for auth, Amazon API Gateway for API management, AWS Lambda or Amazon ECS for compute, Amazon DynamoDB/Aurora/RDS for persistence) are RECOMMENDED starting points, but are NOT mandatory if a different architecture is better justified by requirements or retrieved reference evidence.

WORKLOAD & ARCHITECTURAL CONSIDERATIONS (GUARDRAILS):
- Compute: Evaluate AWS Lambda, Amazon ECS (Fargate), or Amazon EKS based on workload characteristics, execution duration, and scale requirements. For large-scale or containerized workloads, evaluate ECS/Fargate alongside serverless Lambda.
- Asynchronous & Event Processing: Evaluate Amazon SQS, EventBridge, Kinesis, or SNS for background jobs, decoupled event handling, or stream processing.
- Data Storage & Search: Choose database and search engines (DynamoDB, Aurora, RDS, OpenSearch) based on data complexity, query patterns, and retrieved architecture patterns.
- Edge & Content Distribution: Include Amazon S3 and Amazon CloudFront when user requirements or retrieved references call for static web hosting or CDN edge caching.
- Security & Compliance: Evaluate AWS WAF, Cognito, or IAM scoping whenever security, multi-tenancy, or edge protection is required or supported by retrieved references.

RETRIEVED ARCHITECTURAL EVIDENCE GROUNDING:
1. Retrieved reference architectures represent real-world AWS architectural evidence, not merely background text.
2. For each major user requirement, inspect retrieved reference architectures for applicable patterns, decisions, tradeoffs, and service relationships.
3. When a retrieved pattern is relevant, incorporate its underlying architectural decision unless there is a concrete technical, scale, cost, or requirement conflict.
4. If you reject a pattern recommended by a retrieved reference, explain the technical or cost justification in your Architecture Strategy.
5. Do NOT blindly copy services. Use reference architectures to inform architectural decisions, not to duplicate a service list verbatim.
6. Retrieved references are strong architectural evidence but are not absolute constraints. You may adapt or combine patterns to fit the specific project tier and scale.

OUTPUT FORMAT — plain text:

## Architecture Strategy
<2-4 sentences of rationale specific to THIS project AND this tier, explicitly addressing architectural trade-offs, security, scaling strategy, and why specific retrieved patterns were adopted or adapted>

## Architectural Decisions & Grounding
- [Requirement]: <specific user requirement> -> Grounded Pattern: <pattern name> -> Source Reference: <source reference name [ID] OR LLM-Derived Pattern> -> Architectural Decision: <explicit architectural decision> -> Implementation: <how selected services implement it>

## Selected AWS Services
(repeat the block below for each service, no numbering)

SERVICE: <exact AWS service name>
ROLE: <specific technical role in this system, including architectural pattern details like tenant-scoped partitioning or JWT claims>
JUSTIFICATION: <which feature, scale requirement, or retrieved reference pattern forces inclusion>
DATA_FLOW: <one sentence: what enters and what leaves>
${TIER_STEP2[archTier]}
`;
}

/**
 * Build the Step 2 user prompt.
 * @param {{ analysis: string, idea: string, features?: string[], users: string, budget?: string, ragData?: Object|Array, ragResults?: Object|Array }} params
 * @returns {string}
 */
function buildServiceSelectionUserPrompt({ analysis, idea, features, users, budget, ragData, ragResults }) {
  const ragInput = ragData || ragResults;

  let prompt = `
Classification:
${analysis}

Project:
Idea: ${idea}
Features: ${(features || []).join(", ") || "none specified"}
Users: ${users}
Budget: ${budget || "not specified"}
`;

  if (ragInput) {
    prompt += buildRagContextBlock(ragInput);
  }

  return prompt;
}

/**
 * Build the <aws_reference_architectures> injection block from RAG results & Reference Analysis.
 *
 * @param {Object|Array} ragInput
 * @returns {string}
 */
function buildRagContextBlock(ragInput) {
  const results  = Array.isArray(ragInput) ? ragInput : (ragInput.results || []);
  const analysis = !Array.isArray(ragInput) ? (ragInput.referenceAnalysis || null) : null;

  if (results.length === 0) return "";

  const groundingHeader = analysis
    ? `Grounding Strength: ${analysis.groundingStrength} (Top finalScore: ${analysis.topScore?.toFixed(3)} vs threshold ${analysis.relevanceThreshold})`
    : "Grounding Strength: MODERATE";

  const refsBlock = results.map((result, i) => {
    const arch = result.architecture;

    const services = (arch.services || [])
      .map(s => `  - ${s.name}: ${s.role || ""}`)
      .join("\n");

    return `
--- Reference ${i + 1}: ${arch.name} ---
ID: ${arch.id}
Category: ${arch.category}
Relevance Score: ${result.finalScore.toFixed(3)}

Relevant AWS Services & Roles:
${services}

Characteristics: ${(arch.architecture_characteristics || []).join(", ")}
Tradeoffs: ${(arch.tradeoffs || []).join("; ")}
`;
  }).join("\n");

  const groundedBlock = (analysis?.groundedDecisions || []).length > 0
    ? analysis.groundedDecisions.map(g =>
        `  - Requirement: ${g.requirement}\n    Grounded Decision: ${g.decision}\n    Source Reference: ${g.source_reference_name} [${g.source_reference_id}]`
      ).join("\n\n")
    : "  (None — no retrieved references directly support the specified requirements)";

  const llmDerivedBlock = (analysis?.llmDerivedDecisions || []).length > 0
    ? analysis.llmDerivedDecisions.map(l =>
        `  - Requirement: ${l.requirement}\n    LLM-Derived Decision: ${l.decision}\n    Source Reference: NONE (No retrieved reference supports this pattern)`
      ).join("\n\n")
    : "  (None)";

  return `

<aws_reference_architectures>
${groundingHeader}

Retrieved Architecture Evidence:
${refsBlock}

GROUNDED ARCHITECTURAL DECISIONS (Supported by retrieved references above):
${groundedBlock}

LLM-DERIVED ARCHITECTURAL DECISIONS (Model-derived without retrieved reference evidence):
${llmDerivedBlock}

CRITICAL TRACEABILITY RULES FOR ## Architectural Decisions & Grounding:
1. ONLY label a decision as "Grounded Pattern: <Pattern>" if it is listed above under GROUNDED ARCHITECTURAL DECISIONS with a valid Source Reference ID.
2. If a decision is listed under LLM-DERIVED ARCHITECTURAL DECISIONS (or unsupported by retrieved references), label it as "LLM-Derived Pattern: <Pattern>" and DO NOT claim that a reference architecture grounded it.
3. Do not make false attributions or invent non-existent connections to retrieved references.
</aws_reference_architectures>
`;
}

module.exports = {
  TIER_STEP2,
  buildServiceSelectionSystemPrompt,
  buildServiceSelectionUserPrompt
};
