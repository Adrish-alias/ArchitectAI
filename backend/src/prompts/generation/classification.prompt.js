/**
 * Build the Step 1 system prompt.
 * @returns {string}
 */
function buildClassificationSystemPrompt() {
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
- Design the architecture strictly based on these constraints without artificially inflating or deflating scale.
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
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt
};
