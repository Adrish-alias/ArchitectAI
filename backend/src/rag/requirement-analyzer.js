/**
 * src/rag/requirement-analyzer.js
 *
 * Requirement Analyzer — Generates a rich Architecture Requirement Profile.
 *
 * Takes user inputs (idea, users, budget, features, tier) AND Step 1 output (classificationText),
 * and uses Llama to produce a structured JSON requirement profile.
 *
 * If Llama call or JSON parsing fails, provides a rule-based fallback profile
 * to ensure 100% reliability.
 */

const { callLLM } = require("../services/llm/llm.service");
const { safeParse, attemptJsonRecovery } = require("../services/json.service");

const SYSTEM_PROMPT = `
You are a Principal Cloud Systems Architect.
Analyze the provided application request and Step 1 classification, and output a structured Architecture Requirement Profile as a single JSON object.

OUTPUT FORMAT — JSON ONLY. No markdown, no triple backticks, no prose outside JSON.

JSON SCHEMA:
{
  "application_type": "<web_application|mobile_application|ecommerce|marketplace|saas|api_platform|data_platform|analytics|media_processing|social_application|financial_application|iot|gaming|internal_business_application|microservices|unknown>",
  "clients": ["<web|mobile|api|backend_service|iot_device|unknown>"],
  "scale": "<free_tier|growth|scale|large_scale|distributed>",
  "compute_intensity": "<low|medium|high>",
  "data_complexity": "<low|medium|high>",
  "realtime_needs": "<none|low|high>",
  "capabilities": ["<e.g. authentication, catalog, search, payments, transactions, file_upload, image_processing, notifications, messaging, real_time_tracking, analytics, background_jobs, order_processing>"],
  "data_types": ["<e.g. users, products, orders, payments, locations, images, videos, events, logs, documents>"],
  "integration_patterns": ["<e.g. synchronous_api, asynchronous_processing, event_driven, message_queue, pub_sub, websocket, streaming, batch_processing, workflow_orchestration>"],
  "availability_requirements": ["<e.g. high_availability, fault_tolerance, low_latency, global_low_latency, automatic_scaling>"],
  "tenancy_model": "<single_tenant|multi_tenant|unknown>",
  "geographic_scope": "<single_region|multi_region|global|unknown>",
  "architecture_requirements": ["<concise list of 3-6 primary technical and architectural requirements>"]
}

RULES:
- Be precise and conservative. Only include capabilities and patterns explicitly stated or strongly implied by the inputs.
- If tenancy or geographic scope is not explicitly mentioned, use "unknown" or "single_region".
- Include specific architectural requirements in "architecture_requirements" (e.g., "scalable customer-facing marketplace", "real-time location updates", "transactional order processing").
`;

/**
 * Generate an Architecture Requirement Profile.
 *
 * @param {Object} params
 * @param {string}   params.idea
 * @param {string}   params.users
 * @param {string}   [params.budget]
 * @param {string[]} [params.features]
 * @param {string}   [params.tier]
 * @param {string}   params.classificationText  Raw text output from Step 1
 * @returns {Promise<Object>} Architecture Requirement Profile object
 */
async function analyzeRequirements({ idea, users, budget, features, tier, classificationText }) {
  const userPrompt = `
Idea: ${idea}
Users: ${users}
Budget: ${budget || "not specified"}
Features: ${(features || []).join(", ") || "none specified"}
Tier: ${tier || "balanced"}

Step 1 Classification:
${classificationText || "not provided"}
`;

  try {
    const rawOutput = await callLLM(SYSTEM_PROMPT, userPrompt, 800);
    let profile = safeParse(rawOutput);

    if (!profile) {
      profile = attemptJsonRecovery(rawOutput);
    }

    if (profile && profile.application_type) {
      return normalizeProfile(profile, classificationText, idea, features);
    }
  } catch (err) {
    console.warn("[RAG] Requirement analyzer LLM call failed — using fallback analyzer:", err.message);
  }

  // Heuristic fallback if LLM call or JSON recovery fails
  return buildFallbackProfile({ idea, users, budget, features, classificationText });
}

/**
 * Ensure defaults for missing fields in the LLM-generated profile.
 */
function normalizeProfile(profile, classificationText, idea, features) {
  const cls = parseClassificationText(classificationText);

  return {
    application_type:           profile.application_type           || inferApplicationType(idea, features),
    clients:                    Array.isArray(profile.clients) && profile.clients.length > 0 ? profile.clients : inferClients(idea, features),
    scale:                      profile.scale                      || cls.scale || "growth",
    compute_intensity:          profile.compute_intensity          || cls.computeIntensity || "medium",
    data_complexity:            profile.data_complexity            || cls.dataComplexity || "medium",
    realtime_needs:             profile.realtime_needs             || cls.realtimeNeeds || "none",
    capabilities:               Array.isArray(profile.capabilities)               ? profile.capabilities : [],
    data_types:                 Array.isArray(profile.data_types)                 ? profile.data_types : [],
    integration_patterns:       Array.isArray(profile.integration_patterns)       ? profile.integration_patterns : [],
    availability_requirements:  Array.isArray(profile.availability_requirements)  ? profile.availability_requirements : [],
    tenancy_model:              profile.tenancy_model              || "unknown",
    geographic_scope:           profile.geographic_scope           || "unknown",
    architecture_requirements:  Array.isArray(profile.architecture_requirements)  ? profile.architecture_requirements : []
  };
}

/**
 * Rule-based fallback requirement analyzer when LLM analysis is unavailable.
 */
function buildFallbackProfile({ idea, users, budget, features, classificationText }) {
  const cls = parseClassificationText(classificationText);
  const text = `${idea} ${(features || []).join(" ")}`.toLowerCase();

  const appType = inferApplicationType(idea, features);
  const clients = inferClients(idea, features);

  const capabilities = [];
  if (text.includes("auth") || text.includes("login")) capabilities.push("authentication");
  if (text.includes("catalog") || text.includes("product")) capabilities.push("catalog");
  if (text.includes("search")) capabilities.push("search");
  if (text.includes("pay") || text.includes("checkout")) capabilities.push("payments");
  if (text.includes("order")) capabilities.push("order_processing");
  if (text.includes("track") || text.includes("location") || text.includes("driver") || text.includes("live")) capabilities.push("real_time_tracking");
  if (text.includes("upload") || text.includes("image") || text.includes("file") || text.includes("photo")) capabilities.push("file_upload");
  if (text.includes("chat") || text.includes("message")) capabilities.push("messaging");

  const patterns = [];
  if (cls.realtimeNeeds === "high" || text.includes("track") || text.includes("live") || text.includes("chat")) {
    patterns.push("websocket");
  }
  if (text.includes("process") || text.includes("background") || text.includes("upload") || text.includes("job") || text.includes("queue")) {
    patterns.push("asynchronous_processing");
  }
  if (text.includes("event") || text.includes("stream") || text.includes("kinesis")) {
    patterns.push("event_driven");
  }
  if (patterns.length === 0) patterns.push("synchronous_api");

  const tenancy = (text.includes("tenant") || text.includes("saas") || text.includes("b2b")) ? "multi_tenant" : "single_tenant";
  const geo = (text.includes("global") || text.includes("multi-region") || text.includes("worldwide")) ? "global" : "single_region";

  return {
    application_type: appType,
    clients,
    scale: cls.scale || "growth",
    compute_intensity: cls.computeIntensity || "medium",
    data_complexity: cls.dataComplexity || "medium",
    realtime_needs: cls.realtimeNeeds || "none",
    capabilities,
    data_types: ["users", "orders", "payments"],
    integration_patterns: patterns,
    availability_requirements: ["high_availability", "automatic_scaling"],
    tenancy_model: tenancy,
    geographic_scope: geo,
    architecture_requirements: [
      `${appType.replace("_", " ")} application`,
      ...capabilities.map(c => c.replace("_", " "))
    ]
  };
}

function inferApplicationType(idea, features) {
  const t = `${idea} ${(features || []).join(" ")}`.toLowerCase();
  if (t.includes("saas") || t.includes("tenant")) return "saas";
  if (t.includes("food delivery") || t.includes("marketplace") || t.includes("uber") || t.includes("airbnb")) return "marketplace";
  if (t.includes("ecommerce") || t.includes("store") || t.includes("shop") || t.includes("cart")) return "ecommerce";
  if (t.includes("bank") || t.includes("fintech") || t.includes("wallet") || t.includes("payment")) return "financial_application";
  if (t.includes("social") || t.includes("instagram") || t.includes("feed") || t.includes("post")) return "social_application";
  if (t.includes("image") || t.includes("screenshot") || t.includes("video") || t.includes("media")) return "media_processing";
  if (t.includes("analytics") || t.includes("data lake") || t.includes("lakehouse")) return "analytics";
  if (t.includes("mobile") || t.includes("ios") || t.includes("android")) return "mobile_application";
  if (t.includes("api") || t.includes("gateway")) return "api_platform";
  return "web_application";
}

function inferClients(idea, features) {
  const t = `${idea} ${(features || []).join(" ")}`.toLowerCase();
  const clients = [];
  if (t.includes("mobile") || t.includes("app") || t.includes("ios") || t.includes("android") || t.includes("driver")) clients.push("mobile");
  if (t.includes("web") || t.includes("site") || t.includes("browser") || t.includes("portal")) clients.push("web");
  if (t.includes("api")) clients.push("api");
  if (clients.length === 0) clients.push("web");
  return clients;
}

function parseClassificationText(text) {
  if (!text) return {};
  const extract = (label) => {
    const match = text.match(new RegExp(`${label}:\\s*(\\S+)`, "i"));
    return match ? match[1].toLowerCase() : "";
  };
  return {
    scale: extract("SCALE"),
    computeIntensity: extract("COMPUTE_INTENSITY"),
    dataComplexity: extract("DATA_COMPLEXITY"),
    realtimeNeeds: extract("REALTIME_NEEDS")
  };
}

module.exports = { analyzeRequirements, buildFallbackProfile };
