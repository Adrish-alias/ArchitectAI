/**
 * Build the Step 2 system prompt.
 * @returns {string}
 */
function buildServiceSelectionSystemPrompt() {
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

DYNAMIC ARCHITECTURAL STRATEGY:
- If Budget is constrained or Scale is low: Minimize operational costs. Prefer Serverless/pay-per-invocation (e.g. Lambda, DynamoDB On-Demand). Avoid high baseline fixed-cost services. Keep service count lean (4-6 services).
- If Scale is moderate: Balance cost-efficiency and maintainability. Consider managed containers or robust serverless. Use CDNs or WAF if justified. Target 6-8 services.
- If Scale is high or enterprise-grade features are requested: Prioritize resilience, low latency, and security. Consider Multi-AZ containers (ECS), dedicated caching (ElastiCache), decoupled messaging (SQS/Kinesis), and edge protection (WAF+CloudFront). Target 8-12+ services.

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

## Architecture Topology
(REQUIRED handoff section to next pipeline stage: list the service-to-service edges adopted for this architecture)
- [Source Node] -> [Target Node]: <Reasoning for edge inclusion or adaptation>
(Rules for Architecture Topology:
 - List the important service-to-service relationships used by the proposed architecture.
 - When a HIGH CONFIDENCE RAG reference is present, preserve its relevant topology unless it conflicts with an explicit user requirement.
 - When the RAG reference is LOW CONFIDENCE, use its topology only as inspiration.
 - Do not claim that a topology was retrieved if it was not present in the retrieved reference.
 - The topology must correspond to the actual services selected in ## Selected AWS Services.
 - Do not add unnecessary services merely to reproduce a reference topology.
 - This section is REQUIRED even when the architecture is primarily LLM-derived.)

## Selected AWS Services
(repeat the block below for each service, no numbering)

SERVICE: <exact AWS service name>
ROLE: <specific technical role in this system, including architectural pattern details like tenant-scoped partitioning or JWT claims>
JUSTIFICATION: <which feature, scale requirement, or retrieved reference pattern forces inclusion>
DATA_FLOW: <one sentence: what enters and what leaves>
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
    const isHighConfidence = (result.finalScore >= 0.82);
    const confidenceLabel  = isHighConfidence
      ? "[STRICT ENFORCEMENT - HIGH CONFIDENCE MATCH]"
      : "[LOOSE REFERENCE - ADAPT AS NEEDED]";

    const services = (arch.services || [])
      .map(s => `  - ${s.name}: ${s.role || ""}`)
      .join("\n");

    const connections = (arch.connections || [])
      .map(c => `  - ${c.from || c.source} -> ${c.to || c.target}: ${c.relationship || c.rel || "connected"}`)
      .join("\n");

    const connectionsBlock = connections.length > 0
      ? connections
      : "  - (None specified)";

    return `
--- Reference ${i + 1}: ${arch.name} ---
ID: ${arch.id}
Category: ${arch.category}
Relevance Score: ${result.finalScore.toFixed(3)}
Confidence Label: ${confidenceLabel}

Retrieved Architecture Topology Connections:
${connectionsBlock}

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

CRITICAL TOPOLOGY & GROUNDING RULES:
1. For HIGH CONFIDENCE MATCH references (finalScore >= 0.82):
   - Treat the retrieved topology as the default architectural skeleton.
   - Preserve the retrieved service-to-service relationships unless doing so would directly conflict with an explicit user requirement or would introduce an unnecessary/inapplicable component.
   - Do NOT blindly copy irrelevant components.
   - Do NOT invent additional retrieved connections.
   - If adapting the topology is necessary, explain the adaptation.
2. For LOW CONFIDENCE references (finalScore < 0.82):
   - Treat the topology only as architectural inspiration.
   - Adapt it freely to the user's requirements.
   - Do not force the reference topology into the final architecture.
3. ONLY label a decision as "Grounded Pattern: <Pattern>" if it is listed above under GROUNDED ARCHITECTURAL DECISIONS with a valid Source Reference ID.
4. If a decision is listed under LLM-DERIVED ARCHITECTURAL DECISIONS (or unsupported by retrieved references), label it as "LLM-Derived Pattern: <Pattern>" and DO NOT claim that a reference architecture grounded it.
5. Do not make false attributions or invent non-existent connections to retrieved references.
</aws_reference_architectures>
`;
}

module.exports = {
  buildServiceSelectionSystemPrompt,
  buildServiceSelectionUserPrompt
};
