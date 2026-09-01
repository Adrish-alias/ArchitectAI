/**
 * src/rag/reference-analyzer.js
 *
 * Phase 11 — Reference Analysis Stage with Strict Grounding Traceability
 *
 * Evaluates retrieved AWS reference architectures against the Architecture Requirement Profile.
 * Distinguishes strictly between:
 *   - RETRIEVED_GROUNDED: Directly supported by evidence in a retrieved architecture record.
 *   - LLM_DERIVED: Derived by LLM from user requirements without direct retrieved reference support.
 */

const { RAG_RELEVANCE_THRESHOLD } = require("../config/env");

/**
 * Perform Reference Analysis on retrieved architectures with strict evidence matching.
 *
 * @param {Object} params
 * @param {Object}   params.profile              Architecture Requirement Profile
 * @param {Array}    params.ragResults           Results from retrieveArchitectures()
 * @param {number}   [params.relevanceThreshold] Relevance threshold cutoff (default 0.45)
 * @returns {Object}  Reference Analysis object containing grounded vs LLM-derived decisions
 */
function analyzeReferences({ profile, ragResults, relevanceThreshold = RAG_RELEVANCE_THRESHOLD }) {
  if (!ragResults || ragResults.length === 0) return null;

  const topScore = ragResults[0]?.finalScore || 0;
  const isHighRelevance = topScore >= relevanceThreshold;

  const groundedDecisions  = [];
  const llmDerivedDecisions = [];

  // Index retrieved records for evidence lookup
  const retrievedCorpora = ragResults.map(res => {
    const arch = res.architecture;
    const corpus = [
      arch.name,
      arch.category,
      arch.description,
      arch.retrieval_text,
      ...(arch.requirements_signals || []),
      ...(arch.architecture_characteristics || []),
      ...(arch.keywords || []),
      ...(arch.strengths || []),
      ...(arch.services || []).map(s => `${s.name} ${s.role}`)
    ].join(" ").toLowerCase();

    return {
      id: arch.id,
      name: arch.name,
      category: arch.category,
      score: res.finalScore,
      corpus,
      arch
    };
  });

  const profileReqs = [
    ...(profile.architecture_requirements || []),
    ...(profile.capabilities || []),
    ...(profile.integration_patterns || [])
  ];

  // Helper: Find first retrieved architecture containing ALL key terms
  const findEvidence = (terms) => {
    for (const item of retrievedCorpora) {
      if (terms.every(t => item.corpus.includes(t.toLowerCase()))) {
        return item;
      }
    }
    return null;
  };

  // Helper: Find first retrieved architecture containing ANY key term
  const findAnyEvidence = (terms) => {
    for (const item of retrievedCorpora) {
      if (terms.some(t => item.corpus.includes(t.toLowerCase()))) {
        return item;
      }
    }
    return null;
  };

  // ── 1. Event Sourcing / Immutable Event Recording ────────────────────────
  if (profileReqs.some(r => r.includes("event") || r.includes("immutable") || r.includes("audit") || r.includes("history"))) {
    const reqText = "Immutable event recording & auditable transaction history";
    // Check if "event sourcing" or "kinesis data streams" is in ANY retrieved record
    const evSourcingRef = findEvidence(["event sourcing"]) || findEvidence(["kinesis data streams"]);

    if (evSourcingRef) {
      groundedDecisions.push({
        decision: "Record all account operations as immutable, append-only events using Kinesis Data Streams / Event Store",
        requirement: reqText,
        pattern: "Event Sourcing Pattern",
        source_reference_id: evSourcingRef.id,
        source_reference_name: evSourcingRef.name,
        evidence: `Directly supported by ${evSourcingRef.name} (${evSourcingRef.id})`,
        type: "RETRIEVED_GROUNDED"
      });
    } else {
      llmDerivedDecisions.push({
        decision: "Store transaction records as immutable audit entries in DynamoDB",
        requirement: reqText,
        pattern: "Event Log Table",
        source_reference_id: null,
        source_reference_name: null,
        evidence: "LLM-derived from user requirement (no retrieved reference contains Event Sourcing Pattern)",
        type: "LLM_DERIVED"
      });
    }
  }

  // ── 2. Asynchronous Processing / Decoupled Message Queuing ────────────────
  if (profileReqs.some(r => r.includes("async") || r.includes("background") || r.includes("queue") || r.includes("message"))) {
    const reqText = "Asynchronous downstream transaction processing";
    const asyncRef = findAnyEvidence(["sqs", "kinesis", "eventbridge", "message queue", "pub-sub"]);

    if (asyncRef) {
      groundedDecisions.push({
        decision: "Buffer transaction messages in Amazon SQS and process asynchronously via dedicated AWS Lambda background workers",
        requirement: reqText,
        pattern: "Decoupled Message Queuing",
        source_reference_id: asyncRef.id,
        source_reference_name: asyncRef.name,
        evidence: `Supported by ${asyncRef.name} (${asyncRef.id})`,
        type: "RETRIEVED_GROUNDED"
      });
    } else {
      llmDerivedDecisions.push({
        decision: "Offload downstream task processing asynchronously",
        requirement: reqText,
        pattern: "Asynchronous Worker Queue",
        source_reference_id: null,
        source_reference_name: null,
        evidence: "LLM-derived from user requirements",
        type: "LLM_DERIVED"
      });
    }
  }

  // ── 3. Multi-Tenant Customer Data Isolation ─────────────────────────────
  if (profile.tenancy_model === "multi_tenant" || profileReqs.some(r => r.includes("tenant") || r.includes("saas") || r.includes("isolate"))) {
    const reqText = "Multi-tenant customer data isolation";
    const tenantRef = findAnyEvidence(["multi-tenant", "tenant isolation", "silo", "tenant namespaces"]);

    if (tenantRef) {
      const isSilo = tenantRef.corpus.includes("silo") || tenantRef.corpus.includes("vpc per tenant");
      const isEks  = tenantRef.corpus.includes("eks") || tenantRef.corpus.includes("namespace");

      const decisionText = isSilo
        ? "Route tenant requests via custom subdomains to dedicated tenant VPC stacks governed by a central management plane"
        : isEks
        ? "Partition tenant compute using dedicated Kubernetes namespaces and network policies"
        : "Enforce dynamic tenant isolation via Amazon Cognito JWT claims (`tenant_id`) and DynamoDB partition key scoping (`tenant_id#user_id`)";

      groundedDecisions.push({
        decision: decisionText,
        requirement: reqText,
        pattern: isSilo ? "Silo Isolation SaaS" : isEks ? "EKS Namespace Isolation" : "Pooled Tenant Isolation",
        source_reference_id: tenantRef.id,
        source_reference_name: tenantRef.name,
        evidence: `Supported by ${tenantRef.name} (${tenantRef.id})`,
        type: "RETRIEVED_GROUNDED"
      });
    } else {
      llmDerivedDecisions.push({
        decision: "Scope database access using tenant identifiers",
        requirement: reqText,
        pattern: "Tenant Scoped Data Access",
        source_reference_id: null,
        source_reference_name: null,
        evidence: "LLM-derived from user requirement",
        type: "LLM_DERIVED"
      });
    }
  }

  // ── 4. Distributed Transaction Orchestration (Saga Pattern) ─────────────
  if (profileReqs.some(r => r.includes("transaction") || r.includes("distributed") || r.includes("saga"))) {
    const sagaRef = findEvidence(["saga"]) || findEvidence(["step functions"]);
    if (sagaRef) {
      groundedDecisions.push({
        decision: "Orchestrate distributed multi-service transactions using AWS Step Functions Saga coordinator",
        requirement: "Distributed transaction consistency",
        pattern: "Saga Execution Coordinator Pattern",
        source_reference_id: sagaRef.id,
        source_reference_name: sagaRef.name,
        evidence: `Supported by ${sagaRef.name} (${sagaRef.id})`,
        type: "RETRIEVED_GROUNDED"
      });
    }
  }

  // ── 5. Edge Content Delivery & Security ─────────────────────────────────
  if (profileReqs.some(r => r.includes("dashboard") || r.includes("web") || r.includes("static") || r.includes("security"))) {
    const edgeRef = findAnyEvidence(["cloudfront", "waf"]);
    if (edgeRef) {
      groundedDecisions.push({
        decision: "Serve web assets via Amazon S3 and CloudFront CDN with AWS WAF protection",
        requirement: "Secure edge distribution for web application",
        pattern: "CDN Edge Security",
        source_reference_id: edgeRef.id,
        source_reference_name: edgeRef.name,
        evidence: `Supported by ${edgeRef.name} (${edgeRef.id})`,
        type: "RETRIEVED_GROUNDED"
      });
    }
  }

  return {
    isHighRelevance,
    relevanceThreshold,
    topScore,
    groundingStrength: isHighRelevance ? "STRONG" : "MODERATE",
    groundedDecisions,
    llmDerivedDecisions,
    referenceAnalyses: retrievedCorpora.map(c => ({
      referenceName: c.name,
      referenceId: c.id,
      category: c.category,
      score: c.score
    }))
  };
}

module.exports = { analyzeReferences };
