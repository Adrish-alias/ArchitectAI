#!/usr/bin/env node
/**
 * scripts/rag-test.js
 *
 * Phase 8 — npm run rag:test
 *
 * Standalone test script for RAG retrieval with Architecture Requirement Profiles.
 *
 * Usage:
 *   npm run rag:test -- "Food delivery app for 50000 users with restaurant catalog, payments, orders and live driver tracking"
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { loadArchitectureRecords }               = require("../src/rag/loader");
const { retrieveArchitectures, attachRecords } = require("../src/rag/retrieval");
const { buildRetrievalQuery }                   = require("../src/rag/query-builder");
const { loadIndex }                             = require("../src/rag/vector-store");
const { buildFallbackProfile }                  = require("../src/rag/requirement-analyzer");

async function main() {
  const rawQuery = process.argv.slice(2).join(" ").trim();

  if (!rawQuery) {
    console.error('Usage: npm run rag:test -- "your query here"');
    process.exit(1);
  }

  const index = loadIndex();
  if (!index) {
    console.error("Vector index not found. Run: npm run rag:index");
    process.exit(1);
  }

  let records;
  try {
    records = loadArchitectureRecords();
  } catch (e) {
    console.error("Failed to load records:", e.message);
    process.exit(1);
  }
  attachRecords(records);

  const q = rawQuery.toLowerCase();
  const scale      = q.includes("million") ? "large_scale" : q.includes("50000") || q.includes("50k") ? "growth" : "growth";
  const realtime   = (q.includes("live") || q.includes("real-time") || q.includes("tracking") || q.includes("chat")) ? "high" : "none";
  const compute    = (q.includes("image") || q.includes("video") || q.includes("process") || q.includes("ml")) ? "high" : "medium";
  const data       = (q.includes("analytics") || q.includes("search") || q.includes("catalog")) ? "high" : "medium";

  const syntheticClassification = `SCALE: ${scale}\nCOMPUTE_INTENSITY: ${compute}\nDATA_COMPLEXITY: ${data}\nREALTIME_NEEDS: ${realtime}`;

  // Build Profile
  const profile = buildFallbackProfile({
    idea: rawQuery,
    users: "unspecified",
    features: [],
    classificationText: syntheticClassification
  });

  // Build Retrieval Query
  const retrievalQuery = buildRetrievalQuery({
    idea: rawQuery,
    users: "unspecified",
    features: [],
    classificationText: syntheticClassification,
    profile
  });

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│         RAG REQUIREMENT PROFILE TEST     │");
  console.log("└──────────────────────────────────────────┘");
  console.log("\nRAW INPUT:\n ", rawQuery);
  console.log("\nREQUIREMENT PROFILE:");
  console.log(JSON.stringify(profile, null, 2).split("\n").map(l => "  " + l).join("\n"));
  console.log("\nGENERATED RAG QUERY:\n ", retrievalQuery);

  let results;
  try {
    results = await retrieveArchitectures(retrievalQuery, { topK: 5, debug: false, profile });
  } catch (e) {
    console.error("\nRetrieval failed:", e.message);
    process.exit(1);
  }

  console.log("\n─────────────────────────────────────────────");
  console.log("TOP RETRIEVED ARCHITECTURE CANDIDATES");
  console.log("─────────────────────────────────────────────");

  results.forEach((r, i) => {
    const arch = r.architecture;
    const services = (arch.services || []).map(s => s.name).join(", ");

    console.log(`\n${i + 1}. ${arch.name}`);
    console.log(`   id:                   ${arch.id}`);
    console.log(`   category:             ${arch.category}`);
    console.log(`   semantic score:       ${r.semanticScore.toFixed(4)}`);
    console.log(`   requirement coverage: ${r.requirementCoverage.toFixed(4)}`);
    console.log(`   category score:       ${r.categoryScore.toFixed(4)}`);
    console.log(`   final composite score:${r.finalScore.toFixed(4)}`);
    console.log(`   services:             ${services}`);
  });

  console.log("\n─────────────────────────────────────────────\n");
}

main().catch(e => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
