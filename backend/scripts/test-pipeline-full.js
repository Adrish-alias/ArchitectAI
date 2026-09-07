/**
 * scripts/test-pipeline-full.js
 *
 * Full architecture-generation pipeline validation for ArchitectAI.
 * Runs the end-to-end pipeline with the configured LLM_PROVIDER.
 * Validates the exact output contract expected by the API and frontend.
 */

require("dotenv").config();
const { generateArchitecture } = require("../src/services/architecture.service");
const { getProviderInfo } = require("../src/services/llm/llm.service");

async function runPipelineTest() {
  const providerInfo = getProviderInfo();
  console.log("==================================================");
  console.log("ARCHITECT AI — FULL PIPELINE END-TO-END VERIFICATION");
  console.log(`Active Provider : ${providerInfo.provider}`);
  console.log(`Active Model    : ${providerInfo.model}`);
  console.log("==================================================\n");

  const testInput = {
    idea: "E-commerce platform with high traffic, user authentication, catalog search, and checkout processing",
    users: "50000",
    budget: "$1500/month",
    features: ["authentication", "product catalog", "search", "checkout", "order processing"]
  };

  const start = Date.now();

  try {
    const finalData = await generateArchitecture(testInput);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    console.log("\n==================================================");
    console.log(`PIPELINE COMPLETED SUCCESSFULLY in ${duration}s`);
    console.log("==================================================");

    // Validate Contract Fields
    const checks = [
      { name: "aws_services is non-empty array", pass: Array.isArray(finalData.aws_services) && finalData.aws_services.length > 0 },
      { name: "architecture_overview exists", pass: typeof finalData.architecture_overview === "object" && finalData.architecture_overview !== null },
      { name: "topology_edges is non-empty array", pass: Array.isArray(finalData.architecture_overview?.topology_edges) && finalData.architecture_overview.topology_edges.length > 0 },
      { name: "mermaid diagram exists and starts with graph", pass: typeof finalData.mermaid === "string" && finalData.mermaid.trim().startsWith("graph") },
      { name: "cost_breakdown exists", pass: typeof finalData.cost_breakdown === "object" && finalData.cost_breakdown !== null },
      { name: "implementation_steps exists", pass: Array.isArray(finalData.implementation_steps) },
      { name: "validation_status exists", pass: typeof finalData.validation_status === "string" }
    ];

    console.log("\nCONTRACT VERIFICATION:");
    let allPassed = true;
    for (const check of checks) {
      console.log(`  [${check.pass ? "PASS" : "FAIL"}] ${check.name}`);
      if (!check.pass) allPassed = false;
    }

    console.log("\nPIPELINE METRICS & SUMMARY:");
    console.log(`  - Total AWS Services : ${finalData.aws_services.length} (${finalData.aws_services.map(s => s.name).join(", ")})`);
    console.log(`  - Topology Edges     : ${finalData.architecture_overview.topology_edges.length}`);
    console.log(`  - Monthly Cost Est   : ${finalData.cost_breakdown.monthly_estimate || "N/A"}`);
    console.log(`  - Validation Status  : ${finalData.validation_status}`);
    console.log(`  - Mermaid Lines      : ${finalData.mermaid.split("\n").length}`);
    if (finalData.pricing) {
      console.log(`  - Pricing Status     : ${finalData.pricing.status}`);
      if (finalData.pricing.status === "success") {
        console.log(`  - Deterministic Cost : $${finalData.pricing.cost_breakdown?.total_monthly_cost_usd}/month`);
        console.log(`  - Sized Services     : ${finalData.pricing.configs?.length}`);
      }
    }

    // Simulated API response wrapper
    const apiResponse = { success: true, architecture: finalData };
    console.log(`\nAPI Response Success Field : ${apiResponse.success}`);

    if (allPassed) {
      console.log("\n>>> ALL CONTRACT CHECKS PASSED <<<");
      process.exitCode = 0;
    } else {
      console.error("\n>>> SOME CONTRACT CHECKS FAILED <<<");
      process.exitCode = 1;
    }
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.error(`\nPIPELINE FAILED after ${duration}s:`, err.message);
    if (err.rawOutput) {
      console.error("Raw LLM Output was:\n", err.rawOutput);
    }
    process.exitCode = 1;
  }
}

runPipelineTest();
