/**
 * src/rag/query-builder.js
 *
 * Phase 6 — Retrieval Query Builder
 *
 * Combines the raw user input WITH the Step 1 classification to produce
 * a rich natural-language retrieval query.
 *
 * Uses both sources because:
 *   - The domain idea ("food delivery", "fintech", "SaaS") is critical for
 *     semantic match — omitting it loses the application context entirely.
 *   - The Step 1 classification dimensions (scale, compute, data, realtime)
 *     add structured signals that align with requirements_signals in the KB.
 */

/**
 * Parse the Step 1 classification text output into a structured object.
 *
 * Expected Step 1 format (4 labeled lines):
 *   SCALE: growth
 *   COMPUTE_INTENSITY: medium
 *   DATA_COMPLEXITY: medium
 *   REALTIME_NEEDS: high
 *
 * @param {string} classificationText  Raw text output of Step 1
 * @returns {{ scale: string, computeIntensity: string, dataComplexity: string, realtimeNeeds: string }}
 */
function parseClassification(classificationText) {
  const extract = (label) => {
    const match = classificationText.match(new RegExp(`${label}:\\s*(\\S+)`, "i"));
    return match ? match[1].toLowerCase() : "";
  };

  return {
    scale:            extract("SCALE"),
    computeIntensity: extract("COMPUTE_INTENSITY"),
    dataComplexity:   extract("DATA_COMPLEXITY"),
    realtimeNeeds:    extract("REALTIME_NEEDS")
  };
}

/**
 * Build a natural-language retrieval query for the vector search.
 *
 * The query must convey:
 *   1. Application domain and idea (from user input)
 *   2. Scale and user count
 *   3. Core features (from user input)
 *   4. Classification dimensions (from Step 1 output)
 *
 * @param {Object} params
 * @param {string}   params.idea              User's application idea
 * @param {string}   params.users             User count description
 * @param {string}   [params.budget]          Budget hint (optional)
 * @param {string[]} [params.features]        Feature list (optional)
 * @param {string}   params.classificationText  Raw Step 1 output text
 * @returns {string}  Natural-language retrieval query
 */
function buildRetrievalQuery({ idea, users, budget, features, classificationText }) {
  const cls = parseClassification(classificationText);

  const parts = [];

  // ── Application domain ───────────────────────────────────────────────────
  parts.push(`${idea.trim()} application`);

  // ── User scale ───────────────────────────────────────────────────────────
  if (users) {
    parts.push(`for ${users} users`);
  }

  // ── Features ─────────────────────────────────────────────────────────────
  const featureList = features && features.length > 0
    ? features.filter(f => f && f.trim())
    : [];
  if (featureList.length > 0) {
    parts.push(`with features: ${featureList.join(", ")}`);
  }

  // ── Classification signals ───────────────────────────────────────────────
  const signals = [];

  if (cls.scale) {
    const scaleMap = {
      free_tier:   "very small scale",
      growth:      "growth-scale workload",
      scale:       "mid-scale workload",
      large_scale: "large-scale workload",
      distributed: "globally distributed workload"
    };
    signals.push(scaleMap[cls.scale] || `${cls.scale} scale`);
  }

  if (cls.computeIntensity) {
    signals.push(`${cls.computeIntensity} compute intensity`);
  }

  if (cls.dataComplexity) {
    signals.push(`${cls.dataComplexity} data complexity`);
  }

  if (cls.realtimeNeeds && cls.realtimeNeeds !== "none") {
    const rtMap = {
      low:  "some real-time requirements",
      high: "high real-time requirements with live updates"
    };
    signals.push(rtMap[cls.realtimeNeeds] || `${cls.realtimeNeeds} real-time needs`);
  } else if (cls.realtimeNeeds === "none") {
    signals.push("no real-time requirements");
  }

  if (signals.length > 0) {
    parts.push(signals.join(", "));
  }

  // ── Budget hint ───────────────────────────────────────────────────────────
  if (budget && budget.trim() && budget.trim().toLowerCase() !== "not specified") {
    parts.push(`budget: ${budget.trim()}`);
  }

  return parts.join(". ") + ".";
}

module.exports = { buildRetrievalQuery, parseClassification };
