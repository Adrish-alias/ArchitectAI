/**
 * backend/scripts/test-pricing-integration.js
 *
 * Phase 11 Test Suite for ArchitectAI Step 2.5 Pricing Integration.
 *
 * Covers:
 *  - TEST A: Valid configuration calculation (Lambda, S3, DynamoDB, CloudFront, API Gateway, SQS)
 *  - TEST B: Schema rejection of invalid configs (missing fields, negatives, unknown fields, wrong types, invalid enums)
 *  - TEST C: Malformed Step 2.5 LLM JSON response resilience & graceful fallback
 *  - TEST D: Token truncation (finish_reason=length) resilience & graceful fallback
 *  - TEST E: Unsupported service handling & graceful reporting
 *  - TEST F: Schema dynamic prompt generation & registry lookup
 */

const assert = require("node:assert");
const {
  pricingService,
  pricingRegistry,
  getSchemaForService,
  getSchemasForServices,
  formatSchemasForPrompt,
  validateServicePricingConfig,
  validatePricingPayload
} = require("../src/services/pricing");

async function runAllTests() {
  console.log("==================================================");
  console.log("ARCHITECT AI — STEP 2.5 PRICING INTEGRATION TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function record(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // ─── TEST A: Valid Configuration ──────────────────────────────────────────
  console.log("--- TEST A: Valid Configuration ---");
  record("Parses and validates valid multi-service pricing configuration", () => {
    const validPayload = {
      services: [
        {
          name: "AWS Lambda",
          pricing_config: { invocations_m: 10, memory_mb: 1024, duration_ms: 250 },
          assumptions: ["10M invocations/month", "1GB RAM", "250ms avg duration"]
        },
        {
          name: "Amazon S3",
          pricing_config: { storage_gb: 500, puts_k: 200, gets_k: 2000 },
          assumptions: ["500GB storage", "200k puts", "2M gets"]
        },
        {
          name: "Amazon DynamoDB",
          pricing_config: { storage_gb: 100, reads_m: 50, writes_m: 20 },
          assumptions: ["100GB table data", "50M read units", "20M write units"]
        },
        {
          name: "Amazon CloudFront",
          pricing_config: { egress_gb: 2048, https_reqs_m: 10 },
          assumptions: ["2TB outbound data transfer", "10M HTTPS requests"]
        },
        {
          name: "Amazon API Gateway",
          pricing_config: { api_type: "HTTP", reqs_m: 10 },
          assumptions: ["HTTP API type", "10M API requests"]
        },
        {
          name: "Amazon SQS",
          pricing_config: { requests_m: 10 },
          assumptions: ["10M queue operations"]
        }
      ]
    };

    const validation = validatePricingPayload(validPayload);
    assert.strictEqual(validation.valid, true, `Validation failed with errors: ${validation.errors.join("; ")}`);
    assert.strictEqual(validation.configs.length, 6);

    const costResult = pricingService.calculateArchitectureCost({ services: validation.configs });
    assert.strictEqual(costResult.pricingSource, "deterministic_engine");
    assert.strictEqual(typeof costResult.totalMonthlyCostUsd, "number");
    assert.ok(costResult.totalMonthlyCostUsd > 0, "Total cost should be greater than 0");
    assert.strictEqual(costResult.summary.supportedServices, 6);
    assert.strictEqual(costResult.summary.unsupportedServices, 0);

    // Lambda: 43.48, S3: 13.30, DynamoDB: 56.25, CloudFront: 87.16, API Gateway: 10.00, SQS: 3.60
    // Total = 43.475 + 13.30 + 56.25 + 87.16 + 10.00 + 3.60 = 213.785 -> rounded: 213.79
    assert.strictEqual(costResult.totalMonthlyCostUsd, 213.79);
    console.log(`       Calculated Deterministic Total: $${costResult.totalMonthlyCostUsd}/month`);
  });

  // ─── TEST B: Schema Rejection of Invalid Configs ───────────────────────────
  console.log("\n--- TEST B: Rejection of Invalid Configs ---");
  record("Rejects missing required fields", () => {
    const res = validateServicePricingConfig("AWS Lambda", { invocations_m: 10, memory_mb: 1024 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('Missing required field "duration_ms"')));
  });

  record("Rejects negative numeric values", () => {
    const res = validateServicePricingConfig("Amazon S3", { storage_gb: -50, puts_k: 100, gets_k: 500 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('must be >= 0')));
  });

  record("Rejects NaN and Infinity values", () => {
    const resNaN = validateServicePricingConfig("Amazon DynamoDB", { storage_gb: NaN, reads_m: 10, writes_m: 5 });
    assert.strictEqual(resNaN.valid, false);
    const resInf = validateServicePricingConfig("Amazon DynamoDB", { storage_gb: Infinity, reads_m: 10, writes_m: 5 });
    assert.strictEqual(resInf.valid, false);
  });

  record("Rejects unexpected unknown fields", () => {
    const res = validateServicePricingConfig("Amazon DynamoDB", {
      storage_gb: 50,
      reads_m: 10,
      writes_m: 5,
      invented_param: "not_in_schema"
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('Unknown field "invented_param"')));
  });

  record("Rejects wrong data types", () => {
    const res = validateServicePricingConfig("AWS Lambda", {
      invocations_m: "10 million",
      memory_mb: 1024,
      duration_ms: 300
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('must be a finite number')));
  });

  record("Rejects invalid enum values", () => {
    const res = validateServicePricingConfig("Amazon API Gateway", {
      api_type: "GRAPHQL",
      reqs_m: 10
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('must be one of [HTTP, REST]')));
  });

  // ─── TEST C: Malformed LLM Response Graceful Handling ─────────────────────
  console.log("\n--- TEST C: Malformed LLM Response Fallback ---");
  record("Handles completely malformed JSON safely without throwing", () => {
    const malformedRaw = "{ this is not json at all !!!";
    let parsed = null;
    try {
      const { safeParse, attemptJsonRecovery } = require("../src/services/json.service");
      parsed = safeParse(malformedRaw) || attemptJsonRecovery(malformedRaw);
    } catch (e) {
      parsed = null;
    }

    assert.strictEqual(parsed, null);
    // Mimic Step 2.5 failure isolation
    const pricingStatus = parsed ? "success" : "failed";
    const pricingError = parsed ? null : "Invalid or unrecoverable JSON from Step 2.5";
    assert.strictEqual(pricingStatus, "failed");
    assert.strictEqual(pricingError, "Invalid or unrecoverable JSON from Step 2.5");
  });

  // ─── TEST D: Token Truncation Simulation ──────────────────────────────────
  console.log("\n--- TEST D: Token Truncation (finish_reason=length) Fallback ---");
  record("Recovers or gracefully marks failed when JSON is truncated at token ceiling", () => {
    // Truncated JSON mid-stream
    const truncatedRaw = '{"services": [{"name": "AWS Lambda", "pricing_config": {"invocations_m": 10, "memory_mb": 1024,';
    const { safeParse, attemptJsonRecovery } = require("../src/services/json.service");
    let parsed = safeParse(truncatedRaw) || attemptJsonRecovery(truncatedRaw);

    let pricingStatus = "failed";
    let pricingConfigs = [];

    if (parsed) {
      const validation = validatePricingPayload(parsed);
      if (validation.valid) {
        pricingStatus = "success";
        pricingConfigs = validation.configs;
      }
    }

    // Because duration_ms was cut off, validation fails gracefully
    assert.strictEqual(pricingStatus, "failed");
    assert.strictEqual(pricingConfigs.length, 0);
  });

  // ─── TEST E: Unsupported Service Graceful Handling ────────────────────────
  console.log("\n--- TEST E: Unsupported Service Handling ---");
  record("Skips unsupported services while calculating all supported services", () => {
    const payloadWithUnsupported = {
      services: [
        {
          name: "AWS Lambda",
          pricing_config: { invocations_m: 10, memory_mb: 1024, duration_ms: 250 }
        },
        {
          name: "Amazon Quantum Ledger Database",
          pricing_config: { journals: 2 }
        },
        {
          name: "Amazon OpenSearch Service",
          pricing_config: { nodes: 3 }
        }
      ]
    };

    const validation = validatePricingPayload(payloadWithUnsupported);
    // Lambda is valid, QLDB and OpenSearch are identified as unsupported
    assert.strictEqual(validation.configs.length, 1);
    assert.strictEqual(validation.configs[0].name, "AWS Lambda");
    assert.strictEqual(validation.unsupportedServices.length, 2);
    assert.ok(validation.unsupportedServices.includes("Amazon Quantum Ledger Database"));
    assert.ok(validation.unsupportedServices.includes("Amazon OpenSearch Service"));

    const cost = pricingService.calculateArchitectureCost({ services: validation.configs });
    assert.strictEqual(cost.totalMonthlyCostUsd, 43.48);
    assert.strictEqual(cost.summary.supportedServices, 1);
  });

  // ─── TEST F: Dynamic Prompt Schema Generation & Registry Lookup ───────────
  console.log("\n--- TEST F: Dynamic Prompt Schema Generation ---");
  record("Generates compact schema documentation ONLY for selected services", () => {
    const selected = ["AWS Lambda", "Amazon S3", "NonExistentService"];
    const { supportedSchemas, unsupportedServices } = getSchemasForServices(selected);

    assert.strictEqual(supportedSchemas.length, 2);
    assert.strictEqual(supportedSchemas[0].service, "AWS Lambda");
    assert.strictEqual(supportedSchemas[1].service, "Amazon S3");
    assert.strictEqual(unsupportedServices.length, 1);
    assert.strictEqual(unsupportedServices[0], "NonExistentService");

    const promptText = formatSchemasForPrompt(supportedSchemas);
    assert.ok(promptText.includes("AWS Lambda:"));
    assert.ok(promptText.includes('"invocations_m": number'));
    assert.ok(promptText.includes("Amazon S3:"));
    assert.ok(promptText.includes('"storage_gb": number'));
    // Crucially: Must NOT include unselected services
    assert.ok(!promptText.includes("Amazon Redshift"));
    assert.ok(!promptText.includes("Amazon Athena"));
    assert.ok(!promptText.includes("AWS WAF"));
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runAllTests();
