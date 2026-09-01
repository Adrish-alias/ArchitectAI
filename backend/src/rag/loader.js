/**
 * src/rag/loader.js
 *
 * Phase 1 — Knowledge Base Loader
 *
 * Reads architecture_records.jsonl, parses each line, validates required fields,
 * and returns an array of architecture records.
 *
 * Does NOT modify the JSONL file.
 */

const fs   = require("fs");
const path = require("path");

// Path to the knowledge base JSONL file
const KB_PATH = path.resolve(
  __dirname,
  "../../data/knowledge-base/architecture_records.jsonl"
);

// Required fields every record must have
const REQUIRED_FIELDS = [
  "id",
  "name",
  "category",
  "description",
  "retrieval_text",
  "keywords",
  "services",
  "requirements_signals"
];

/**
 * Load and validate all architecture records from the JSONL file.
 *
 * @returns {Object[]} Array of validated architecture record objects
 * @throws {Error} If the file cannot be read or no valid records are found
 */
function loadArchitectureRecords() {
  if (!fs.existsSync(KB_PATH)) {
    throw new Error(`Knowledge base not found at: ${KB_PATH}`);
  }

  const raw    = fs.readFileSync(KB_PATH, "utf-8");
  const lines  = raw.trim().split("\n").filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("Knowledge base file is empty");
  }

  const records = [];
  const errors  = [];

  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;

    // Parse JSON
    let record;
    try {
      record = JSON.parse(line);
    } catch (e) {
      errors.push(`Line ${lineNum}: JSON parse error — ${e.message}`);
      return;
    }

    // Validate required fields
    const missing = REQUIRED_FIELDS.filter(f => !record[f]);
    if (missing.length > 0) {
      errors.push(`Line ${lineNum} (id=${record.id || "?"}): missing required fields: ${missing.join(", ")}`);
      return;
    }

    records.push(record);
  });

  // Report parse errors but only hard-fail if nothing loaded
  if (errors.length > 0) {
    console.warn(`[RAG Loader] ${errors.length} record(s) skipped:\n${errors.join("\n")}`);
  }

  if (records.length === 0) {
    throw new Error("No valid records loaded from knowledge base");
  }

  return records;
}

module.exports = { loadArchitectureRecords, KB_PATH };
