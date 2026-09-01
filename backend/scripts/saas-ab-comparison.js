/**
 * scripts/saas-ab-comparison.js
 *
 * Runs the SaaS A/B evaluation test: RAG OFF vs RAG ON.
 *
 * Test Query:
 * "Build a multi-tenant SaaS platform for 100000 users. Each customer should have isolated data, with authentication, automatic scaling, high availability, and a web-based dashboard."
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { generateArchitecture } = require("../src/services/architecture.service");

const TEST_INPUT = {
  idea: "Build a multi-tenant SaaS platform for 100000 users. Each customer should have isolated data, with authentication, automatic scaling, high availability, and a web-based dashboard.",
  users: "100000",
  budget: "medium",
  features: ["authentication", "multi-tenant isolation", "web dashboard", "automatic scaling", "high availability"],
  tier: "balanced"
};

async function main() {
  console.log("\n==================================================");
  console.log("          SaaS RAG A/B COMPARISON TEST            ");
  console.log("==================================================\n");

  console.log("RUN 1: RAG OFF (Baseline)");
  process.env.RAG_ENABLED = "false";
  // Reload env module to reflect change
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/services/architecture.service")];

  const { generateArchitecture: genArchOff } = require("../src/services/architecture.service");

  let resOff;
  try {
    resOff = await genArchOff(TEST_INPUT);
    console.log("\n--- RAG OFF RESULT ---");
    console.log("Services:", resOff.aws_services.map(s => `${s.name} (${s.role})`));
    console.log("Mermaid:\n", resOff.mermaid);
  } catch (e) {
    console.error("RAG OFF error:", e);
  }

  console.log("\n==================================================");
  console.log("RUN 2: RAG ON (Grounded with Reference Analysis)");
  process.env.RAG_ENABLED = "true";
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/services/architecture.service")];

  const { generateArchitecture: genArchOn } = require("../src/services/architecture.service");

  let resOn;
  try {
    resOn = await genArchOn(TEST_INPUT);
    console.log("\n--- RAG ON RESULT ---");
    console.log("Services:", resOn.aws_services.map(s => `${s.name} (${s.role})`));
    console.log("Mermaid:\n", resOn.mermaid);
  } catch (e) {
    console.error("RAG ON error:", e);
  }
}

main().catch(console.error);
