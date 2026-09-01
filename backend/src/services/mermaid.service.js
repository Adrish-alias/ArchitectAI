/* =========================
   Mermaid Sanitizer
========================= */
function sanitizeMermaid(raw) {
  if (!raw) return "";
  return raw
    .replace(/```mermaid/gi, "")
    .replace(/```/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\u00A0/g, " ")         // strip non-breaking spaces
    .replace(/\n{3,}/g, "\n\n")      // condense blank lines
    .replace(/-->[^\S\n]*\|([^|]+)\|/g, "-->|$1|")  // normalise edge labels
    .trim();
}

/* =========================
   Build Generation Mermaid
   Programmatically constructs Mermaid for POST /generate.
   Preserves the exact node detection and subgraph layout
   from the original server.js implementation.
========================= */
function buildArchitectureMermaid(parsed) {
  const serviceNames = parsed.aws_services.map(s => s.name);
  const hasWebSocket  = serviceNames.some(n => /websocket/i.test(n));
  const hasElastiCache = serviceNames.some(n => /elasticache/i.test(n));
  const hasSQS        = serviceNames.some(n => /\bsqs\b/i.test(n));
  const hasS3         = serviceNames.some(n => /\bS3\b/i.test(n));
  const hasOpenSearch = serviceNames.some(n => /opensearch/i.test(n));
  const hasCloudFront = serviceNames.some(n => /cloudfront/i.test(n));
  const hasWorker     = serviceNames.some(n => /worker/i.test(n));
  const hasECS        = serviceNames.some(n => /\becs\b/i.test(n));
  const hasWAF        = serviceNames.some(n => /\bwaf\b/i.test(n));
  const hasCloudWatch = serviceNames.some(n => /cloudwatch/i.test(n));
  const hasRoute53    = serviceNames.some(n => /route.?53/i.test(n));
  const computeNode   = hasECS ? "ECS" : "LambdaAPI";
  const computeLabel  = hasECS ? "Amazon ECS Fargate" : "Lambda API Handler";

  const apiSubgraphLines = [
    `  APIGateway["API Gateway"]`,
    hasWebSocket ? `  WebSocketGW["API Gateway WebSocket"]` : ""
  ].filter(Boolean).join("\n");

  const computeSubgraphLines = [
    `  ${computeNode}["${computeLabel}"]`,
    hasWebSocket ? `  LambdaWS["Lambda WebSocket Handler"]` : "",
    hasWorker    ? `  LambdaWorker["Lambda Background Worker"]` : ""
  ].filter(Boolean).join("\n");

  const messagingSubgraphLines = hasSQS
    ? `  SQS["Amazon SQS"]`
    : "  %% no async messaging";

  const dataSubgraphLines = [
    `  DynamoDB["Amazon DynamoDB"]`,
    hasElastiCache ? `  ElastiCache["ElastiCache Redis"]` : "",
    hasOpenSearch  ? `  OpenSearch["Amazon OpenSearch"]` : ""
  ].filter(Boolean).join("\n");

  const storageSubgraphLines = (hasS3 || hasCloudFront)
    ? [
        hasS3         ? `  S3["Amazon S3"]` : "",
        hasCloudFront ? `  CloudFront["Amazon CloudFront"]` : ""
      ].filter(Boolean).join("\n")
    : "  %% no storage";

  // Security subgraph (performance tier)
  const securityLines = hasWAF
    ? [ hasWAF ? `  WAF["AWS WAF"]` : "" ].filter(Boolean).join("\n")
    : null;

  // Monitoring subgraph (performance tier)
  const monitoringLines = (hasCloudWatch || hasRoute53)
    ? [
        hasCloudWatch ? `  CloudWatch["Amazon CloudWatch"]` : "",
        hasRoute53    ? `  Route53["Amazon Route 53"]` : ""
      ].filter(Boolean).join("\n")
    : null;

  const coreEdges = [
    hasRoute53 ? `User --> Route53` : null,
    hasRoute53 ? `Route53 --> Cognito` : `User --> Cognito`,
    `Cognito -->|"JWT"| APIGateway`,
    hasWAF && hasCloudFront ? `APIGateway -->|"response"| CloudFront` : null,
    hasWAF && hasCloudFront ? `CloudFront -->|"filtered"| WAF` : null,
    hasWAF && !hasCloudFront ? `APIGateway -->|"filtered"| WAF` : null,
    `APIGateway -->|"request"| ${computeNode}`,
    `${computeNode} -->|"read/write"| DynamoDB`
  ].filter(Boolean).join("\n");

  const wsEdges = hasWebSocket ? [
    `User -->|"WS upgrade"| WebSocketGW`,
    `WebSocketGW --> LambdaWS`,
    `LambdaWS -->|"pub/sub"| ElastiCache`,
    `ElastiCache -->|"fan-out"| LambdaWS`
  ].join("\n") : "";

  const cacheRestEdge = hasElastiCache ? `${computeNode} -->|"cache"| ElastiCache` : "";

  const sqsEdges = hasSQS ? [
    `${computeNode} -->|"enqueue"| SQS`,
    `SQS -->|"trigger"| LambdaWorker`
  ].join("\n") : "";

  const s3Edge    = hasS3         ? `${computeNode} -->|"upload/fetch"| S3` : "";
  const cdnEdge   = (hasCloudFront && hasS3 && !hasWAF) ? `CloudFront -->|"origin"| S3` : "";
  const searchEdges = hasOpenSearch ? [
    hasWorker ? `LambdaWorker -->|"index"| OpenSearch` : "",
    `${computeNode} -->|"search"| OpenSearch`
  ].filter(Boolean).join("\n") : "";

  const monitorEdges = hasCloudWatch ? `${computeNode} -.->|"metrics"| CloudWatch` : "";

  const allEdges = [coreEdges, wsEdges, cacheRestEdge, sqsEdges, s3Edge, cdnEdge, searchEdges, monitorEdges]
    .filter(Boolean).join("\n");

  const securitySubgraph = securityLines
    ? `subgraph Security["Security Layer"]\n${securityLines}\nend`
    : "";

  const monitoringSubgraph = monitoringLines
    ? `subgraph Monitoring["Monitoring and DNS"]\n${monitoringLines}\nend`
    : "";

  return `graph TD

subgraph Client["Client Layer"]
  User["End User"]
end

subgraph Auth["Authentication"]
  Cognito["Amazon Cognito"]
end

${securitySubgraph}

subgraph API["API Layer"]
${apiSubgraphLines}
end

subgraph Compute["Compute Layer"]
${computeSubgraphLines}
end

subgraph Messaging["Async Messaging"]
${messagingSubgraphLines}
end

subgraph Data["Data Layer"]
${dataSubgraphLines}
end

subgraph Storage["Storage and CDN"]
${storageSubgraphLines}
end

${monitoringSubgraph}

${allEdges}`;
}

/* =========================
   Build Optimized Mermaid
   Programmatically constructs Mermaid for POST /analyse.
   Preserves the exact node detection and subgraph layout
   from the original server.js implementation.
========================= */
function buildOptimizedMermaid(optimized) {
  const keptAndAdded = optimized.optimized_services.filter(s => s.status !== "removed");
  const svcNames = keptAndAdded.map(s => s.name);

  const oHasWebSocket  = svcNames.some(n => /websocket/i.test(n));
  const oHasElastiCache = svcNames.some(n => /elasticache/i.test(n));
  const oHasSQS        = svcNames.some(n => /\bsqs\b/i.test(n));
  const oHasS3         = svcNames.some(n => /\bS3\b/i.test(n));
  const oHasOpenSearch = svcNames.some(n => /opensearch/i.test(n));
  const oHasCloudFront = svcNames.some(n => /cloudfront/i.test(n));
  const oHasWorker     = svcNames.some(n => /worker/i.test(n));
  const oHasECS        = svcNames.some(n => /\becs\b/i.test(n));
  const oComputeNode   = oHasECS ? "ECS" : "LambdaAPI";
  const oComputeLabel  = oHasECS ? "Amazon ECS Fargate" : "Lambda API Handler";
  const oHasCognito    = svcNames.some(n => /cognito/i.test(n));

  const oApiLines = [
    `  APIGateway["API Gateway REST"]`,
    oHasWebSocket ? `  WebSocketGW["API Gateway WebSocket"]` : ""
  ].filter(Boolean).join("\n");

  const oComputeLines = [
    `  ${oComputeNode}["${oComputeLabel}"]`,
    oHasWebSocket ? `  LambdaWS["Lambda WebSocket Handler"]` : "",
    oHasWorker    ? `  LambdaWorker["Lambda Background Worker"]` : ""
  ].filter(Boolean).join("\n");

  const oMsgLines = oHasSQS ? `  SQS["Amazon SQS"]` : "  %% no async messaging";

  const oDataLines = [
    `  DynamoDB["Amazon DynamoDB"]`,
    oHasElastiCache ? `  ElastiCache["ElastiCache Redis"]` : "",
    oHasOpenSearch  ? `  OpenSearch["Amazon OpenSearch"]` : ""
  ].filter(Boolean).join("\n");

  const oStorageLines = (oHasS3 || oHasCloudFront)
    ? [
        oHasS3         ? `  S3["Amazon S3"]` : "",
        oHasCloudFront ? `  CloudFront["Amazon CloudFront"]` : ""
      ].filter(Boolean).join("\n")
    : "  %% no storage";

  const oCoreEdges = [
    oHasCognito ? `User --> Cognito` : null,
    oHasCognito ? `Cognito -->|"JWT"| APIGateway` : `User --> APIGateway`,
    `APIGateway -->|"request"| ${oComputeNode}`,
    `${oComputeNode} -->|"read/write"| DynamoDB`
  ].filter(Boolean).join("\n");

  const oWsEdges = oHasWebSocket ? [
    `User -->|"WS upgrade"| WebSocketGW`,
    `WebSocketGW --> LambdaWS`,
    `LambdaWS -->|"pub/sub"| ElastiCache`,
    `ElastiCache -->|"fan-out"| LambdaWS`
  ].join("\n") : "";

  const oCacheEdge   = oHasElastiCache ? `${oComputeNode} -->|"cache"| ElastiCache` : "";

  const oSqsEdges = oHasSQS ? [
    `${oComputeNode} -->|"enqueue"| SQS`,
    `SQS -->|"trigger"| LambdaWorker`
  ].join("\n") : "";

  const oS3Edge     = oHasS3         ? `${oComputeNode} -->|"upload/fetch"| S3` : "";
  const oCdnEdge    = oHasCloudFront  ? `CloudFront -->|"origin"| S3` : "";
  const oSearchEdges = oHasOpenSearch ? [
    `LambdaWorker -->|"index"| OpenSearch`,
    `${oComputeNode} -->|"search"| OpenSearch`
  ].join("\n") : "";

  const oAllEdges = [oCoreEdges, oWsEdges, oCacheEdge, oSqsEdges, oS3Edge, oCdnEdge, oSearchEdges]
    .filter(Boolean).join("\n");

  const oAuthSubgraph = oHasCognito
    ? `subgraph Auth["Authentication"]\n  Cognito["Amazon Cognito"]\nend`
    : "";

  return `graph TD

subgraph Client["Client Layer"]
  User["End User"]
end

${oAuthSubgraph}

subgraph API["API Layer"]
${oApiLines}
end

subgraph Compute["Compute Layer"]
${oComputeLines}
end

subgraph Messaging["Async Messaging"]
${oMsgLines}
end

subgraph Data["Data Layer"]
${oDataLines}
end

subgraph Storage["Storage and CDN"]
${oStorageLines}
end

${oAllEdges}`;
}

module.exports = { sanitizeMermaid, buildArchitectureMermaid, buildOptimizedMermaid };
