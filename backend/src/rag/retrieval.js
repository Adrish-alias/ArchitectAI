/**
 * src/rag/retrieval.js
 *
 * Phase 5 — Semantic Retrieval
 * Phase 7 — Lightweight Metadata Reranking
 *
 * ── Retrieval algorithm ────────────────────────────────────────────────────
 *   1. Embed the query text with all-MiniLM-L6-v2
 *   2. Compute cosine similarity between query embedding and every index entry
 *   3. Sort by semantic score descending
 *   4. Apply lightweight metadata reranking (see below)
 *   5. Return top-K results with original records attached
 *
 * ── Reranking formula ──────────────────────────────────────────────────────
 *   finalScore = (semantic × 0.70) + (requirementsOverlap × 0.20) + (useCaseOverlap × 0.10)
 *
 *   Where:
 *     semantic            = cosine_similarity(queryEmb, docEmb) ∈ [0,1]
 *     requirementsOverlap = Jaccard(query_signals, record.requirements_signals) ∈ [0,1]
 *     useCaseOverlap      = Jaccard(query_tokens, record.use_cases ∪ record.keywords) ∈ [0,1]
 *
 *   Jaccard here = (number of query tokens matching any element) / total query signal count
 *   Uses lowercase substring matching (not exact token match) for robustness.
 *
 *   Rationale:
 *     - Semantic score is the dominant signal (70%) — trust the embedding model
 *     - requirements_signals are tightly curated per-record triggers (20%)
 *     - Use case / keyword overlap provides a small categorical boost (10%)
 *
 * ── Weights ────────────────────────────────────────────────────────────────
 */

const RERANK_WEIGHTS = {
  semantic:     0.70,
  requirements: 0.20,
  useCase:      0.10
};

const { embedText } = require("./embedder");
const { loadIndex } = require("./vector-store");

// Populated from the JSONL on first retrieval call
let _recordsMap = null;

/**
 * Attach the architecture record map so retrieval can join back on record ID.
 * Called once by rag-service.js after loading records.
 *
 * @param {Object[]} records
 */
function attachRecords(records) {
  _recordsMap = new Map(records.map(r => [r.id, r]));
}

/**
 * Cosine similarity between two equal-length numeric arrays.
 * Both vectors must already be L2-normalised (all-MiniLM-L6-v2 outputs are).
 * Normalised cosine similarity = dot product.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Similarity ∈ [−1, 1] (practically [0, 1] for this model)
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Compute a soft overlap score: how many of the reference strings
 * are substring-matched by any word in the query text.
 *
 * @param {string}   queryText
 * @param {string[]} referenceList
 * @returns {number} Score ∈ [0, 1]
 */
function computeOverlap(queryText, referenceList) {
  if (!referenceList || referenceList.length === 0) return 0;
  const qLower = queryText.toLowerCase();
  let matches = 0;
  for (const item of referenceList) {
    const itemLower = item.toLowerCase();
    // Substring match: any word from the reference signal found in the query
    const words = itemLower.split(/\W+/).filter(w => w.length > 3);
    if (words.some(w => qLower.includes(w))) {
      matches++;
    }
  }
  return matches / referenceList.length;
}

/**
 * Retrieve and rerank architecture records for a given natural-language query.
 *
 * @param {string}  query                 Natural-language retrieval query
 * @param {Object}  [options]
 * @param {number}  [options.topK=3]      Number of results to return
 * @param {boolean} [options.debug=false] Log retrieval details
 * @returns {Promise<Array<{architecture: Object, semanticScore: number, finalScore: number}>>}
 */
async function retrieveArchitectures(query, options = {}) {
  const { topK = 3, debug = false } = options;

  // Load index
  const index = loadIndex();
  if (!index || !index.entries || index.entries.length === 0) {
    throw new Error("Vector index is missing or empty — run: npm run rag:index");
  }

  if (!_recordsMap) {
    throw new Error("Architecture records not loaded — call attachRecords() first");
  }

  // Embed the query
  const queryEmbedding = await embedText(query);

  // Score all entries
  const scored = index.entries.map(entry => {
    const semanticScore = cosineSimilarity(queryEmbedding, entry.embedding);
    return { id: entry.id, semanticScore };
  });

  // Sort by semantic score (primary signal)
  scored.sort((a, b) => b.semanticScore - a.semanticScore);

  // Rerank: apply metadata overlap signals
  const reranked = scored.map(({ id, semanticScore }) => {
    const record = _recordsMap.get(id);
    if (!record) return null;

    const reqScore     = computeOverlap(query, record.requirements_signals);
    const useCaseScore = computeOverlap(query, [
      ...(record.use_cases || []),
      ...(record.keywords || [])
    ]);

    const finalScore =
      (semanticScore * RERANK_WEIGHTS.semantic) +
      (reqScore       * RERANK_WEIGHTS.requirements) +
      (useCaseScore   * RERANK_WEIGHTS.useCase);

    return { architecture: record, semanticScore, reqScore, useCaseScore, finalScore };
  }).filter(Boolean);

  // Sort by final score
  reranked.sort((a, b) => b.finalScore - a.finalScore);

  const results = reranked.slice(0, topK);

  if (debug) {
    console.log("\n[RAG] RETRIEVAL RESULTS:");
    results.forEach((r, i) => {
      console.log(
        `  ${i + 1}. ${r.architecture.name}` +
        ` | semantic=${r.semanticScore.toFixed(4)}` +
        ` | req=${r.reqScore.toFixed(4)}` +
        ` | useCase=${r.useCaseScore.toFixed(4)}` +
        ` | final=${r.finalScore.toFixed(4)}`
      );
    });
  }

  // Return public shape (hide internal sub-scores unless debug)
  return results.map(r => ({
    architecture:  r.architecture,
    semanticScore: r.semanticScore,
    finalScore:    r.finalScore
  }));
}

module.exports = {
  retrieveArchitectures,
  attachRecords,
  cosineSimilarity,
  RERANK_WEIGHTS
};
