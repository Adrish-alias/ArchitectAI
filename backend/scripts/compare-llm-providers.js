/**
 * Script to compare responses between Bedrock and Groq providers for a given prompt.
 *
 * Usage:
 *   node scripts/compare-llm-providers.js [optional prompt]
 */

require("dotenv").config();
const { BedrockProvider } = require("../src/services/llm/providers/bedrock.provider");
const { GroqProvider } = require("../src/services/llm/providers/groq.provider");
const { AWS_BEARER_TOKEN_BEDROCK, GROQ_API_KEY } = require("../src/config/env");

async function main() {
  console.log("==================================================");
  console.log("ARCHITECT AI — PROVIDER COMPARISON");
  console.log("==================================================");

  const testSystem = "You are a senior AWS Solutions Architect.";
  const testUser = process.argv[2] || "Suggest 3 AWS services for a real-time multiplayer gaming backend and give 1 sentence reason for each.";

  console.log(`Prompt: "${testUser}"\n`);

  // Bedrock test
  console.log("--- Testing Bedrock ---");
  if (!AWS_BEARER_TOKEN_BEDROCK) {
    console.log("Bedrock skipped: AWS_BEARER_TOKEN_BEDROCK is not set.");
  } else {
    try {
      const bedrock = new BedrockProvider();
      const start = Date.now();
      const res = await bedrock.generateWithMetadata({
        systemPrompt: testSystem,
        userPrompt: testUser,
        temperature: 0.1,
        maxTokens: 500
      });
      console.log(`Model: ${bedrock.model}`);
      console.log(`Latency: ${res.latencyMs} ms`);
      console.log("Response:\n" + res.text + "\n");
    } catch (err) {
      console.error(`Bedrock failed: ${err.message}\n`);
    }
  }

  // Groq test
  console.log("--- Testing Groq ---");
  if (!GROQ_API_KEY) {
    console.log("Groq skipped: GROQ_API_KEY is not set.");
  } else {
    try {
      const groq = new GroqProvider();
      const start = Date.now();
      const res = await groq.generateWithMetadata({
        systemPrompt: testSystem,
        userPrompt: testUser,
        temperature: 0.1,
        maxTokens: 500
      });
      console.log(`Model: ${groq.model}`);
      console.log(`Latency: ${res.latencyMs} ms`);
      console.log("Response:\n" + res.text + "\n");
    } catch (err) {
      console.error(`Groq failed: ${err.message}\n`);
    }
  }

  console.log("==================================================");
}

main();
