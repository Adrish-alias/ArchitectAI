/**
 * src/rag/document-builder.js
 *
 * Phase 3 — Canonical Document Text Builder
 *
 * Constructs a semantically rich text document from a raw architecture record.
 * This text is what gets embedded — NOT the raw JSON blob.
 *
 * Priority order: retrieval_text first (pre-curated for retrieval),
 * then structured fields for supplemental signal.
 */

/**
 * Build a clean embedding document from an architecture record.
 *
 * @param {Object} record  A record from architecture_records.jsonl
 * @returns {string}       Canonical document text for embedding
 */
function buildArchitectureEmbeddingText(record) {
  const parts = [];

  // ── Primary identity ──────────────────────────────────────────────────────
  parts.push(`Architecture: ${record.name}`);
  parts.push(`Category: ${record.category}`);

  // ── Curated retrieval text (highest priority — pre-written for semantic retrieval) ──
  if (record.retrieval_text) {
    parts.push(`\nRetrieval Summary:\n${record.retrieval_text}`);
  }

  // ── Description ───────────────────────────────────────────────────────────
  if (record.description) {
    parts.push(`\nDescription:\n${record.description}`);
  }

  // ── Use cases ─────────────────────────────────────────────────────────────
  if (record.use_cases && record.use_cases.length > 0) {
    parts.push(`\nUse cases:\n${record.use_cases.join("\n")}`);
  }

  // ── Requirements signals — what user requirements trigger this pattern ─────
  if (record.requirements_signals && record.requirements_signals.length > 0) {
    parts.push(`\nRequirements:\n${record.requirements_signals.join("\n")}`);
  }

  // ── Keywords ──────────────────────────────────────────────────────────────
  if (record.keywords && record.keywords.length > 0) {
    parts.push(`\nKeywords: ${record.keywords.join(", ")}`);
  }

  // ── AWS Services ──────────────────────────────────────────────────────────
  if (record.services && record.services.length > 0) {
    const svcLines = record.services.map(s => `${s.name}: ${s.role || ""}`);
    parts.push(`\nAWS Services:\n${svcLines.join("\n")}`);
  }

  // ── Architecture characteristics ─────────────────────────────────────────
  if (record.architecture_characteristics && record.architecture_characteristics.length > 0) {
    parts.push(`\nCharacteristics:\n${record.architecture_characteristics.join("\n")}`);
  }

  // ── Strengths ─────────────────────────────────────────────────────────────
  if (record.strengths && record.strengths.length > 0) {
    parts.push(`\nStrengths:\n${record.strengths.join("\n")}`);
  }

  // ── Tradeoffs ─────────────────────────────────────────────────────────────
  if (record.tradeoffs && record.tradeoffs.length > 0) {
    parts.push(`\nTradeoffs:\n${record.tradeoffs.join("\n")}`);
  }

  // ── Constraints ───────────────────────────────────────────────────────────
  if (record.constraints && record.constraints.length > 0) {
    parts.push(`\nConstraints:\n${record.constraints.join("\n")}`);
  }

  return parts.join("\n").trim();
}

module.exports = { buildArchitectureEmbeddingText };
