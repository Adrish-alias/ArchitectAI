/* =========================
   Generation Step 1 — Scale & Complexity Classifier
========================= */

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

/**
 * Build the Step 1 system prompt.
 * @param {{ tier: string }} params
 * @returns {string}
 */
function buildClassificationSystemPrompt({ tier }) {
  const archTier = ["cost", "balanced", "performance"].includes(tier) ? tier : "balanced";
  return `
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
}

/**
 * Build the Step 1 user prompt.
 * @param {{ idea: string, users: string, budget?: string, features?: string[] }} params
 * @returns {string}
 */
function buildClassificationUserPrompt({ idea, users, budget, features }) {
  return `
Idea: ${idea}
Users: ${users}
Budget: ${budget || "not specified"}
Features: ${(features || []).join(", ") || "not specified"}
`;
}

module.exports = {
  TIER_STEP1,
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt
};
