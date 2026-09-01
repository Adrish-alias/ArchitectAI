#!/usr/bin/env node
/**
 * scripts/rag-test.js
 *
 * Phase 8 — npm run rag:test
 *
 * Tests RAG retrieval WITHOUT calling Llama or Gemini.
 * Uses a simulated Step 1 classification (does not hit Bedrock).
 *
 * Usage:
 *   npm run rag:test -- "food delivery app for 50000 users"
 *   node scripts/rag-test.js "multi tenant SaaS platform"
 *
 * The query string becomes the "idea". A generic growth-scale classification
 * is synthesised so you can test retrieval without full pipeline access.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { loadArchitectureRecords }       = require("../src/rag/loader");
const { retrieveArchitectures, attachRecords } = require("../src/rag/retrieval");
const { buildRetrievalQuery }           = require("../src/rag/query-builder");
const { loadIndex }                     = require("../src/rag/vector-store");

async function main() {
  const rawQuery = process.argv.slice(2).join(" ").trim();

  if (!rawQuery) {
    console.error('Usage: npm run rag:test -- "your query here"');
    process.exit(1);
  }

  // ── Load index ────────────────────────────────────────────────────────────
  const index = loadIndex();
  if (!index) {
    console.error("Vector index not found. Run: npm run rag:index");
    process.exit(1);
  }

  // ── Load records and attach ───────────────────────────────────────────────
  let records;
  try {
    records = loadArchitectureRecords();
  } catch (e) {
    console.error("Failed to load records:", e.message);
    process.exit(1);
  }
  attachRecords(records);

  // ── Synthesise a realistic classification for testing ─────────────────────
  // We detect keywords from the query to produce a plausible classification.
  const q = rawQuery.toLowerCase();
  const scale      = q.includes("million") ? "large_scale"
                   : q.includes("global")  ? "large_scale"
                   : q.includes("50000") || q.includes("50k") ? "growth"
                   : "growth";
  const realtime   = (q.includes("live") || q.includes("real-time") || q.includes("tracking") || q.includes("chat")) ? "high" : "none";
  const compute    = (q.includes("image") || q.includes("video") || q.includes("process") || q.includes("ml")) ? "high" : "medium";
  const data       = (q.includes("analytics") || q.includes("search") || q.includes("catalog")) ? "high" : "medium";

  const syntheticClassification = `SCALE: ${scale}\nCOMPUTE_INTENSITY: ${compute}\nDATA_COMPLEXITY: ${data}\nREALTIME_NEEDS: ${realtime}`;

  // ── Build retrieval query ──────────────────────────────────────────────────
  const retrievalQuery = buildRetrievalQuery({
    idea:               rawQuery,
    users:              "unspecified",
    features:           [],
    classificationText: syntheticClassification
  });

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│              RAG TEST                    │");
  console.log("└──────────────────────────────────────────┘");
  console.log("\nRAW INPUT:");
  console.log(" ", rawQuery);
  console.log("\nSYNTHETIC CLASSIFICATION:");
  console.log(syntheticClassification.split("\n").map(l => "  " + l).join("\n"));
  console.log("\nRAG QUERY:");
  console.log(" ", retrievalQuery);

  // ── Retrieve ───────────────────────────────────────────────────────────────
  let results;
  try {
    results = await retrieveArchitectures(retrievalQuery, { topK: 3, debug: false });
  } catch (e) {
    console.error("\nRetrieval failed:", e.message);
    process.exit(1);
  }

  // ── Print results ──────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────");
  console.log("RESULTS");
  console.log("─────────────────────────────────────────────");

  results.forEach((r, i) => {
    const arch = r.architecture;
    const services = (arch.services || []).map(s => s.name).join(", ");

    console.log(`\n${i + 1}. ${arch.name}`);
    console.log(`   id:             ${arch.id}`);
    console.log(`   category:       ${arch.category}`);
    console.log(`   semantic score: ${r.semanticScore.toFixed(4)}`);
    console.log(`   final score:    ${r.finalScore.toFixed(4)}`);
    console.log(`   services:       ${services}`);
    console.log(`   requirements:   ${(arch.requirements_signals || []).join(", ")}`);
  });

  console.log("\n─────────────────────────────────────────────\n");
}

main().catch(e => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
