/**
 * scripts/test-groq-mock-pipeline.js
 *
 * Simulates Groq provider execution through the full architecture pipeline
 * to verify contract traversal when GROQ_API_KEY is simulated/mocked.
 */

require("dotenv").config();
const { GroqProvider } = require("../src/services/llm/providers/groq.provider");
const { generateArchitecture } = require("../src/services/architecture.service");

// Set env
const env = require("../src/config/env");
env.LLM_PROVIDER = "groq";
env.GROQ_API_KEY = "gsk_test_mock_key";

// Store original generateText
const originalGenerateText = GroqProvider.prototype.generateText;

let stepCounter = 0;
// Mock responses matching Groq plain text return
GroqProvider.prototype.generateText = async function({ systemPrompt, userPrompt, maxTokens }) {
  stepCounter++;
  console.log(`[Groq Mock Call #${stepCounter}] Generating with model: ${this.model}, maxTokens: ${maxTokens}`);

  if (maxTokens === 300) {
    // Step 1: Classification
    return `SCALE: growth
COMPUTE_INTENSITY: medium
DATA_COMPLEXITY: medium
REALTIME_NEEDS: none
KEY_CHALLENGES: High traffic handling, secure auth, catalog search performance
RECOMMENDED_TIER: balanced`;
  }

  if (maxTokens === 1500) {
    // Step 2: Service Selection
    return `## Architecture Topology
- [Amazon CloudFront] -> [Amazon API Gateway]: routes edge requests
- [Amazon API Gateway] -> [AWS Lambda]: invokes serverless compute
- [AWS Lambda] -> [Amazon DynamoDB]: persists and queries data

## Selected AWS Services
SERVICE: Amazon CloudFront
ROLE: CDN
JUSTIFICATION: Caches static content.
DATA_FLOW: Client -> CloudFront -> API Gateway

SERVICE: Amazon API Gateway
ROLE: API Management
JUSTIFICATION: Entry point.
DATA_FLOW: CloudFront -> API Gateway -> Lambda

SERVICE: AWS Lambda
ROLE: Serverless compute
JUSTIFICATION: Handles business logic.
DATA_FLOW: API Gateway -> Lambda -> DynamoDB

SERVICE: Amazon DynamoDB
ROLE: Database
JUSTIFICATION: Low-latency storage.
DATA_FLOW: Lambda -> DynamoDB`;
  }

  if (maxTokens === 3500) {
    // Step 3: Architecture JSON
    return JSON.stringify({
      aws_services: [
        { name: "Amazon CloudFront", category: "CDN", role: "Content delivery", justification: "Edge caching", estimated_monthly_cost: "$50" },
        { name: "Amazon API Gateway", category: "Networking", role: "API Gateway", justification: "REST endpoints", estimated_monthly_cost: "$35" },
        { name: "AWS Lambda", category: "Compute", role: "Compute", justification: "Business logic", estimated_monthly_cost: "$40" },
        { name: "Amazon DynamoDB", category: "Database", role: "Primary DB", justification: "NoSQL store", estimated_monthly_cost: "$75" }
      ],
      architecture_overview: {
        pattern: "Serverless",
        description: "Standard serverless e-commerce architecture",
        topology_edges: [
          { from: "Amazon CloudFront", to: "Amazon API Gateway", relationship: "routes edge requests" },
          { from: "Amazon API Gateway", to: "AWS Lambda", relationship: "invokes compute" },
          { from: "AWS Lambda", to: "Amazon DynamoDB", relationship: "persists data" }
        ]
      },
      cost_breakdown: {
        monthly_estimate: "$200/month",
        per_service: { "Amazon CloudFront": "$50", "Amazon API Gateway": "$35", "AWS Lambda": "$40", "Amazon DynamoDB": "$75" }
      },
      implementation_steps: [
        "1. Create DynamoDB tables",
        "2. Deploy Lambda functions",
        "3. Configure API Gateway and CloudFront"
      ]
    });
  }

  if (maxTokens === 1200) {
    // Step 4: Mermaid
    return `graph TD
  CloudFront["Amazon CloudFront"] --> APIGateway["Amazon API Gateway"]
  APIGateway --> Lambda["AWS Lambda"]
  Lambda --> DynamoDB["Amazon DynamoDB"]`;
  }

  // Fallback
  return "OK";
};

async function testGroqPipeline() {
  console.log("==================================================");
  console.log("GROQ PROVIDER — PIPELINE CONTRACT SIMULATION TEST");
  console.log("==================================================");

  try {
    const finalData = await generateArchitecture({
      idea: "Serverless e-commerce web application",
      users: "10000",
      budget: "$500/month",
      features: ["catalog", "cart", "checkout"]
    });

    console.log("\n==================================================");
    console.log("GROQ PIPELINE SUCCESS");
    console.log("==================================================");
    console.log(`Services: ${finalData.aws_services.map(s => s.name).join(", ")}`);
    console.log(`Topology edges: ${finalData.architecture_overview.topology_edges.length}`);
    console.log(`Validation status: ${finalData.validation_status}`);
    console.log(`Mermaid:\n${finalData.mermaid}`);

    const apiResponse = { success: true, architecture: finalData };
    console.log(`\nAPI Response Success: ${apiResponse.success}`);
    console.log(">>> GROQ PIPELINE OUTPUT CONTRACT VERIFIED <<<");
  } catch (err) {
    console.error("GROQ PIPELINE FAILED:", err);
    process.exitCode = 1;
  } finally {
    // Restore
    GroqProvider.prototype.generateText = originalGenerateText;
  }
}

testGroqPipeline();
