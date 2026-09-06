/**
 * Script to test the active LLM provider configured in backend/.env.
 *
 * Usage:
 *   node scripts/test-llm-provider.js
 *
 * Exits with 0 on success, 1 on failure.
 * Never logs credentials, secrets, or bearer tokens.
 */

require("dotenv").config();
const {
  getActiveProvider,
  validateProviderConfig,
  getProviderInfo
} = require("../src/services/llm/llm.service");

async function main() {
  console.log("==================================================");
  console.log("ARCHITECT AI — LLM PROVIDER TEST");
  console.log("==================================================");

  // 1. Validate configuration
  try {
    validateProviderConfig();
  } catch (valErr) {
    console.error("Configuration Validation FAILED:");
    console.error(`  ${valErr.message}`);
    process.exit(1);
  }

  // 2. Identify provider and model
  const info = getProviderInfo();
  console.log(`Selected Provider : ${info.provider}`);
  console.log(`Selected Model    : ${info.model}`);
  console.log("--------------------------------------------------");

  // 3. Make minimal test request
  const provider = getActiveProvider();
  const testSystemPrompt = "You are a cloud architecture assistant.";
  const testUserPrompt = "Respond with exactly the text: HELLO_ARCHITECT_AI";

  console.log("Sending test prompt...");
  const startTime = Date.now();

  try {
    let resultText = "";
    let latencyMs = 0;
    let tokenUsage = null;

    if (typeof provider.generateWithMetadata === "function") {
      const result = await provider.generateWithMetadata({
        systemPrompt: testSystemPrompt,
        userPrompt: testUserPrompt,
        temperature: 0.1,
        maxTokens: 200
      });
      resultText = result.text;
      latencyMs = result.latencyMs;
      tokenUsage = result.tokenUsage;
    } else {
      resultText = await provider.generateText({
        systemPrompt: testSystemPrompt,
        userPrompt: testUserPrompt,
        temperature: 0.1,
        maxTokens: 200
      });
      latencyMs = Date.now() - startTime;
    }

    console.log("--------------------------------------------------");
    console.log("STATUS: SUCCESS");
    console.log(`Latency: ${latencyMs} ms`);
    if (tokenUsage && (tokenUsage.promptTokens || tokenUsage.totalTokens)) {
      console.log(`Token Usage: Prompt=${tokenUsage.promptTokens ?? "N/A"}, Completion=${tokenUsage.completionTokens ?? "N/A"}, Total=${tokenUsage.totalTokens ?? "N/A"}`);
    }
    console.log(`Response: "${resultText}"`);
    console.log("==================================================");
    process.exitCode = 0;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error("--------------------------------------------------");
    console.error("STATUS: FAILED");
    console.error(`Latency before error: ${elapsed} ms`);
    console.error(`Error Type: ${err.name || "Error"}`);
    console.error(`Status Code: ${err.statusCode || err.status || "N/A"}`);
    console.error(`Error Message: ${err.message}`);
    console.log("==================================================");
    process.exitCode = 1;
  }
}

main();
