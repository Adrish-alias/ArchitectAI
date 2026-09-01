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
 * Combines user input, Step 1 classification, and the Architecture Requirement Profile.
 *
 * @param {Object} params
 * @param {string}   params.idea              User's application idea
 * @param {string}   params.users             User count description
 * @param {string}   [params.budget]          Budget hint (optional)
 * @param {string[]} [params.features]        Feature list (optional)
 * @param {string}   params.classificationText  Raw Step 1 output text
 * @param {Object}   [params.profile]         Architecture Requirement Profile
 * @returns {string}  Natural-language retrieval query
 */
function buildRetrievalQuery({ idea, users, budget, features, classificationText, profile }) {
  const cls = parseClassification(classificationText);
  const parts = [];

  if (profile) {
    // ── Domain & Workload Type ───────────────────────────────────────────────
    const appTypeFormatted = (profile.application_type || "web_application").replace(/_/g, " ");
    const clientStr = profile.clients && profile.clients.length > 0 ? profile.clients.join(" and ") : "web";
    parts.push(`${profile.scale || cls.scale || "growth"}-scale ${appTypeFormatted} application for ${clientStr} clients serving ${users || "unspecified"} users`);

    // ── Architecture Requirements & Capabilities ──────────────────────────────
    if (profile.architecture_requirements && profile.architecture_requirements.length > 0) {
      parts.push(`Primary architecture requirements: ${profile.architecture_requirements.join(", ")}`);
    } else if (profile.capabilities && profile.capabilities.length > 0) {
      parts.push(`Requires capabilities: ${profile.capabilities.join(", ")}`);
    }

    // ── Integration Patterns ──────────────────────────────────────────────────
    if (profile.integration_patterns && profile.integration_patterns.length > 0) {
      const patternsFormatted = profile.integration_patterns.map(p => p.replace(/_/g, " "));
      parts.push(`Integration and communication patterns: ${patternsFormatted.join(", ")}`);
    }

    // ── Data Types & Tenancy ──────────────────────────────────────────────────
    if (profile.data_types && profile.data_types.length > 0) {
      parts.push(`Data domain includes: ${profile.data_types.join(", ")}`);
    }

    if (profile.tenancy_model && profile.tenancy_model !== "unknown") {
      parts.push(`Tenancy model: ${profile.tenancy_model.replace(/_/g, "-")}`);
    }

    if (profile.geographic_scope && profile.geographic_scope !== "unknown") {
      parts.push(`Geographic scope: ${profile.geographic_scope.replace(/_/g, " ")}`);
    }

    // ── Workload Dimensions ──────────────────────────────────────────────────
    parts.push(`Compute intensity: ${profile.compute_intensity || cls.computeIntensity || "medium"}, data complexity: ${profile.data_complexity || cls.dataComplexity || "medium"}, real-time needs: ${profile.realtime_needs || cls.realtimeNeeds || "none"}`);

  } else {
    // Fallback if no profile is provided
    parts.push(`${idea.trim()} application`);
    if (users) parts.push(`for ${users} users`);

    const featureList = features && features.length > 0 ? features.filter(f => f && f.trim()) : [];
    if (featureList.length > 0) parts.push(`with features: ${featureList.join(", ")}`);

    const signals = [];
    if (cls.scale) signals.push(`${cls.scale} scale`);
    if (cls.computeIntensity) signals.push(`${cls.computeIntensity} compute intensity`);
    if (cls.dataComplexity) signals.push(`${cls.dataComplexity} data complexity`);
    if (cls.realtimeNeeds) signals.push(`${cls.realtimeNeeds} real-time needs`);
    if (signals.length > 0) parts.push(signals.join(", "));
  }

  if (budget && budget.trim() && budget.trim().toLowerCase() !== "not specified") {
    parts.push(`budget: ${budget.trim()}`);
  }

  return parts.join(". ") + ".";
}

module.exports = { buildRetrievalQuery, parseClassification };

