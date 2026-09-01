/**
 * src/rag/retrieval.js
 *
 * Phase 5 — Semantic Retrieval
 * Phase 7 — Reranking with Requirement Coverage & Diversity Filtering
 *
 * ── Reranking formula ──────────────────────────────────────────────────────
 *   finalScore = (semantic × 0.50) + (coverage × 0.25) + (category × 0.15) + (signals × 0.10)
 *
 *   Where:
 *     semantic  = Cosine similarity between query embedding and record embedding ∈ [0, 1]
 *     coverage  = Fraction of profile's architecture requirements & capabilities covered by record ∈ [0, 1]
 *     category  = Compatibility match between profile application_type/clients and record category ∈ [0, 1]
 *     signals   = Substring / token overlap with requirements_signals & keywords ∈ [0, 1]
 */

const RERANK_WEIGHTS = {
  semantic:  0.50,
  coverage:  0.25,
  category:  0.15,
  signals:   0.10
};

// Synonym/token normalization map for lightweight compatibility matching
const SYNONYM_MAP = {
  "saas":                   ["saas", "multi-tenant", "tenant isolation", "pooled", "shared services"],
  "multi_tenant":           ["saas", "multi-tenant", "tenant isolation", "tenant namespaces", "silo"],
  "marketplace":            ["ecommerce", "web_application", "marketplace", "orders", "payments", "catalog"],
  "ecommerce":              ["ecommerce", "web_application", "product catalog", "shopping cart", "payments", "fraud"],
  "mobile_application":     ["mobile", "api gateway", "cognito", "push notifications", "sdk", "spa"],
  "media_processing":       ["image_processing", "video", "s3", "rekognition", "firehose", "transcoding", "processing"],
  "analytics":              ["analytics", "data_lake", "athena", "glue", "redshift", "lakehouse", "kinesis"],
  "event_driven":           ["event_driven", "event sourcing", "kinesis", "sqs", "sns", "pub-sub", "step functions"],
  "microservices":          ["microservices", "fargate", "containers", "eks", "saga", "decoupled"],
  "financial_application":  ["relational", "rds", "aurora", "transactions", "high availability", "multi-az", "security"],
  "social_application":     ["spa", "serverless", "dynamodb", "cloudfront", "s3", "websocket", "realtime"]
};

const { embedText } = require("./embedder");
const { loadIndex } = require("./vector-store");

let _recordsMap = null;

function attachRecords(records) {
  _recordsMap = new Map(records.map(r => [r.id, r]));
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Compute Category & Client compatibility score ∈ [0, 1].
 */
function computeCategoryScore(profile, record) {
  if (!profile || !profile.application_type) return 0.5;

  const appType  = profile.application_type.toLowerCase();
  const recCat   = (record.category || "").toLowerCase();
  const recName  = (record.name || "").toLowerCase();
  const recText  = (record.retrieval_text || "").toLowerCase();

  // Direct category match
  if (recCat === appType) return 1.0;

  // Synonyms check
  const synonyms = SYNONYM_MAP[appType] || [appType.replace(/_/g, " ")];
  if (synonyms.some(s => recCat.includes(s) || recName.includes(s) || recText.includes(s))) {
    return 0.85;
  }

  // Cross-cutting architectural matches (e.g. mobile app matching serverless mobile backend)
  if (profile.clients && profile.clients.includes("mobile") && (recCat === "mobile" || recName.includes("mobile"))) {
    return 0.90;
  }

  return 0.3;
}

/**
 * Compute Requirement Coverage Score ∈ [0, 1].
 * Checks how many requirements/capabilities in the profile are satisfied by the record.
 */
function computeRequirementCoverage(profile, record) {
  if (!profile) return 0.5;

  const targetSignals = [
    ...(profile.architecture_requirements || []),
    ...(profile.capabilities || []),
    ...(profile.integration_patterns || [])
  ];

  if (targetSignals.length === 0) return 0.5;

  // Flatten record features
  const recordCorpus = [
    record.name,
    record.category,
    record.description,
    record.retrieval_text,
    ...(record.keywords || []),
    ...(record.use_cases || []),
    ...(record.requirements_signals || []),
    ...(record.architecture_characteristics || []),
    ...(record.services || []).map(s => s.name + " " + (s.role || ""))
  ].join(" ").toLowerCase();

  let matched = 0;
  targetSignals.forEach(signal => {
    const sigLower = signal.toLowerCase().replace(/_/g, " ");
    const words = sigLower.split(/\W+/).filter(w => w.length > 2);

    // If any synonym or 2+ keywords appear in the record corpus, count as covered
    const hasMatch = words.some(w => recordCorpus.includes(w)) ||
      (SYNONYM_MAP[sigLower] && SYNONYM_MAP[sigLower].some(syn => recordCorpus.includes(syn)));

    if (hasMatch) matched++;
  });

  return Math.min(1.0, matched / targetSignals.length);
}

/**
 * Compute general keyword & requirements_signals overlap score ∈ [0, 1].
 */
function computeSignalsOverlap(queryText, record) {
  const qLower = queryText.toLowerCase();
  const signals = [
    ...(record.requirements_signals || []),
    ...(record.keywords || [])
  ];

  if (signals.length === 0) return 0;

  let matches = 0;
  signals.forEach(sig => {
    const words = sig.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    if (words.some(w => qLower.includes(w))) {
      matches++;
    }
  });

  return Math.min(1.0, matches / signals.length);
}

/**
 * Apply diversity & complementary pattern selection.
 * Picks top-ranked primary architecture plus complementary patterns (e.g. event-driven or async messaging).
 */
function applyDiversityFilter(candidates, topK) {
  if (candidates.length <= topK) return candidates;

  const selected = [];
  const selectedCategories = new Set();

  // 1. Always select the #1 candidate (Primary Pattern)
  selected.push(candidates[0]);
  selectedCategories.add(candidates[0].architecture.category);

  // 2. Select remaining slots preferring complementary categories if score is competitive
  for (let i = 1; i < candidates.length && selected.length < topK; i++) {
    const candidate = candidates[i];
    const cat = candidate.architecture.category;

    // Prefer candidates from distinct categories or distinct pattern types
    const isDistinctCategory = !selectedCategories.has(cat);
    const scoreThreshold = candidates[0].finalScore * 0.65; // Competitive relative to #1

    if (isDistinctCategory && candidate.finalScore >= scoreThreshold) {
      selected.push(candidate);
      selectedCategories.add(cat);
    }
  }

  // 3. Fill any remaining slots by top score if distinct categories weren't enough
  for (let i = 1; i < candidates.length && selected.length < topK; i++) {
    if (!selected.includes(candidates[i])) {
      selected.push(candidates[i]);
    }
  }

  return selected;
}

/**
 * Retrieve and rerank architecture records for a given query & profile.
 *
 * @param {string}  query
 * @param {Object}  [options]
 * @param {number}  [options.topK=3]
 * @param {boolean} [options.debug=false]
 * @param {Object}  [options.profile]     Architecture Requirement Profile
 * @returns {Promise<Array<{architecture: Object, semanticScore: number, finalScore: number, requirementCoverage: number, categoryScore: number}>>}
 */
async function retrieveArchitectures(query, options = {}) {
  const { topK = 3, debug = false, profile = null } = options;

  const index = loadIndex();
  if (!index || !index.entries || index.entries.length === 0) {
    throw new Error("Vector index is missing or empty — run: npm run rag:index");
  }

  if (!_recordsMap) {
    throw new Error("Architecture records not loaded — call attachRecords() first");
  }

  const queryEmbedding = await embedText(query);

  const scored = index.entries.map(entry => {
    const semanticScore = cosineSimilarity(queryEmbedding, entry.embedding);
    return { id: entry.id, semanticScore };
  });

  // Calculate composite reranking score
  const reranked = scored.map(({ id, semanticScore }) => {
    const record = _recordsMap.get(id);
    if (!record) return null;

    const categoryScore       = computeCategoryScore(profile, record);
    const requirementCoverage = computeRequirementCoverage(profile, record);
    const signalsScore        = computeSignalsOverlap(query, record);

    const finalScore =
      (semanticScore       * RERANK_WEIGHTS.semantic) +
      (requirementCoverage * RERANK_WEIGHTS.coverage) +
      (categoryScore       * RERANK_WEIGHTS.category) +
      (signalsScore        * RERANK_WEIGHTS.signals);

    return {
      architecture: record,
      semanticScore,
      requirementCoverage,
      categoryScore,
      signalsScore,
      finalScore
    };
  }).filter(Boolean);

  // Sort by final composite score descending
  reranked.sort((a, b) => b.finalScore - a.finalScore);

  // Apply diversity & complementary pattern selection
  const diverseResults = applyDiversityFilter(reranked, topK);

  if (debug) {
    console.log("\n[RAG] RETRIEVAL & RERANKING RESULTS:");
    diverseResults.forEach((r, i) => {
      console.log(
        `  ${i + 1}. ${r.architecture.name} (${r.architecture.category})` +
        ` | semantic=${r.semanticScore.toFixed(4)}` +
        ` | coverage=${r.requirementCoverage.toFixed(4)}` +
        ` | catScore=${r.categoryScore.toFixed(4)}` +
        ` | final=${r.finalScore.toFixed(4)}`
      );
    });
  }

  return diverseResults.map(r => ({
    architecture:        r.architecture,
    semanticScore:       r.semanticScore,
    finalScore:          r.finalScore,
    requirementCoverage: r.requirementCoverage,
    categoryScore:       r.categoryScore
  }));
}

module.exports = {
  retrieveArchitectures,
  attachRecords,
  cosineSimilarity,
  RERANK_WEIGHTS
};

