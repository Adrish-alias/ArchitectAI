/**
 * src/rag/embedder.js
 *
 * Phase 2 — Embedding Model (isolated interface)
 *
 * Uses @xenova/transformers with the all-MiniLM-L6-v2 sentence embedding model.
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2
 * - Pure JavaScript / WASM — zero native dependencies
 * - 384-dimensional vectors
 * - ~23MB model size (auto-downloaded to ~/.cache/huggingface/hub/ on first run)
 * - Widely used, well-validated for semantic similarity tasks
 * - No API key or internet dependency after first download
 *
 * Model weights are downloaded to the user's HuggingFace cache:
 *   Windows: C:\Users\<user>\.cache\huggingface\hub\
 *   Linux:   ~/.cache/huggingface/hub/
 *
 * These weights should NOT be committed to Git — they are user-level cache,
 * not inside the project directory, so no .gitignore entry is needed.
 *
 * The public interface is:
 *   embedText(text: string) → Promise<number[]>
 *
 * Swap the implementation here to change embedding provider without touching
 * retrieval or indexing code.
 */

const { pipeline, env } = require("@xenova/transformers");

// Suppress verbose progress bars in production (still allows error output)
env.useBrowserCache  = false;
env.allowLocalModels = false;

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

/** @type {import("@xenova/transformers").FeatureExtractionPipeline | null} */
let _pipe = null;

/**
 * Lazy-initialise the embedding pipeline (downloads model on first call).
 * Subsequent calls reuse the cached pipeline instance.
 */
async function getEmbeddingPipeline() {
  if (!_pipe) {
    _pipe = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true   // ~6MB quantized ONNX — faster cold start, near-identical quality
    });
  }
  return _pipe;
}

/**
 * Embed a text string into a dense float32 vector.
 *
 * Uses mean-pooling over token embeddings (standard for sentence-transformers).
 *
 * @param {string} text  The text to embed
 * @returns {Promise<number[]>} 384-dimensional embedding vector
 */
async function embedText(text) {
  const pipe   = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  // output.data is a Float32Array; convert to plain number array for JSON serialization
  return Array.from(output.data);
}

/**
 * Return the embedding dimension (384 for all-MiniLM-L6-v2).
 * @returns {number}
 */
function getEmbeddingDim() {
  return 384;
}

module.exports = { embedText, getEmbeddingDim, MODEL_NAME };
