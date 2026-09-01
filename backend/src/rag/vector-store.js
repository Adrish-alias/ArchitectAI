/**
 * src/rag/vector-store.js
 *
 * Phase 4 — Lightweight Persistent Local Vector Index
 *
 * Stores 384-dim embeddings as a JSON file on disk.
 * No external database. Designed for the 16-record corpus.
 *
 * Index file location: backend/data/rag-index/vector_index.json
 *
 * Index schema:
 * {
 *   "version": "<content hash of the JSONL file — used for staleness check>",
 *   "model":   "<model name>",
 *   "dim":     384,
 *   "createdAt": "<ISO timestamp>",
 *   "entries": [
 *     {
 *       "id":       "aws-architecture-001",
 *       "name":     "...",
 *       "category": "...",
 *       "embedding": [...384 floats...]
 *     }
 *   ]
 * }
 *
 * The original architecture record stays in architecture_records.jsonl.
 * This index file stores only the embedding + minimal identity metadata.
 */

const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const { KB_PATH }       = require("./loader");
const { MODEL_NAME }    = require("./embedder");

const INDEX_DIR  = path.resolve(__dirname, "../../data/rag-index");
const INDEX_PATH = path.join(INDEX_DIR, "vector_index.json");

/**
 * Compute a SHA-256 content hash of the JSONL file.
 * Used to detect whether re-indexing is needed.
 *
 * @returns {string} Hex hash
 */
function computeKbHash() {
  const content = fs.readFileSync(KB_PATH, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Read the persisted vector index from disk.
 *
 * @returns {{ version: string, model: string, dim: number, createdAt: string, entries: Object[] } | null}
 */
function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Write the vector index to disk.
 *
 * @param {Object} index
 */
function saveIndex(index) {
  if (!fs.existsSync(INDEX_DIR)) {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
}

/**
 * Check whether the persisted index is current.
 * Current = JSONL content hash matches and model name matches.
 *
 * @returns {boolean}
 */
function isIndexCurrent() {
  const index = loadIndex();
  if (!index) return false;
  if (index.model !== MODEL_NAME) return false;
  try {
    const hash = computeKbHash();
    return index.version === hash;
  } catch {
    return false;
  }
}

/**
 * Build a new vector index.
 *
 * @param {Object[]} records    Architecture records from loader
 * @param {number[string][]} embeddings  Parallel array of embedding vectors
 * @returns {Object}            The constructed index object
 */
function buildIndex(records, embeddings) {
  const entries = records.map((rec, i) => ({
    id:        rec.id,
    name:      rec.name,
    category:  rec.category,
    embedding: embeddings[i]
  }));

  return {
    version:   computeKbHash(),
    model:     MODEL_NAME,
    dim:       embeddings[0]?.length || 384,
    createdAt: new Date().toISOString(),
    entries
  };
}

module.exports = {
  loadIndex,
  saveIndex,
  buildIndex,
  isIndexCurrent,
  INDEX_PATH,
  INDEX_DIR
};
