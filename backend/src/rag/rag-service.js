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

const { loadArchitectureRecords }              = require("./loader");
const { embedText }                            = require("./embedder");
const { loadIndex }                            = require("./vector-store");
const { retrieveArchitectures, attachRecords } = require("./retrieval");
const { buildRetrievalQuery }                  = require("./query-builder");
const { analyzeRequirements }                  = require("./requirement-analyzer");
const { analyzeReferences }                    = require("./reference-analyzer");

// Control debug logging
const RAG_DEBUG = process.env.RAG_DEBUG === "true";

let _initialised = false;

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
 * Steps:
 *  1. Analyze user inputs + Step 1 text to build Architecture Requirement Profile.
 *  2. Build domain-rich natural-language retrieval query from profile.
 *  3. Embed query and search vector index.
 *  4. Apply metadata requirement coverage, category scoring, and diversity filter.
 *  5. Run Reference Analysis to produce explicit Requirement → Reference → Design Decision mapping.
 *
 * Fallback: If ANY component fails, returns null, allowing Step 2 to continue
 * using original ungrounded logic.
 */
async function ragRetrieve({ idea, users, budget, features, tier, classificationText, topK = 3 }) {
  try {
    await initRag();

    const index = loadIndex();
    if (!index) {
      console.warn("[RAG] Vector index not found — run: npm run rag:index");
      return null;
    }

    // Step 1.5: Build Architecture Requirement Profile
    let profile = null;
    try {
      profile = await analyzeRequirements({ idea, users, budget, features, tier, classificationText });
      if (RAG_DEBUG) {
        console.log("[RAG] REQUIREMENT PROFILE:\n", JSON.stringify(profile, null, 2));
      }
    } catch (e) {
      console.warn("[RAG] Requirement analyzer failed — falling back to Step 1 classification:", e.message);
    }

    // Step 1.6: Build natural language retrieval query
    const query = buildRetrievalQuery({ idea, users, budget, features, classificationText, profile });

    if (RAG_DEBUG) {
      console.log("[RAG] QUERY:\n", query);
    }

    // Step 1.7: Retrieve, rerank, and apply diversity filter
    const results = await retrieveArchitectures(query, { topK, debug: RAG_DEBUG, profile });

    if (RAG_DEBUG) {
      console.log(`[RAG] Retrieved ${results.length} result(s):`);
      results.forEach((r, i) =>
        console.log(`  ${i + 1}. ${r.architecture.name} (${r.architecture.category}) | semantic=${r.semanticScore.toFixed(4)} | coverage=${r.requirementCoverage.toFixed(4)} | final=${r.finalScore.toFixed(4)}`)
      );
    }

    // Step 1.8: Perform Reference Analysis & Design Decision Grounding
    let referenceAnalysis = null;
    try {
      referenceAnalysis = analyzeReferences({ profile, ragResults: results });
      if (RAG_DEBUG && referenceAnalysis) {
        console.log("\n[RAG] GROUNDED DECISIONS (Supported by retrieved references):");
        if (referenceAnalysis.groundedDecisions.length === 0) {
          console.log("  (None — no retrieved references directly support the required patterns)");
        } else {
          referenceAnalysis.groundedDecisions.forEach(d => {
            console.log(`  - Decision:    ${d.decision}`);
            console.log(`    Requirement: ${d.requirement}`);
            console.log(`    Source Ref:  ${d.source_reference_name} [${d.source_reference_id}]\n`);
          });
        }

        console.log("[RAG] LLM-DERIVED DECISIONS (Model-derived without retrieved reference evidence):");
        if (referenceAnalysis.llmDerivedDecisions.length === 0) {
          console.log("  (None)");
        } else {
          referenceAnalysis.llmDerivedDecisions.forEach(d => {
            console.log(`  - Decision:    ${d.decision}`);
            console.log(`    Requirement: ${d.requirement}\n`);
          });
        }
      }
    } catch (e) {
      console.warn("[RAG] Reference analyzer failed — using raw retrieval results:", e.message);
    }


    return {
      results,
      profile,
      referenceAnalysis
    };
  } catch (err) {
    console.error("[RAG] Retrieval failed (pipeline will continue without RAG):", err.message);
    return null;
  }
}

module.exports = { initRag, ragRetrieve };


