/**
 * src/rag/rag-service.js
 *
 * RAG Service — Public interface used by architecture.service.js
 *
 * Responsibilities:
 *   - Initialise: load records + attach to retrieval module
 *   - Run the full retrieval pipeline (query build → embed → retrieve → rerank)
 *   - Handle all errors gracefully; never expose RAG failure to /generate callers
 *
 * Exported:
 *   initRag()           → called once at startup (optional, for speed)
 *   ragRetrieve(params) → called between Step 1 and Step 2
 */

const { loadArchitectureRecords }      = require("./loader");
const { embedText }                    = require("./embedder");
const { loadIndex }                    = require("./vector-store");
const { retrieveArchitectures, attachRecords } = require("./retrieval");
const { buildRetrievalQuery }          = require("./query-builder");

// Control debug logging
const RAG_DEBUG = process.env.RAG_DEBUG === "true";

let _initialised = false;

/**
 * Initialise the RAG system:
 *   1. Load architecture records from JSONL
 *   2. Attach records to the retrieval module
 *
 * Safe to call multiple times — idempotent.
 *
 * @returns {boolean} true if init succeeded, false if failed (non-fatal)
 */
async function initRag() {
  if (_initialised) return true;
  try {
    const records = loadArchitectureRecords();
    attachRecords(records);
    _initialised = true;
    return true;
  } catch (e) {
    console.error("[RAG] Init failed:", e.message);
    return false;
  }
}

/**
 * Execute RAG retrieval between Step 1 and Step 2.
 *
 * Phase 12 — Failure Fallback:
 *   If ANY part of RAG fails (index missing, model error, etc.),
 *   returns null instead of throwing. The caller in architecture.service.js
 *   will skip injection and continue without RAG context.
 *
 * @param {Object} params
 * @param {string}   params.idea
 * @param {string}   params.users
 * @param {string}   [params.budget]
 * @param {string[]} [params.features]
 * @param {string}   params.classificationText  Raw Step 1 output
 * @param {number}   [params.topK=3]
 * @returns {Promise<Array|null>} Retrieved results array, or null on failure
 */
async function ragRetrieve({ idea, users, budget, features, classificationText, topK = 3 }) {
  try {
    // Ensure records are loaded
    await initRag();

    // Verify index exists before proceeding
    const index = loadIndex();
    if (!index) {
      console.warn("[RAG] Vector index not found — run: npm run rag:index");
      return null;
    }

    // Build natural-language query
    const query = buildRetrievalQuery({ idea, users, budget, features, classificationText });

    if (RAG_DEBUG) {
      console.log("[RAG] QUERY:\n", query);
    }

    // Retrieve and rerank
    const results = await retrieveArchitectures(query, { topK, debug: RAG_DEBUG });

    if (RAG_DEBUG) {
      console.log(`[RAG] Retrieved ${results.length} result(s):`);
      results.forEach((r, i) =>
        console.log(`  ${i + 1}. ${r.architecture.name} (semantic=${r.semanticScore.toFixed(4)}, final=${r.finalScore.toFixed(4)})`)
      );
    }

    return results;
  } catch (err) {
    // Phase 12: log but never propagate
    console.error("[RAG] Retrieval failed (pipeline will continue without RAG):", err.message);
    return null;
  }
}

module.exports = { initRag, ragRetrieve };
