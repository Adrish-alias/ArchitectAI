/**
 * src/services/validator.service.js
 *
 * Architecture Consistency Validator (Semantic Loop & Strict Separation)
 *
 * Separates findings into:
 * 1. STRUCTURAL / DETERMINISTIC: Programmatically corrected if unambiguous (e.g. whitespace, syntax formatting).
 * 2. ARCHITECTURAL / SEMANTIC: Identified and reported back to the generation LLM for correction without auto-patching fake edges.
 */

/**
 * Validate generated architecture JSON and Mermaid diagram.
 *
 * @param {Object} parsed - Step 3/4 architecture JSON object containing aws_services and mermaid
 * @returns {Object} Validation report containing structural and semantic findings.
 */
function validateArchitectureConsistency(parsed) {
  const structuralFindings = [];
  const semanticFindings   = [];
  let structuralCorrected  = false;

  if (!parsed || !Array.isArray(parsed.aws_services)) {
    return {
      valid: false,
      hasStructuralIssues: true,
      hasSemanticIssues: true,
      structuralFindings: ["Invalid or missing aws_services payload"],
      semanticFindings: ["Invalid or missing aws_services payload"],
      findings: ["Invalid or missing aws_services payload"],
      status: "NEEDS_REVIEW"
    };
  }

  const serviceNames = parsed.aws_services.map(s => s.name);
  let diagram = parsed.mermaid || "";

  // ── 1. STRUCTURAL / DETERMINISTIC CHECKS ────────────────────────────────
  // Check for raw markdown blocks or un-sanitized newlines
  if (diagram.includes("```") || diagram.includes("\r\n")) {
    structuralFindings.push("Mermaid string contained raw markdown fences or un-normalized CRLF line breaks.");
    diagram = diagram.replace(/```mermaid/gi, "").replace(/```/g, "").replace(/\r\n/g, "\n").trim();
    parsed.mermaid = diagram;
    structuralCorrected = true;
  }

  if (diagram && !diagram.startsWith("graph")) {
    structuralFindings.push("Mermaid string missing leading 'graph' directive.");
  }

  // ── 2. ARCHITECTURAL / SEMANTIC CHECKS (NO AUTO-PATCHING) ───────────────

  // A. Service Representation Check: Every selected AWS service must appear in Mermaid
  serviceNames.forEach(name => {
    const searchPatterns = [
      name,
      name.replace(/^Amazon\s+|^AWS\s+/i, ""),
      name.split(" ")[0]
    ];

    const isPresent = searchPatterns.some(p => diagram.toLowerCase().includes(p.toLowerCase()));

    if (!isPresent) {
      semanticFindings.push(`Service '${name}' is listed in selected AWS services but is missing from the Mermaid architecture diagram.`);
    }
  });

  // B. Messaging Producer/Consumer Balance Check
  const hasSQS         = serviceNames.some(n => /\bsqs\b/i.test(n));
  const hasKinesis     = serviceNames.some(n => /kinesis/i.test(n));
  const hasEventBridge = serviceNames.some(n => /eventbridge/i.test(n));

  if (hasSQS) {
    const hasSQSProducer = /-->.*(?:SQS|SQSQueue)/i.test(diagram) || /-->.*enqueue/i.test(diagram);
    const hasSQSConsumer = /(?:SQS|SQSQueue).*-->/i.test(diagram) || /trigger.*LambdaWorker/i.test(diagram);

    if (!hasSQSProducer) {
      semanticFindings.push("Amazon SQS is included in selected services, but the Mermaid diagram is missing an incoming producer connection (e.g. API/Compute --> SQS).");
    }
    if (!hasSQSConsumer) {
      semanticFindings.push("Amazon SQS is included in selected services, but the Mermaid diagram is missing an outgoing consumer connection (e.g. SQS --> Lambda Worker).");
    }
  }

  if (hasKinesis) {
    const hasKinesisProducer = /-->.*Kinesis/i.test(diagram);
    const hasKinesisConsumer = /Kinesis.*-->/i.test(diagram);

    if (!hasKinesisProducer) {
      semanticFindings.push("Amazon Kinesis Data Streams is included in selected services, but the Mermaid diagram is missing an incoming stream producer connection.");
    }
    if (!hasKinesisConsumer) {
      semanticFindings.push("Amazon Kinesis Data Streams is included in selected services, but the Mermaid diagram is missing a downstream consumer connection (e.g. Kinesis --> Lambda/S3).");
    }
  }

  // C. CDN / WAF / API Path Ingress Check
  const hasCloudFront = serviceNames.some(n => /cloudfront/i.test(n));
  const hasWAF        = serviceNames.some(n => /\bwaf\b/i.test(n));
  const hasAPIGateway = serviceNames.some(n => /api gateway/i.test(n));
  const hasS3         = serviceNames.some(n => /\bs3\b/i.test(n));

  if (hasCloudFront && hasWAF && hasAPIGateway) {
    if (diagram.includes("APIGateway -->|\"response\"| CloudFront")) {
      semanticFindings.push("Mermaid diagram contains a contradictory routing edge where API Gateway routes back to CloudFront before WAF.");
    }
  }

  if (hasCloudFront && hasS3 && !diagram.includes("CloudFront -->") && !diagram.includes("S3")) {
    semanticFindings.push("CloudFront is selected alongside S3, but the Mermaid diagram is missing a static asset origin connection (CloudFront --> S3).");
  }

  // D. Service Justification Quality Audit
  parsed.aws_services.forEach(s => {
    const j = s.justification || "";
    if (/chosen because.*is scalable/i.test(j) || /required for the application/i.test(j)) {
      semanticFindings.push(`Justification for '${s.name}' uses generic filler phrasing instead of requirement-specific reasoning.`);
    }
    if (/dynamodb provides isolated tenant data/i.test(j)) {
      semanticFindings.push(`Justification for '${s.name}' overstates technical guarantees by claiming DynamoDB itself provides isolation.`);
    }
    if (/cognito provides tenant isolation/i.test(j)) {
      semanticFindings.push(`Justification for '${s.name}' overstates technical guarantees by claiming Cognito alone provides tenant isolation.`);
    }
  });

  const valid = semanticFindings.length === 0;
  const allFindings = [...structuralFindings, ...semanticFindings];

  return {
    valid,
    hasStructuralIssues: structuralFindings.length > 0,
    hasSemanticIssues: semanticFindings.length > 0,
    structuralFindings,
    semanticFindings,
    findings: allFindings,
    structuralCorrected
  };
}

module.exports = { validateArchitectureConsistency };
