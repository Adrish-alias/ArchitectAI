require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require("@aws-sdk/client-bedrock-runtime");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   Bedrock Client
========================= */
const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: new NodeHttpHandler(),
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
  middlewareStack: {
    add: (next) => async (args) => {
      args.request.headers["Authorization"] =
        `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}`;
      return next(args);
    }
  }
});

/* =========================
   Llama Call
========================= */
async function callLlama(system, user, maxLen = 1200) {
  const prompt = [
    "<|begin_of_text|><|start_header_id|>system<|end_header_id|>",
    system,
    "<|eot_id|><|start_header_id|>user<|end_header_id|>",
    user,
    "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
  ].join("\n");

  const command = new InvokeModelCommand({
    modelId:
      "arn:aws:bedrock:us-east-1:434702088658:inference-profile/us.meta.llama3-3-70b-instruct-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      prompt,
      max_gen_len: maxLen,
      temperature: 0.1,
      top_p: 0.9
    })
  });

  const response = await client.send(command);
  const decoded = new TextDecoder().decode(response.body);
  const result = JSON.parse(decoded);
  return (result.generation || "").trim();
}

/* =========================
   Safe JSON Parse
   Tries strict parse first, then trims surrounding noise.
========================= */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch { }
    }
    return null;
  }
}

/* =========================
   JSON Truncation Recovery
   When Llama hits max_gen_len mid-JSON, this closes all open
   strings / arrays / objects so JSON.parse can still succeed.
========================= */
function attemptJsonRecovery(raw) {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let text = raw.slice(start);

  // Close an open string — count unescaped double-quotes
  const quoteCount = (text.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) text += '"';

  // Count open braces and brackets
  let braces = 0, brackets = 0;
  for (const ch of text) {
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }

  // Strip trailing comma before closing containers
  text = text.trimEnd();
  if (text.endsWith(",")) text = text.slice(0, -1);

  text += "]".repeat(Math.max(0, brackets));
  text += "}".repeat(Math.max(0, braces));

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

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
   GENERATE ARCHITECTURE
========================= */
app.post("/generate", async (req, res) => {
  try {
    const { idea, users, budget, features, tier } = req.body;
    const archTier = ["cost", "balanced", "performance"].includes(tier) ? tier : "balanced";

    if (!idea || !users) {
      return res.status(400).json({ success: false, message: "Missing idea or users" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TIER-SPECIFIC PROMPT ADDENDA — fundamentally different architectures
    // ─────────────────────────────────────────────────────────────────────────
    const TIER_STEP1 = {
      cost: `
TIER OVERRIDE: COST-EFFICIENT ARCHITECTURE
You MUST classify toward the lowest viable scale tier.
- If the user count could fit free_tier, choose free_tier.
- If between 1k-10k, choose growth at most.
- NEVER pick scale/large_scale/distributed for cost tier.
- COMPUTE_INTENSITY: always pick the LOWEST level that is technically correct.
- DATA_COMPLEXITY: pick LOW unless the features absolutely demand medium.
- REALTIME_NEEDS: pick NONE unless chat/collab is an explicit feature.
The goal is a MINIMAL VIABLE architecture that handles the use case at the cheapest possible cost.`,

      balanced: `
TIER OVERRIDE: BALANCED ARCHITECTURE
Classify accurately based on real user count and feature set.
- Use the classification rules exactly as written.
- Don't inflate or deflate the scale.
- This tier represents the "right-sized" architecture for the stated requirements.`,

      performance: `
TIER OVERRIDE: HIGH-PERFORMANCE / ENTERPRISE ARCHITECTURE
You MUST classify toward the highest reasonable scale tier.
- If user count suggests growth, classify as scale.
- If user count suggests scale, classify as large_scale.
- COMPUTE_INTENSITY: always pick HIGH unless the app is purely static content.
- DATA_COMPLEXITY: always pick at least MEDIUM.
- REALTIME_NEEDS: pick at least LOW for any interactive app.
- Assume enterprise-grade reliability requirements (99.99% uptime SLA).
The goal is a ROBUST, REDUNDANT architecture that can handle 10x traffic spikes.`
    };

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

    // ─── STEP 1: Scale & Complexity Classifier ───────────────────────────────
    const step1System = `
You are a Senior Cloud Architect performing a system requirements analysis.

TASK: Classify the project along 4 dimensions so the next stage can choose the right AWS services.

OUTPUT FORMAT — return exactly these 4 labeled lines, nothing else:

SCALE: <tier>
COMPUTE_INTENSITY: <low|medium|high>
DATA_COMPLEXITY: <low|medium|high>
REALTIME_NEEDS: <none|low|high>

SCALE TIERS:
  free_tier      → < 1,000 concurrent users
  growth         → 1,000 – 10,000
  scale          → 10,000 – 100,000
  large_scale    → 100,000 – 1,000,000
  distributed    → > 1,000,000

COMPUTE_INTENSITY rules:
  low    → simple CRUD, content reads
  medium → file processing, moderate logic, payment webhooks
  high   → ML inference, video transcoding, code compilation, heavy aggregations

DATA_COMPLEXITY rules:
  low    → one or two simple entities, no search
  medium → multiple entities, moderate relations, some filtering
  high   → complex relations, full-text search, analytics, graph queries

REALTIME_NEEDS rules:
  none   → fully request/response, no live updates
  low    → polling acceptable (dashboard refresh every 30s)
  high   → live chat, collaborative editing, presence, live scores

CRITICAL RULES:
- Features override user count for REALTIME_NEEDS (chat always → high)
- Code compilation → COMPUTE_INTENSITY high
- Payments alone do NOT raise COMPUTE_INTENSITY above medium
${TIER_STEP1[archTier]}
`;

    const step1User = `
Idea: ${idea}
Users: ${users}
Budget: ${budget || "not specified"}
Features: ${(features || []).join(", ") || "not specified"}
`;

    const analysis = await callLlama(step1System, step1User, 300);
    console.log("STEP 1:\n", analysis);

    // ─── STEP 2: Service Selection ────────────────────────────────────────────
    const step2System = `
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

    const step2User = `
Classification:
${analysis}

Project:
Idea: ${idea}
Features: ${(features || []).join(", ") || "none specified"}
Users: ${users}
Budget: ${budget || "not specified"}
`;

    const serviceStack = await callLlama(step2System, step2User, 1500);
    console.log("STEP 2:\n", serviceStack);

    // ─── STEP 3: JSON Assembly ────────────────────────────────────────────────
    const step3System = `
You output ONLY a single valid JSON object. No markdown. No backticks. No comments. No text outside the JSON.

PRODUCE THIS EXACT SCHEMA — fill every field:
{
  "tier": "${archTier}",
  "tier_label": "${archTier === 'cost' ? 'Cost-Efficient' : archTier === 'balanced' ? 'Balanced' : 'High-Performance'}",
  "tier_description": "1-2 sentences explaining what this tier optimizes for and who it is best suited for",
  "scale_analysis": "2-3 sentences: scale tier, key drivers, and why this tier is appropriate",
  "architecture_overview": {
    "strategy": "3-4 sentences of overall design rationale specific to this tier's approach",
    "pattern": "e.g. Serverless Monolith, Event-Driven Microservices, Distributed Multi-AZ Enterprise",
    "read_flow": "User → Cognito → API Gateway → Lambda/ECS → [Cache] → DynamoDB",
    "write_flow": "User → API Gateway → Lambda/ECS → DynamoDB → [SQS → Worker]",
    "realtime_flow": "WebSocket path OR exactly the string: N/A - no real-time features",
    "async_flow": "SQS→Worker path OR exactly the string: N/A - no async processing",
    "key_tradeoffs": "1-2 sentences about what this tier sacrifices compared to other tiers"
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
${TIER_STEP3[archTier]}
`;

    const step3User = `
Step 1 Classification:
${analysis}

Step 2 Service Selection:
${serviceStack}

Project: ${idea}
Users: ${users}, Budget: ${budget || "not specified"}
`;

    const jsonRaw = await callLlama(step3System, step3User, 3500);

    let parsed = safeParse(jsonRaw);

    if (!parsed) {
      console.warn("Step 3: clean parse failed — attempting truncation recovery");
      parsed = attemptJsonRecovery(jsonRaw);
    }

    if (!parsed) {
      return res.status(500).json({
        success: false,
        error: "Invalid JSON from Step 3 — even recovery failed",
        raw: jsonRaw
      });
    }

    // Ensure required keys exist (defensive defaults for truncated responses)
    parsed.aws_services = parsed.aws_services || [];
    parsed.architecture_overview = parsed.architecture_overview || {};
    parsed.cost_breakdown = parsed.cost_breakdown || {};
    parsed.implementation_steps = parsed.implementation_steps || [];

    // Ensure tier is set in output
    parsed.tier = archTier;
    console.log(`STEP 3 OK [${archTier}]. Services:`, parsed.aws_services.map(s => s.name));

    // ─── STEP 4: Mermaid Diagram Generator ───────────────────────────────────
    const serviceNames = parsed.aws_services.map(s => s.name);
    const hasWebSocket = serviceNames.some(n => /websocket/i.test(n));
    const hasElastiCache = serviceNames.some(n => /elasticache/i.test(n));
    const hasSQS = serviceNames.some(n => /\bsqs\b/i.test(n));
    const hasS3 = serviceNames.some(n => /\bS3\b/i.test(n));
    const hasOpenSearch = serviceNames.some(n => /opensearch/i.test(n));
    const hasCloudFront = serviceNames.some(n => /cloudfront/i.test(n));
    const hasWorker = serviceNames.some(n => /worker/i.test(n));
    const hasECS = serviceNames.some(n => /\becs\b/i.test(n));
    const hasWAF = serviceNames.some(n => /\bwaf\b/i.test(n));
    const hasCloudWatch = serviceNames.some(n => /cloudwatch/i.test(n));
    const hasRoute53 = serviceNames.some(n => /route.?53/i.test(n));
    const computeNode = hasECS ? 'ECS' : 'LambdaAPI';
    const computeLabel = hasECS ? 'Amazon ECS Fargate' : 'Lambda API Handler';

    const apiSubgraphLines = [
      `  APIGateway["API Gateway"]`,
      hasWebSocket ? `  WebSocketGW["API Gateway WebSocket"]` : ""
    ].filter(Boolean).join("\n");

    const computeSubgraphLines = [
      `  ${computeNode}["${computeLabel}"]`,
      hasWebSocket ? `  LambdaWS["Lambda WebSocket Handler"]` : "",
      hasWorker ? `  LambdaWorker["Lambda Background Worker"]` : ""
    ].filter(Boolean).join("\n");

    const messagingSubgraphLines = hasSQS
      ? `  SQS["Amazon SQS"]`
      : "  %% no async messaging";

    const dataSubgraphLines = [
      `  DynamoDB["Amazon DynamoDB"]`,
      hasElastiCache ? `  ElastiCache["ElastiCache Redis"]` : "",
      hasOpenSearch ? `  OpenSearch["Amazon OpenSearch"]` : ""
    ].filter(Boolean).join("\n");

    const storageSubgraphLines = (hasS3 || hasCloudFront)
      ? [
        hasS3 ? `  S3["Amazon S3"]` : "",
        hasCloudFront ? `  CloudFront["Amazon CloudFront"]` : ""
      ].filter(Boolean).join("\n")
      : "  %% no storage";

    // Security subgraph (performance tier)
    const securityLines = (hasWAF)
      ? [
        hasWAF ? `  WAF["AWS WAF"]` : "",
      ].filter(Boolean).join("\n")
      : null;

    // Monitoring subgraph (performance tier)
    const monitoringLines = (hasCloudWatch || hasRoute53)
      ? [
        hasCloudWatch ? `  CloudWatch["Amazon CloudWatch"]` : "",
        hasRoute53 ? `  Route53["Amazon Route 53"]` : "",
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

    const s3Edge = hasS3 ? `${computeNode} -->|"upload/fetch"| S3` : "";
    const cdnEdge = (hasCloudFront && hasS3 && !hasWAF) ? `CloudFront -->|"origin"| S3` : "";
    const searchEdges = hasOpenSearch ? [
      hasWorker ? `LambdaWorker -->|"index"| OpenSearch` : "",
      `${computeNode} -->|"search"| OpenSearch`
    ].filter(Boolean).join("\n") : "";

    // Monitoring edges
    const monitorEdges = hasCloudWatch ? `${computeNode} -.->|"metrics"| CloudWatch` : "";

    const allEdges = [coreEdges, wsEdges, cacheRestEdge, sqsEdges, s3Edge, cdnEdge, searchEdges, monitorEdges]
      .filter(Boolean).join("\n");

    const securitySubgraph = securityLines ? `subgraph Security["Security Layer"]
${securityLines}
end` : "";

    const monitoringSubgraph = monitoringLines ? `subgraph Monitoring["Monitoring and DNS"]
${monitoringLines}
end` : "";

    const preBuildDiagram = `graph TD

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

    const step4System = `
You are a Mermaid.js syntax validator.

You will receive a pre-built Mermaid flowchart. Your job is to:
1. Verify every line is syntactically correct Mermaid
2. Fix any issues ONLY — do NOT add or remove nodes or edges
3. Output the corrected diagram and NOTHING else

MERMAID SYNTAX RULES:
- First line must be exactly: graph TD
- Node format: NodeID["Label in double quotes"]
  Correct:   APIGateway["API Gateway REST"]
  Wrong:     APIGateway[API Gateway (REST)]
  Wrong:     APIGateway["API Gateway (REST)"]  ← parens in labels cause parse errors, remove them
- Edge format: A --> B  or  A -->|"label"| B
- One edge per line — never chain: A --> B --> C
- No duplicate edges
- subgraph must close with end
- No triple backticks, no prose, no comments except %% style

OUTPUT: raw Mermaid code only, starting with graph TD
`;

    const step4User = `Validate and fix this diagram:\n\n${preBuildDiagram}`;

    const rawMermaid = await callLlama(step4System, step4User, 1200);
    parsed.mermaid = sanitizeMermaid(rawMermaid);

    if (!parsed.mermaid.startsWith("graph")) {
      console.warn("Step 4: Llama output invalid — using pre-built diagram as fallback");
      parsed.mermaid = sanitizeMermaid(preBuildDiagram);
    }

    console.log("STEP 4 MERMAID:\n", parsed.mermaid);

    // ─── STEP 5: Gemini Validation & Refinement ───────────────────────────────
    console.log("STEP 5 (Gemini) START");
    let finalData;
    try {
      finalData = await refineWithGemini(parsed);
      console.log("STEP 5 DONE");
    } catch (e) {
      console.error("Gemini failed — using Step 4 output:", e.message);
      finalData = parsed;
    }

    res.json({ success: true, data: finalData });

  } catch (err) {
    console.error("Pipeline Error:", err);
    res.status(500).json({ success: false, error: err.name, message: err.message });
  }
});

/* =========================
   Gemini Refinement (Step 5)
========================= */
async function refineWithGemini(data) {
  const prompt = `
You are a strict AWS architecture validator. Validate the JSON below and return a corrected version.

INPUT JSON:
${JSON.stringify(data, null, 2)}

VALIDATION CHECKS:

1. MERMAID SYNTAX
   - First line must be exactly: graph TD
   - Every node: NodeID["Label"] — double-quoted labels, NO parentheses inside labels
     WRONG:  ECS["Amazon ECS (Fargate)"]
     RIGHT:  ECS["Amazon ECS Fargate"]
   - No backticks or markdown fences anywhere
   - No chained edges (A --> B --> C) — must be split into two lines
   - No duplicate edges
   - All subgraphs must close with end

2. SERVICE CONSISTENCY
   - Every service in aws_services must appear in at least one architecture_overview flow
   - Every node in the mermaid diagram must map to a service in aws_services
   - If a node has no matching service, remove the node and its edges

3. COST SANITY
   - per_service costs must sum to approximately monthly_estimate
   - Costs must be realistic for the stated scale

4. FLOW LOGIC
   - ElastiCache must NOT connect directly to DynamoDB
   - SQS must always point to a Lambda Worker
   - User must connect to Cognito before API Gateway

OUTPUT RULES:
- Return ONLY valid JSON, no markdown, no backticks, no explanatory text
- Preserve the exact schema structure of the input
- mermaid field must use literal newlines, not \\n escape sequences
- All JSON strings must be properly escaped
`;

  const modelsToTry = ["gemini-2.5-flash"];
  let text = "";

  for (const modelName of modelsToTry) {
    try {
      console.log(`Gemini trying: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log(`Gemini OK: ${modelName}`);
      break;
    } catch (err) {
      console.warn(`Gemini ${modelName} failed:`, err.message);
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        throw new Error("All Gemini fallback attempts failed.");
      }
    }
  }

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in Gemini response");
    const refined = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    if (refined.mermaid) refined.mermaid = sanitizeMermaid(refined.mermaid);
    return refined;
  } catch (err) {
    console.error("Gemini parse failed:", err.message);
    return data;
  }
}


/* ═══════════════════════════════════════════════════════
   ANALYSE ARCHITECTURE — POST /analyse
   ═══════════════════════════════════════════════════════ */
app.post("/analyse", async (req, res) => {
  try {
    const { mermaid: mermaidCode, description } = req.body;

    if (!mermaidCode || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing mermaid diagram or architecture description"
      });
    }

    // ─── ANALYSE STEP 1: Architecture Parser ─────────────────────────────────
    const a1System = `
You are a Senior AWS Cloud Architect performing an architecture audit.

TASK: Parse the provided Mermaid architecture diagram and project description to extract a structured inventory of services, data flows, and inferred scale.

OUTPUT FORMAT — return exactly this structure as plain text:

## Extracted Services
(for each service found in the diagram)
SERVICE: <service name as shown in diagram>
NODE_ID: <the Mermaid node ID>
INFERRED_ROLE: <what this service likely does based on connections>

## Inferred Data Flows
READ_FLOW: <reconstructed read path from diagram edges>
WRITE_FLOW: <reconstructed write path from diagram edges>
REALTIME_FLOW: <if WebSocket or similar found, otherwise: N/A>
ASYNC_FLOW: <if SQS/queue found, otherwise: N/A>

## Scale Assessment
ESTIMATED_SCALE: <free_tier|growth|scale|large_scale|distributed>
COMPUTE_INTENSITY: <low|medium|high>
DATA_COMPLEXITY: <low|medium|high>
REALTIME_NEEDS: <none|low|high>

## Architecture Summary
<2-3 sentences describing the overall architecture pattern>

RULES:
- Extract ONLY what is present in the diagram — do not invent services
- Node IDs must match the Mermaid source exactly
- Be specific about which edges connect which nodes
`;

    const a1User = `
Architecture Description:
${description}

Mermaid Diagram:
${mermaidCode}
`;

    const archParsed = await callLlama(a1System, a1User, 1200);
    console.log("ANALYSE STEP 1:\n", archParsed);

    // ─── ANALYSE STEP 2: Issue Detector ──────────────────────────────────────
    const a2System = `
You are a Principal AWS Solutions Architect performing an architecture review.

TASK: Identify ALL issues in the provided architecture. Be thorough and specific.

ISSUE CATEGORIES:

1. UNNECESSARY — services that are over-engineered for the stated requirements
   Examples: ElastiCache for a simple CRUD app, OpenSearch when simple DynamoDB queries suffice

2. MISSING — critical services that SHOULD be present but are not
   Examples: No authentication, no CDN for global users, no queue for async processing
   
3. ANTI_PATTERN — architectural mistakes that will cause problems at scale
   Examples: Direct DB access without API layer, no caching for high-read workloads, 
   synchronous processing of heavy tasks, Lambda for sustained high-throughput

4. COST — services that are significantly over-provisioned or could be replaced with cheaper alternatives
   Examples: ECS Fargate when Lambda would suffice for low traffic, Redshift for simple analytics

OUTPUT FORMAT — return ONLY a JSON array of issues. No markdown. No backticks. No prose.

[
  {
    "node_id": "MermaidNodeID or null if missing service",
    "service_name": "affected AWS service name",
    "type": "unnecessary|missing|anti_pattern|cost",
    "severity": "high|medium|low",
    "title": "short 5-8 word issue title",
    "description": "2-3 sentences explaining the problem",
    "recommendation": "1-2 sentences of specific fix"
  }
]

RULES:
- Every architecture has at least 1-2 issues — be honest
- node_id must match Mermaid source node IDs exactly for existing services
- For MISSING services, node_id should be null
- severity: high = security risk or will break at scale, medium = performance/cost concern, low = best practice
- Be specific to THIS architecture — no generic advice
- Maximum 8 issues, minimum 1
`;

    const a2User = `
Architecture Analysis:
${archParsed}

Original Mermaid Diagram:
${mermaidCode}

Project Description:
${description}
`;

    const issuesRaw = await callLlama(a2System, a2User, 1800);
    console.log("ANALYSE STEP 2 raw:\n", issuesRaw);

    let issues = null;
    // Try to parse as array
    try {
      const trimmed = issuesRaw.trim();
      if (trimmed.startsWith("[")) {
        issues = JSON.parse(trimmed);
      }
    } catch { }

    if (!issues) {
      // Try extracting array from text
      const arrStart = issuesRaw.indexOf("[");
      const arrEnd = issuesRaw.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd !== -1) {
        try {
          issues = JSON.parse(issuesRaw.slice(arrStart, arrEnd + 1));
        } catch { }
      }
    }

    if (!issues) {
      // Attempt recovery
      const arrStart = issuesRaw.indexOf("[");
      if (arrStart !== -1) {
        let text = issuesRaw.slice(arrStart);
        const qc = (text.match(/(?<!\\)"/g) || []).length;
        if (qc % 2 !== 0) text += '"';
        let br = 0, bk = 0;
        for (const ch of text) {
          if (ch === "{") br++;
          else if (ch === "}") br--;
          else if (ch === "[") bk++;
          else if (ch === "]") bk--;
        }
        text = text.trimEnd();
        if (text.endsWith(",")) text = text.slice(0, -1);
        text += "}".repeat(Math.max(0, br));
        text += "]".repeat(Math.max(0, bk));
        try { issues = JSON.parse(text); } catch { }
      }
    }

    if (!issues || !Array.isArray(issues)) {
      issues = [{
        node_id: null,
        service_name: "General",
        type: "anti_pattern",
        severity: "medium",
        title: "Architecture review could not be fully parsed",
        description: "The AI analysis produced results but they could not be fully structured. The raw analysis is available.",
        recommendation: "Re-run the analysis or review the architecture manually."
      }];
    }

    // ─── ANALYSE STEP 3: Optimized Architecture Builder ──────────────────────
    const issuesSummary = issues.map(i =>
      `- [${i.type.toUpperCase()}] ${i.title}: ${i.recommendation}`
    ).join("\n");

    const a3System = `
You output ONLY a single valid JSON object. No markdown. No backticks. No text outside the JSON.

You are rebuilding an optimized AWS architecture based on an existing one and a list of identified issues.

PRODUCE THIS EXACT SCHEMA:
{
  "original_cost_estimate": "$X – $Y/month",
  "optimized_cost_estimate": "$X – $Y/month",
  "cost_delta": "+$X or -$X per month",
  "savings_percentage": "X%",
  "optimization_summary": "2-3 sentences summarizing key changes",
  "optimized_services": [
    {
      "name": "AWS service name",
      "role": "specific role",
      "status": "kept|added|removed|replaced",
      "change_reason": "why this service was kept/added/removed/replaced",
      "estimated_monthly_cost": "$X – $Y"
    }
  ],
  "optimized_architecture_overview": {
    "strategy": "2-3 sentences",
    "read_flow": "flow description",
    "write_flow": "flow description",
    "realtime_flow": "flow description or N/A",
    "async_flow": "flow description or N/A"
  },
  "optimized_cost_breakdown": {
    "monthly_estimate": "$X – $Y/month",
    "per_service": [
      { "service": "name", "cost": "$X – $Y" }
    ],
    "cost_notes": "key cost drivers"
  },
  "mermaid": ""
}

RULES:
- "mermaid" must be empty string "" — filled in next step
- status must be one of: kept, added, removed, replaced
- removed services should still appear in the list with status "removed"
- cost_delta: negative means savings, positive means extra cost
- Be concise in all strings
- All JSON strings must be properly escaped
`;

    const a3User = `
Original Architecture Mermaid:
${mermaidCode}

Project Description:
${description}

Detected Issues:
${issuesSummary}

Scale Assessment from Step 1:
${archParsed}
`;

    const a3Raw = await callLlama(a3System, a3User, 2500);

    let optimized = safeParse(a3Raw);
    if (!optimized) {
      console.warn("Analyse Step 3: clean parse failed — attempting recovery");
      optimized = attemptJsonRecovery(a3Raw);
    }

    if (!optimized) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate optimized architecture JSON",
        issues: issues
      });
    }

    // Defaults
    optimized.optimized_services = optimized.optimized_services || [];
    optimized.optimized_architecture_overview = optimized.optimized_architecture_overview || {};
    optimized.optimized_cost_breakdown = optimized.optimized_cost_breakdown || {};

    console.log("ANALYSE STEP 3 OK. Services:", optimized.optimized_services.map(s => `${s.name} [${s.status}]`));

    // ─── ANALYSE STEP 4: Build Optimized Mermaid ─────────────────────────────
    const keptAndAdded = optimized.optimized_services.filter(s => s.status !== "removed");
    const svcNames = keptAndAdded.map(s => s.name);

    const oHasWebSocket = svcNames.some(n => /websocket/i.test(n));
    const oHasElastiCache = svcNames.some(n => /elasticache/i.test(n));
    const oHasSQS = svcNames.some(n => /\bsqs\b/i.test(n));
    const oHasS3 = svcNames.some(n => /\bS3\b/i.test(n));
    const oHasOpenSearch = svcNames.some(n => /opensearch/i.test(n));
    const oHasCloudFront = svcNames.some(n => /cloudfront/i.test(n));
    const oHasWorker = svcNames.some(n => /worker/i.test(n));
    const oHasECS = svcNames.some(n => /\becs\b/i.test(n));
    const oComputeNode = oHasECS ? 'ECS' : 'LambdaAPI';
    const oComputeLabel = oHasECS ? 'Amazon ECS Fargate' : 'Lambda API Handler';
    const oHasCognito = svcNames.some(n => /cognito/i.test(n));

    const oApiLines = [
      `  APIGateway["API Gateway REST"]`,
      oHasWebSocket ? `  WebSocketGW["API Gateway WebSocket"]` : ""
    ].filter(Boolean).join("\n");

    const oComputeLines = [
      `  ${oComputeNode}["${oComputeLabel}"]`,
      oHasWebSocket ? `  LambdaWS["Lambda WebSocket Handler"]` : "",
      oHasWorker ? `  LambdaWorker["Lambda Background Worker"]` : ""
    ].filter(Boolean).join("\n");

    const oMsgLines = oHasSQS ? `  SQS["Amazon SQS"]` : "  %% no async messaging";

    const oDataLines = [
      `  DynamoDB["Amazon DynamoDB"]`,
      oHasElastiCache ? `  ElastiCache["ElastiCache Redis"]` : "",
      oHasOpenSearch ? `  OpenSearch["Amazon OpenSearch"]` : ""
    ].filter(Boolean).join("\n");

    const oStorageLines = (oHasS3 || oHasCloudFront)
      ? [
        oHasS3 ? `  S3["Amazon S3"]` : "",
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

    const oCacheEdge = oHasElastiCache ? `${oComputeNode} -->|"cache"| ElastiCache` : "";

    const oSqsEdges = oHasSQS ? [
      `${oComputeNode} -->|"enqueue"| SQS`,
      `SQS -->|"trigger"| LambdaWorker`
    ].join("\n") : "";

    const oS3Edge = oHasS3 ? `${oComputeNode} -->|"upload/fetch"| S3` : "";
    const oCdnEdge = oHasCloudFront ? `CloudFront -->|"origin"| S3` : "";
    const oSearchEdges = oHasOpenSearch ? [
      `LambdaWorker -->|"index"| OpenSearch`,
      `${oComputeNode} -->|"search"| OpenSearch`
    ].join("\n") : "";

    const oAllEdges = [oCoreEdges, oWsEdges, oCacheEdge, oSqsEdges, oS3Edge, oCdnEdge, oSearchEdges]
      .filter(Boolean).join("\n");

    const oAuthSubgraph = oHasCognito ? `subgraph Auth["Authentication"]
  Cognito["Amazon Cognito"]
end` : "";

    const optimizedDiagram = `graph TD

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

    // Validate with Llama
    const a4System = `
You are a Mermaid.js syntax validator.

You will receive a pre-built Mermaid flowchart. Your job is to:
1. Verify every line is syntactically correct Mermaid
2. Fix any issues ONLY — do NOT add or remove nodes or edges
3. Output the corrected diagram and NOTHING else

MERMAID SYNTAX RULES:
- First line must be exactly: graph TD
- Node format: NodeID["Label in double quotes"]
- Edge format: A --> B  or  A -->|"label"| B
- One edge per line — never chain
- No duplicate edges
- subgraph must close with end
- No triple backticks, no prose
- Remove any empty subgraphs that contain only comments

OUTPUT: raw Mermaid code only, starting with graph TD
`;

    const a4User = `Validate and fix this diagram:\n\n${optimizedDiagram}`;
    const rawOptMermaid = await callLlama(a4System, a4User, 1200);
    optimized.mermaid = sanitizeMermaid(rawOptMermaid);

    if (!optimized.mermaid.startsWith("graph")) {
      console.warn("Analyse Step 4: Llama output invalid — using pre-built diagram");
      optimized.mermaid = sanitizeMermaid(optimizedDiagram);
    }

    console.log("ANALYSE STEP 4 MERMAID:\n", optimized.mermaid);

    // ─── ANALYSE STEP 5: Gemini Validation ───────────────────────────────────
    console.log("ANALYSE STEP 5 (Gemini) START");
    try {
      const geminiResult = await refineAnalysisWithGemini({
        issues,
        optimized,
        original_mermaid: mermaidCode
      });
      if (geminiResult.issues) issues = geminiResult.issues;
      if (geminiResult.optimized) optimized = geminiResult.optimized;
      console.log("ANALYSE STEP 5 DONE");
    } catch (e) {
      console.error("Gemini analysis refinement failed:", e.message);
    }

    res.json({
      success: true,
      data: {
        original_mermaid: mermaidCode,
        description,
        issues,
        ...optimized
      }
    });

  } catch (err) {
    console.error("Analyse Pipeline Error:", err);
    res.status(500).json({ success: false, error: err.name, message: err.message });
  }
});

/* =========================
   Gemini Analysis Refinement
========================= */
async function refineAnalysisWithGemini({ issues, optimized, original_mermaid }) {
  const prompt = `
You are an expert AWS architecture reviewer and Mermaid diagram validator.

You are given:
1. A list of architecture issues detected by an AI
2. An optimized architecture proposal
3. The original mermaid diagram

VALIDATE AND CORRECT:

1. ISSUES
   - Each issue must have: node_id, service_name, type, severity, title, description, recommendation
   - Types must be: unnecessary, missing, anti_pattern, or cost
   - Severity must be: high, medium, or low
   - Ensure node_ids match the ORIGINAL mermaid diagram nodes

2. OPTIMIZED MERMAID
   - First line: graph TD
   - Node format: NodeID["Label"] — NO parentheses in labels
   - No chained edges, no duplicate edges
   - All subgraphs close with end

3. COST CONSISTENCY
   - optimized costs should be realistic
   - cost_delta should match the difference between original and optimized estimates

Return ONLY valid JSON with this structure:
{
  "issues": [...corrected issues array...],
  "optimized": {...corrected optimized object...}
}

No markdown. No backticks. No explanatory text.

INPUT:
Issues: ${JSON.stringify(issues)}
Optimized: ${JSON.stringify(optimized)}
Original Mermaid: ${original_mermaid}
`;

  const modelsToTry = ["gemini-2.5-flash"];
  let text = "";

  for (const modelName of modelsToTry) {
    try {
      console.log(`Gemini analyse trying: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log(`Gemini analyse OK: ${modelName}`);
      break;
    } catch (err) {
      console.warn(`Gemini ${modelName} failed:`, err.message);
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        throw new Error("All Gemini attempts failed for analysis refinement.");
      }
    }
  }

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    if (parsed.optimized?.mermaid) {
      parsed.optimized.mermaid = sanitizeMermaid(parsed.optimized.mermaid);
    }
    return parsed;
  } catch (err) {
    console.error("Gemini analysis parse failed:", err.message);
    return { issues, optimized };
  }
}


/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AWS Architect Agent running on port ${PORT}`);
});
