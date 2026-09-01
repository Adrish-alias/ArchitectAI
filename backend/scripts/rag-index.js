#!/usr/bin/env node
/**
 * scripts/rag-index.js
 *
 * Phase 4 — npm run rag:index
 *
 * 1. Load 16 architecture records from JSONL
 * 2. Check if index is already current (content hash match)
 * 3. If stale or missing, generate embeddings and persist index
 * 4. Print summary
 *
 * Usage:
 *   npm run rag:index
 *   node scripts/rag-index.js
 */

// Load environment variables (not strictly needed for indexing, but keeps startup clean)
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { loadArchitectureRecords }                 = require("../src/rag/loader");
const { embedText, getEmbeddingDim, MODEL_NAME }  = require("../src/rag/embedder");
const { buildArchitectureEmbeddingText }           = require("../src/rag/document-builder");
const { loadIndex, saveIndex, buildIndex, isIndexCurrent, INDEX_PATH } = require("../src/rag/vector-store");

async function main() {
  console.log("\n┌──────────────────────────────────────┐");
  console.log("│           RAG INDEXER                │");
  console.log("└──────────────────────────────────────┘\n");

  // ── Load records ─────────────────────────────────────────────────────────
  let records;
  try {
    records = loadArchitectureRecords();
  } catch (e) {
    console.error("ERROR loading records:", e.message);
    process.exit(1);
  }
  console.log(`Records loaded:         ${records.length}`);

  // ── Staleness check ───────────────────────────────────────────────────────
  if (isIndexCurrent()) {
    const existing = loadIndex();
    console.log(`\nIndex is already current (hash matches).`);
    console.log(`Model:                  ${existing.model}`);
    console.log(`Embedding dimension:    ${existing.dim}`);
    console.log(`Entries:                ${existing.entries.length}`);
    console.log(`Created:                ${existing.createdAt}`);
    console.log(`Index path:             ${INDEX_PATH}`);
    console.log("\nNo re-indexing needed. Done.\n");
    return;
  }

  console.log(`Model:                  ${MODEL_NAME}`);
  console.log(`Embedding dimension:    ${getEmbeddingDim()}`);
  console.log(`\nGenerating embeddings...`);

  const startTime = Date.now();
  const embeddings = [];

  for (let i = 0; i < records.length; i++) {
    const rec  = records[i];
    const text = buildArchitectureEmbeddingText(rec);

    process.stdout.write(`  [${i + 1}/${records.length}] ${rec.name.substring(0, 55)}...`);

    try {
      const emb = await embedText(text);
      embeddings.push(emb);
      process.stdout.write(" ✓\n");
    } catch (e) {
      process.stdout.write(` ✗ FAILED: ${e.message}\n`);
      console.error("Aborting: could not generate embedding for record:", rec.id);
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Persist ───────────────────────────────────────────────────────────────
  const index = buildIndex(records, embeddings);
  saveIndex(index);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────");
  console.log(`Embeddings generated:   ${embeddings.length}`);
  console.log(`Embedding dimension:    ${index.dim}`);
  console.log(`Time elapsed:           ${elapsed}s`);
  console.log(`Index written:          ${INDEX_PATH}`);
  console.log("──────────────────────────────────────────\n");
}

main().catch(e => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
