/**
 * scripts/diagnose-step3.js
 *
 * Diagnostic script to isolate the exact Step 3 LLM response from Groq (openai/gpt-oss-120b).
 * Captures raw output, character length, token length, finish_reason, JSON parse error,
 * and first/last 500 chars without modifying the pipeline.
 */

require("dotenv").config();
const { getActiveProvider } = require("../src/services/llm/llm.service");
const { buildClassificationSystemPrompt, buildClassificationUserPrompt } = require("../src/prompts/generation/classification.prompt");
const { buildServiceSelectionSystemPrompt, buildServiceSelectionUserPrompt } = require("../src/prompts/generation/service-selection.prompt");
const { buildArchitectureJsonSystemPrompt, buildArchitectureJsonUserPrompt } = require("../src/prompts/generation/architecture-json.prompt");
const { safeParse, attemptJsonRecovery } = require("../src/services/json.service");
const { ragRetrieve } = require("../src/rag/rag-service");
const { RAG_ENABLED } = require("../src/config/env");

async function diagnose() {
  const provider = getActiveProvider();
  console.log("==================================================");
  console.log("STEP 3 DIAGNOSTIC INVESTIGATION");
  console.log(`Provider : ${provider.name}`);
  console.log(`Model    : ${provider.model}`);
  console.log("==================================================\n");

  const testInput = {
    idea: "Build a multi-tenant SaaS platform for 100000 users. Each customer should have isolated data, with authentication, automatic scaling, high availability, and a web-based dashboard.",
    users: "100000",
    budget: "$3,000/month",
    features: ["authentication", "multi-tenant isolation", "web dashboard", "automatic scaling", "high availability"]
  };

  console.log("--- Executing Step 1 (Classification) ---");
  const step1System = buildClassificationSystemPrompt();
  const step1User   = buildClassificationUserPrompt(testInput);
  const analysis = await provider.generateText({ systemPrompt: step1System, userPrompt: step1User, maxTokens: 300 });
  console.log(`Step 1 Complete (Length: ${analysis.length} chars)`);

  let ragResults = null;
  if (RAG_ENABLED) {
    console.log("--- Executing RAG Retrieval ---");
    ragResults = await ragRetrieve({
      idea: testInput.idea,
      users: testInput.users,
      budget: testInput.budget,
      features: testInput.features,
      classificationText: analysis
    });
    console.log("RAG Retrieval Complete");
  }

  console.log("--- Executing Step 2 (Service Selection) ---");
  const step2System = buildServiceSelectionSystemPrompt();
  const step2User   = buildServiceSelectionUserPrompt({ analysis, idea: testInput.idea, features: testInput.features, users: testInput.users, budget: testInput.budget, ragResults });
  const serviceStack = await provider.generateText({ systemPrompt: step2System, userPrompt: step2User, maxTokens: 1500 });
  console.log(`Step 2 Complete (Length: ${serviceStack.length} chars)`);

  console.log("\n--- Executing Step 3 with Raw API Metadata Capture ---");
  const step3System = buildArchitectureJsonSystemPrompt();
  const step3User   = buildArchitectureJsonUserPrompt({ analysis, serviceStack, idea: testInput.idea, users: testInput.users, budget: testInput.budget });

  // Call raw Groq client directly if available to get completion metadata (finish_reason, usage)
  let rawResponseText = "";
  let finishReason = "unknown";
  let promptTokens = null;
  let completionTokens = null;
  let totalTokens = null;

  if (provider.client && provider.client.chat && provider.client.chat.completions) {
    const rawCompletion = await provider.client.chat.completions.create({
      model: provider.model,
      messages: [
        { role: "system", content: step3System },
        { role: "user", content: step3User }
      ],
      temperature: 0.1,
      max_tokens: 3500
    });
    const choice = rawCompletion.choices?.[0];
    rawResponseText = choice?.message?.content || "";
    finishReason = choice?.finish_reason || "unknown";
    promptTokens = rawCompletion.usage?.prompt_tokens;
    completionTokens = rawCompletion.usage?.completion_tokens;
    totalTokens = rawCompletion.usage?.total_tokens;
  } else {
    rawResponseText = await provider.generateText({
      systemPrompt: step3System,
      userPrompt: step3User,
      temperature: 0.1,
      maxTokens: 3500
    });
  }

  console.log("\n==================================================");
  console.log("RAW STEP 3 LLM RESPONSE METRICS");
  console.log("==================================================");
  console.log(`Character Length : ${rawResponseText.length}`);
  console.log(`Prompt Tokens    : ${promptTokens ?? "N/A"}`);
  console.log(`Completion Tokens: ${completionTokens ?? "N/A"}`);
  console.log(`Total Tokens     : ${totalTokens ?? "N/A"}`);
  console.log(`Finish Reason    : ${finishReason}`);
  console.log(`Max Tokens Limit : 3500`);

  const isTruncatedByTokens = finishReason === "length" || (completionTokens && completionTokens >= 3500);
  console.log(`Truncated by Max Tokens? : ${isTruncatedByTokens ? "YES" : "NO"}`);

  console.log("\n==================================================");
  console.log("FIRST 500 CHARACTERS:");
  console.log("==================================================");
  console.log(rawResponseText.slice(0, 500));

  console.log("\n==================================================");
  console.log("LAST 500 CHARACTERS:");
  console.log("==================================================");
  console.log(rawResponseText.slice(-500));

  console.log("\n==================================================");
  console.log("PARSER & RECOVERY DIAGNOSIS");
  console.log("==================================================");

  // 1. Direct JSON.parse
  let directParseErr = null;
  try {
    JSON.parse(rawResponseText);
    console.log("1. Direct JSON.parse: SUCCESS");
  } catch (err) {
    directParseErr = err;
    console.log(`1. Direct JSON.parse: FAILED`);
    console.log(`   Error: ${err.message}`);
  }

  // 2. safeParse
  const safeParsed = safeParse(rawResponseText);
  console.log(`2. safeParse(): ${safeParsed ? "SUCCESS" : "FAILED"}`);

  // 3. attemptJsonRecovery
  let recoveryErr = null;
  const recovered = attemptJsonRecovery(rawResponseText);
  console.log(`3. attemptJsonRecovery(): ${recovered ? "SUCCESS" : "FAILED"}`);

  // If recovery failed, diagnose why
  if (!safeParsed && !recovered) {
    const start = rawResponseText.indexOf("{");
    console.log(`\nDiagnostic details on failure:`);
    console.log(`- Index of first '{': ${start}`);
    const lastBrace = rawResponseText.lastIndexOf("}");
    console.log(`- Index of last '}': ${lastBrace}`);

    if (start !== -1) {
      let candidate = rawResponseText.slice(start);
      // Attempt manual parse to get exact error and position
      try {
        JSON.parse(candidate);
      } catch (e) {
        console.log(`- Parse error on candidate from first '{': ${e.message}`);
        // Extract position if available
        const posMatch = e.message.match(/position\s+(\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          console.log(`- Error context around position ${pos}:`);
          const contextStart = Math.max(0, pos - 80);
          const contextEnd = Math.min(candidate.length, pos + 80);
          console.log(`  "...${candidate.slice(contextStart, contextEnd)}..."`);
          console.log(`       ${" ".repeat(Math.min(pos - contextStart, 80))}^ [ERROR HERE]`);
        }
      }
    }
  }

  console.log("\n==================================================");
  console.log("DIAGNOSTIC RUN COMPLETE");
  console.log("==================================================");
}

diagnose().catch(err => {
  console.error("DIAGNOSTIC SCRIPT ERROR:", err);
});
