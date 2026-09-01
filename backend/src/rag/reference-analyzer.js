/**
 * src/rag/reference-analyzer.js
 *
 * Phase 11 — Reference Analysis Stage
 *
 * Evaluates retrieved AWS reference architectures against the Architecture Requirement Profile.
 * Establishes explicit Requirement → Reference → Design Decision traceability.
 * Determines Grounding Strength (STRONG vs MODERATE vs WEAK) based on relevance thresholds.
 */

const { RAG_RELEVANCE_THRESHOLD } = require("../config/env");

/**
 * Perform Reference Analysis on retrieved architectures.
 *
 * @param {Object} params
 * @param {Object}   params.profile              Architecture Requirement Profile
 * @param {Array}    params.ragResults           Results from retrieveArchitectures()
 * @param {number}   [params.relevanceThreshold] Relevance threshold cutoff (default 0.45)
 * @returns {Object}  Reference Analysis object containing decisions and grounding strength
 */
function analyzeReferences({ profile, ragResults, relevanceThreshold = RAG_RELEVANCE_THRESHOLD }) {
  if (!ragResults || ragResults.length === 0) return null;

  const topScore = ragResults[0]?.finalScore || 0;
  const isHighRelevance = topScore >= relevanceThreshold;

  const analyses = ragResults.map((res, index) => {
    const arch  = res.architecture;
    const score = res.finalScore;

    let relevanceLevel = "low";
    if (score >= 0.55 || (index === 0 && score >= relevanceThreshold)) {
      relevanceLevel = "high";
    } else if (score >= relevanceThreshold) {
      relevanceLevel = "moderate";
    }

    const matchedRequirements = [];
    const designDecisions     = [];
    const relevantServices    = (arch.services || []).map(s => s.name);

    // Extract text corpus for pattern detection
    const refCorpus = [
      arch.name,
      arch.category,
      arch.description,
      arch.retrieval_text,
      ...(arch.requirements_signals || []),
      ...(arch.architecture_characteristics || []),
      ...(arch.keywords || []),
      ...(arch.strengths || [])
    ].join(" ").toLowerCase();

    const profileReqs = [
      ...(profile.architecture_requirements || []),
      ...(profile.capabilities || []),
      ...(profile.integration_patterns || [])
    ];

    // ── 1. Multi-Tenancy & Data Isolation ─────────────────────────────────
    if (
      (profile.tenancy_model === "multi_tenant" || profileReqs.some(r => r.includes("tenant") || r.includes("saas") || r.includes("isolate"))) &&
      (refCorpus.includes("tenant") || refCorpus.includes("saas") || refCorpus.includes("silo") || refCorpus.includes("isolation"))
    ) {
      matchedRequirements.push("Multi-tenant customer data isolation");

      if (refCorpus.includes("silo") || refCorpus.includes("vpc per tenant") || refCorpus.includes("full stack")) {
        designDecisions.push("Dedicated Infrastructure (Silo Isolation): Route tenant requests via custom subdomains to dedicated tenant environments/VPCs with centralized management plane");
      } else if (refCorpus.includes("eks") || refCorpus.includes("namespace")) {
        designDecisions.push("Namespace Container Isolation: Partition tenant compute using dedicated Kubernetes/EKS namespaces and network policies");
      } else {
        designDecisions.push("Logical Pooled Tenant Isolation: Enforce dynamic tenant isolation via Amazon Cognito JWT claims (`tenant_id`), scoped IAM policies, and DynamoDB/Aurora partition key scoping (`tenant_id#user_id`)");
      }
    }

    // ── 2. Real-Time & Live Tracking ─────────────────────────────────────
    if (
      (profile.realtime_needs === "high" || profileReqs.some(r => r.includes("real_time") || r.includes("live") || r.includes("tracking"))) &&
      (refCorpus.includes("websocket") || refCorpus.includes("realtime") || refCorpus.includes("kinesis") || refCorpus.includes("sns"))
    ) {
      matchedRequirements.push("Real-time live location tracking and streaming updates");
      designDecisions.push("Real-Time Streaming Infrastructure: Use API Gateway WebSocket API with ElastiCache Redis pub/sub or Lambda handlers for bidirectional live updates");
    }

    // ── 3. Asynchronous & Background Processing ──────────────────────────
    if (
      profileReqs.some(r => r.includes("async") || r.includes("background") || r.includes("upload") || r.includes("queue") || r.includes("order")) &&
      (refCorpus.includes("sqs") || refCorpus.includes("firehose") || refCorpus.includes("eventbridge") || refCorpus.includes("asynchronous"))
    ) {
      matchedRequirements.push("Asynchronous decoupled job processing");
      designDecisions.push("Decoupled Message Queuing: Use Amazon SQS buffers with worker Lambda functions for non-blocking task execution");
    }

    // ── 4. Content Delivery & Edge Security ──────────────────────────────
    if (
      (refCorpus.includes("cloudfront") || refCorpus.includes("waf")) &&
      (profileReqs.some(r => r.includes("dashboard") || r.includes("web") || r.includes("static") || r.includes("security")))
    ) {
      matchedRequirements.push("Secure edge distribution for web application & API");
      designDecisions.push("CDN Edge Security: Distribute static frontend via S3 + CloudFront CDN with AWS WAF protection");
    }

    // Fallback if no specific rule matched but relevance is high
    if (designDecisions.length === 0 && relevanceLevel === "high") {
      matchedRequirements.push(`${arch.category} baseline architecture`);
      designDecisions.push(`Adopt standard ${arch.name} architectural structure for ${profile.application_type || "application"}`);
    }

    return {
      referenceName:             arch.name,
      referenceId:               arch.id,
      category:                  arch.category,
      score:                     score,
      relevanceLevel,
      matchedRequirements,
      architecturalPatterns:     arch.architecture_characteristics || [],
      relevantServices,
      designDecisionsToConsider: designDecisions
    };
  });

  return {
    isHighRelevance,
    relevanceThreshold,
    topScore,
    groundingStrength: isHighRelevance ? "STRONG" : "MODERATE",
    referenceAnalyses: analyses
  };
}

module.exports = { analyzeReferences };
