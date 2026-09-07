/**
 * backend/src/services/pricing/test/pricing-engine.test.js
 *
 * Comprehensive test suite for the ArchitectAI deterministic AWS pricing engine.
 * Run via: node src/services/pricing/test/pricing-engine.test.js
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");

const {
  pricingService,
  PricingService,
  pricingRegistry,
  PricingValidationError
} = require("../index");

describe("ArchitectAI Deterministic Pricing Engine", () => {
  // ─── 1. REGISTRY & SERVICE COVERAGE ─────────────────────────────────────
  describe("1. Registry & Supported Services", () => {
    const expectedServices = [
      "AWS Lambda",
      "AWS Fargate",
      "Amazon EC2",
      "Amazon EKS",
      "AWS App Runner",
      "Amazon DynamoDB",
      "Aurora Serverless v2",
      "Amazon RDS",
      "Amazon ElastiCache",
      "Amazon DocumentDB",
      "Amazon Redshift Serverless",
      "Amazon S3",
      "Amazon EFS",
      "Amazon EBS (gp3)",
      "S3 Glacier Deep Archive",
      "Amazon CloudFront",
      "Amazon API Gateway",
      "Application Load Balancer",
      "VPC NAT Gateway",
      "Amazon Route 53",
      "AWS WAF",
      "Amazon SQS",
      "Amazon SNS",
      "Amazon EventBridge",
      "Amazon Kinesis Data Streams",
      "AWS Step Functions",
      "Amazon Cognito",
      "AWS Secrets Manager",
      "AWS KMS",
      "Amazon Athena"
    ];

    it("should have registered all 30 initial AWS services", () => {
      const registered = pricingRegistry.getSupportedServices();
      assert.strictEqual(registered.length, 30, `Expected 30 services, got ${registered.length}`);

      for (const service of expectedServices) {
        assert.ok(pricingRegistry.has(service), `Missing registered service: "${service}"`);
        const pricer = pricingRegistry.get(service);
        assert.ok(pricer, `Failed to retrieve pricer for "${service}"`);
        assert.strictEqual(typeof pricer.calculate, "function", `Calculator for "${service}" must be a function`);
        assert.strictEqual(pricer.pricingSource, "static_formula", `Pricer "${service}" must declare pricingSource`);
      }
    });

    it("should resolve common service aliases and case variations", () => {
      assert.strictEqual(pricingRegistry.get("lambda")?.service, "AWS Lambda");
      assert.strictEqual(pricingRegistry.get("DynamoDB")?.service, "Amazon DynamoDB");
      assert.strictEqual(pricingRegistry.get("Amazon DynamoDB (On-Demand)")?.service, "Amazon DynamoDB");
      assert.strictEqual(pricingRegistry.get("s3")?.service, "Amazon S3");
      assert.strictEqual(pricingRegistry.get("CloudFront")?.service, "Amazon CloudFront");
      assert.strictEqual(pricingRegistry.get("ALB")?.service, "Application Load Balancer");
      assert.strictEqual(pricingRegistry.get("Route 53")?.service, "Amazon Route 53");
      assert.strictEqual(pricingRegistry.get("Amazon Route\u00a053")?.service, "Amazon Route 53");
      assert.strictEqual(pricingRegistry.get("EventBridge")?.service, "Amazon EventBridge");
      assert.strictEqual(pricingRegistry.get("Step Functions")?.service, "AWS Step Functions");
    });
  });

  // ─── 2. DETERMINISTIC CALCULATIONS (ALL 30 SERVICES) ────────────────────
  describe("2. Deterministic Pricing Baseline Tests", () => {
    // 1. Lambda
    it("calculates AWS Lambda baseline accurately", () => {
      const res = pricingService.calculateServiceCost("AWS Lambda", {
        invocations_m: 10,
        memory_mb: 1024,
        duration_ms: 250
      });
      // (10 - 1) * 0.20 = 1.80
      // 10 * 1,000,000 * 0.25 * 1 * 0.00001667 = 41.675
      // 1.80 + 41.675 = 43.475 -> 43.48
      assert.strictEqual(res.monthlyCostUsd, 43.48);
      assert.strictEqual(res.currency, "USD");
      assert.strictEqual(res.pricingSource, "static_formula");
    });

    // 2. Fargate
    it("calculates AWS Fargate baseline accurately", () => {
      const res = pricingService.calculateServiceCost("AWS Fargate", {
        tasks: 2,
        vcpu: 2,
        memory_gb: 4,
        hours: 730
      });
      // 2 * 730 * ((2 * 0.04048) + (4 * 0.004445)) = 1460 * 0.09874 = 144.1604 -> 144.16
      assert.strictEqual(res.monthlyCostUsd, 144.16);
    });

    // 3. EC2
    it("calculates Amazon EC2 with external hourly rate", () => {
      const res = pricingService.calculateServiceCost("Amazon EC2", {
        instances: 3,
        hourly_rate: 0.096,
        hours: 730
      });
      // 3 * 730 * 0.096 = 210.24
      assert.strictEqual(res.monthlyCostUsd, 210.24);
    });

    // 4. EKS
    it("calculates Amazon EKS control plane cost", () => {
      const res = pricingService.calculateServiceCost("Amazon EKS", {
        clusters: 1
      });
      // 1 * 730 * 0.10 = 73.00
      assert.strictEqual(res.monthlyCostUsd, 73.00);
    });

    // 5. App Runner
    it("calculates AWS App Runner baseline accurately", () => {
      const res = pricingService.calculateServiceCost("AWS App Runner", {
        instances: 2,
        vcpu: 1,
        memory_gb: 2,
        hours: 730
      });
      // 2 * 730 * ((1 * 0.064) + (2 * 0.007)) = 1460 * 0.078 = 113.88
      assert.strictEqual(res.monthlyCostUsd, 113.88);
    });

    // 6. DynamoDB
    it("calculates Amazon DynamoDB On-Demand accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon DynamoDB", {
        storage_gb: 100,
        reads_m: 50,
        writes_m: 20
      });
      // Storage: max(0, 100 - 25) * 0.25 = 18.75
      // Reads: 50 * 0.25 = 12.50
      // Writes: 20 * 1.25 = 25.00
      // Total = 56.25
      assert.strictEqual(res.monthlyCostUsd, 56.25);
    });

    // 7. Aurora Serverless v2
    it("calculates Aurora Serverless v2 baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Aurora Serverless v2", {
        avg_acu: 4,
        storage_gb: 100
      });
      // (4 * 730 * 0.12) + (100 * 0.10) = 350.40 + 10.00 = 360.40
      assert.strictEqual(res.monthlyCostUsd, 360.40);
    });

    // 8. RDS
    it("calculates Amazon RDS baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon RDS", {
        instances: 1,
        hourly_rate: 0.068,
        storage_gb: 100,
        hours: 730
      });
      // (1 * 730 * 0.068) + (100 * 0.115) = 49.64 + 11.50 = 61.14
      assert.strictEqual(res.monthlyCostUsd, 61.14);
    });

    // 9. ElastiCache
    it("calculates Amazon ElastiCache baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon ElastiCache", {
        nodes: 2,
        hourly_rate: 0.034,
        hours: 730
      });
      // 2 * 730 * 0.034 = 49.64
      assert.strictEqual(res.monthlyCostUsd, 49.64);
    });

    // 10. DocumentDB
    it("calculates Amazon DocumentDB baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon DocumentDB", {
        instances: 2,
        hourly_rate: 0.078,
        storage_gb: 50,
        io_m: 10,
        hours: 730
      });
      // (2 * 730 * 0.078) + (50 * 0.10) + (10 * 0.20) = 113.88 + 5.00 + 2.00 = 120.88
      assert.strictEqual(res.monthlyCostUsd, 120.88);
    });

    // 11. Redshift Serverless
    it("calculates Amazon Redshift Serverless baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon Redshift Serverless", {
        avg_rpu: 8,
        hours_active: 100,
        storage_tb: 2
      });
      // (8 * 100 * 0.36) + (2 * 24.58) = 288.00 + 49.16 = 337.16
      assert.strictEqual(res.monthlyCostUsd, 337.16);
    });

    // 12. S3
    it("calculates Amazon S3 baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon S3", {
        storage_gb: 500,
        puts_k: 200,
        gets_k: 2000
      });
      // (500 * 0.023) + (200 * 0.005) + (2000 * 0.0004) = 11.50 + 1.00 + 0.80 = 13.30
      assert.strictEqual(res.monthlyCostUsd, 13.30);
    });

    // 13. EFS
    it("calculates Amazon EFS baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon EFS", {
        storage_gb: 100
      });
      // 100 * 0.30 = 30.00
      assert.strictEqual(res.monthlyCostUsd, 30.00);
    });

    // 14. EBS (gp3)
    it("calculates Amazon EBS (gp3) baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon EBS (gp3)", {
        storage_gb: 200,
        volumes: 2
      });
      // 200 * 0.08 = 16.00
      assert.strictEqual(res.monthlyCostUsd, 16.00);
    });

    // 15. Glacier Deep Archive
    it("calculates S3 Glacier Deep Archive baseline accurately", () => {
      const res = pricingService.calculateServiceCost("S3 Glacier Deep Archive", {
        storage_gb: 1000,
        puts_k: 50
      });
      // (1000 * 0.00099) + (50 * 0.05) = 0.99 + 2.50 = 3.49
      assert.strictEqual(res.monthlyCostUsd, 3.49);
    });

    // 16. CloudFront
    it("calculates Amazon CloudFront baseline with free tier allowance", () => {
      const res = pricingService.calculateServiceCost("Amazon CloudFront", {
        egress_gb: 2048,
        https_reqs_m: 10
      });
      // (max(0, 2048 - 1024) * 0.085) + (10 * 0.012) = (1024 * 0.085) + 0.12 = 87.04 + 0.12 = 87.16
      assert.strictEqual(res.monthlyCostUsd, 87.16);
    });

    // 17. API Gateway (HTTP vs REST)
    it("calculates Amazon API Gateway for HTTP and REST", () => {
      const resHttp = pricingService.calculateServiceCost("Amazon API Gateway", {
        api_type: "HTTP",
        reqs_m: 10
      });
      // 10 * 1.00 = 10.00
      assert.strictEqual(resHttp.monthlyCostUsd, 10.00);

      const resRest = pricingService.calculateServiceCost("Amazon API Gateway", {
        api_type: "REST",
        reqs_m: 10
      });
      // 10 * 3.50 = 35.00
      assert.strictEqual(resRest.monthlyCostUsd, 35.00);
    });

    // 18. Application Load Balancer
    it("calculates Application Load Balancer baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Application Load Balancer", {
        albs: 1,
        hours: 730,
        avg_lcu: 2
      });
      // 1 * ((730 * 0.0225) + (2 * 730 * 0.008)) = 16.425 + 11.68 = 28.105 -> 28.11
      assert.strictEqual(res.monthlyCostUsd, 28.11);
    });

    // 19. NAT Gateway
    it("calculates VPC NAT Gateway baseline accurately", () => {
      const res = pricingService.calculateServiceCost("VPC NAT Gateway", {
        gateways: 2,
        hours: 730,
        data_processed_gb: 500
      });
      // (2 * 730 * 0.045) + (500 * 0.045) = 65.70 + 22.50 = 88.20
      assert.strictEqual(res.monthlyCostUsd, 88.20);
    });

    // 20. Route 53
    it("calculates Amazon Route 53 baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon Route 53", {
        hosted_zones: 2,
        queries_m: 5
      });
      // (2 * 0.50) + (5 * 0.40) = 1.00 + 2.00 = 3.00
      assert.strictEqual(res.monthlyCostUsd, 3.00);
    });

    // 21. WAF
    it("calculates AWS WAF baseline accurately", () => {
      const res = pricingService.calculateServiceCost("AWS WAF", {
        web_acls: 1,
        rules: 5,
        reqs_m: 10
      });
      // (1 * 5.00) + (5 * 1.00) + (10 * 0.60) = 5.00 + 5.00 + 6.00 = 16.00
      assert.strictEqual(res.monthlyCostUsd, 16.00);
    });

    // 22. SQS
    it("calculates Amazon SQS with 1M free tier allowance", () => {
      const res = pricingService.calculateServiceCost("Amazon SQS", {
        requests_m: 10
      });
      // (10 - 1) * 0.40 = 3.60
      assert.strictEqual(res.monthlyCostUsd, 3.60);
    });

    // 23. SNS
    it("calculates Amazon SNS with tier allowances", () => {
      const res = pricingService.calculateServiceCost("Amazon SNS", {
        requests_m: 5,
        http_deliveries_m: 2
      });
      // max(0, 5 - 1) * 0.50 + max(0, 2 - 0.1) * 0.60 = 2.00 + 1.14 = 3.14
      assert.strictEqual(res.monthlyCostUsd, 3.14);
    });

    // 24. EventBridge
    it("calculates Amazon EventBridge baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon EventBridge", {
        events_m: 5
      });
      // 5 * 1.00 = 5.00
      assert.strictEqual(res.monthlyCostUsd, 5.00);
    });

    // 25. Kinesis Data Streams
    it("calculates Amazon Kinesis Data Streams baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon Kinesis Data Streams", {
        shards: 2,
        hours: 730,
        put_payloads_m: 10
      });
      // (2 * 730 * 0.015) + (10 * 0.014) = 21.90 + 0.14 = 22.04
      assert.strictEqual(res.monthlyCostUsd, 22.04);
    });

    // 26. Step Functions
    it("calculates AWS Step Functions with 4K free transitions", () => {
      const res = pricingService.calculateServiceCost("AWS Step Functions", {
        state_transitions_k: 100
      });
      // (100 - 4) * 0.025 = 96 * 0.025 = 2.40
      assert.strictEqual(res.monthlyCostUsd, 2.40);
    });

    // 27. Cognito
    it("calculates Amazon Cognito with 50K MAU free tier", () => {
      const res = pricingService.calculateServiceCost("Amazon Cognito", {
        mau: 100000
      });
      // max(0, 100000 - 50000) * 0.0055 = 50000 * 0.0055 = 275.00
      assert.strictEqual(res.monthlyCostUsd, 275.00);
    });

    // 28. Secrets Manager
    it("calculates AWS Secrets Manager baseline accurately", () => {
      const res = pricingService.calculateServiceCost("AWS Secrets Manager", {
        secrets: 5,
        api_calls_10k: 20
      });
      // (5 * 0.40) + (20 * 0.05) = 2.00 + 1.00 = 3.00
      assert.strictEqual(res.monthlyCostUsd, 3.00);
    });

    // 29. KMS
    it("calculates AWS KMS baseline accurately", () => {
      const res = pricingService.calculateServiceCost("AWS KMS", {
        keys: 3,
        reqs_10k: 50
      });
      // (3 * 1.00) + (50 * 0.03) = 3.00 + 1.50 = 4.50
      assert.strictEqual(res.monthlyCostUsd, 4.50);
    });

    // 30. Athena
    it("calculates Amazon Athena baseline accurately", () => {
      const res = pricingService.calculateServiceCost("Amazon Athena", {
        data_scanned_tb: 4
      });
      // 4 * 5.00 = 20.00
      assert.strictEqual(res.monthlyCostUsd, 20.00);
    });
  });

  // ─── 3. VALIDATION: MISSING INPUTS ──────────────────────────────────────
  describe("3. Input Validation: Missing Inputs", () => {
    it("throws PricingValidationError when required inputs are missing", () => {
      assert.throws(
        () => pricingService.calculateServiceCost("AWS Lambda", { invocations_m: 10 }),
        PricingValidationError
      );
      assert.throws(
        () => pricingService.calculateServiceCost("Amazon EC2", { instances: 2 }),
        PricingValidationError
      );
      assert.throws(
        () => pricingService.calculateServiceCost("Amazon S3", {}),
        PricingValidationError
      );
    });
  });

  // ─── 4. VALIDATION: NEGATIVE INPUTS ─────────────────────────────────────
  describe("4. Input Validation: Negative Inputs", () => {
    it("throws PricingValidationError when negative values are provided", () => {
      assert.throws(
        () => pricingService.calculateServiceCost("Amazon DynamoDB", {
          storage_gb: -5,
          reads_m: 10,
          writes_m: 5
        }),
        PricingValidationError
      );
      assert.throws(
        () => pricingService.calculateServiceCost("AWS Fargate", {
          tasks: -1,
          vcpu: 2,
          memory_gb: 4,
          hours: 730
        }),
        PricingValidationError
      );
      assert.throws(
        () => pricingService.calculateServiceCost("Amazon Athena", {
          data_scanned_tb: -1
        }),
        PricingValidationError
      );
    });
  });

  // ─── 5. VALIDATION: INVALID ENUMS ───────────────────────────────────────
  describe("5. Input Validation: Invalid Enums", () => {
    it("rejects invalid enum values for api_type in Amazon API Gateway", () => {
      assert.throws(
        () => pricingService.calculateServiceCost("Amazon API Gateway", {
          api_type: "WEBSOCKET",
          reqs_m: 10
        }),
        PricingValidationError
      );
      assert.throws(
        () => pricingService.calculateServiceCost("Amazon API Gateway", {
          api_type: "GRPC",
          reqs_m: 10
        }),
        PricingValidationError
      );
    });
  });

  // ─── 6. UNKNOWN SERVICES RESILIENCE ─────────────────────────────────────
  describe("6. Unknown Services Graceful Handling", () => {
    it("does NOT crash the engine for unknown services", () => {
      const res = pricingService.calculateServiceCost("Amazon Quantum Ledger Database", { records: 50 });
      assert.strictEqual(res.supported, false);
      assert.strictEqual(res.monthlyCostUsd, null);
      assert.strictEqual(res.reason, "Pricing calculator not implemented");
    });

    it("handles unknown services gracefully within batch calculations", () => {
      const batch = {
        services: [
          {
            name: "AWS Lambda",
            pricing_config: { invocations_m: 10, memory_mb: 1024, duration_ms: 250 }
          },
          {
            name: "NonExistentService9000",
            pricing_config: { dummy: 123 }
          }
        ]
      };

      const result = pricingService.calculateArchitectureCost(batch);
      assert.strictEqual(result.services.length, 2);
      assert.strictEqual(result.services[0].supported, true);
      assert.strictEqual(result.services[0].monthlyCostUsd, 43.48);
      assert.strictEqual(result.services[1].supported, false);
      assert.strictEqual(result.services[1].monthlyCostUsd, null);

      // Total must ONLY include supported services
      assert.strictEqual(result.totalMonthlyCostUsd, 43.48);
      assert.strictEqual(result.summary.supportedServices, 1);
      assert.strictEqual(result.summary.unsupportedServices, 1);
    });
  });

  // ─── 7. MULTI-SERVICE BATCH CALCULATION ──────────────────────────────────
  describe("7. Multi-Service Architecture Batch Cost Calculation", () => {
    it("calculates multiple services and returns total cost matching sum of items", () => {
      const architecture = {
        services: [
          {
            name: "Amazon DynamoDB",
            pricing_config: { storage_gb: 100, reads_m: 50, writes_m: 20 } // 56.25
          },
          {
            name: "AWS Lambda",
            pricing_config: { invocations_m: 10, memory_mb: 1024, duration_ms: 250 } // 43.475
          },
          {
            name: "Amazon S3",
            pricing_config: { storage_gb: 500, puts_k: 200, gets_k: 2000 } // 13.30
          },
          {
            name: "Amazon CloudFront",
            pricing_config: { egress_gb: 2048, https_reqs_m: 10 } // 87.16
          }
        ]
      };

      const result = pricingService.calculateArchitectureCost(architecture);
      assert.strictEqual(result.services.length, 4);

      // 56.25 + 43.475 + 13.30 + 87.16 = 200.185 -> rounded: 200.19
      assert.strictEqual(result.totalMonthlyCostUsd, 200.19);
      assert.strictEqual(result.currency, "USD");
    });
  });

  // ─── 8. UNROUNDED INTERNAL ACCURACY ─────────────────────────────────────
  describe("8. Precision and Non-Premature Rounding", () => {
    it("maintains raw unrounded intermediate costs to prevent drift", () => {
      // Create 3 services that each have a cost ending in .004
      // Individually rounded to 2 decimals: each rounds down to .00
      // If rounded prematurely: sum of rounded = .00
      // At full precision: .004 + .004 + .004 = .012 -> rounds to .01
      const p1 = pricingService.calculateServiceCost("Amazon S3", { storage_gb: 0, puts_k: 0, gets_k: 10 }); // 10 * 0.0004 = 0.004
      const p2 = pricingService.calculateServiceCost("Amazon S3", { storage_gb: 0, puts_k: 0, gets_k: 10 }); // 0.004
      const p3 = pricingService.calculateServiceCost("Amazon S3", { storage_gb: 0, puts_k: 0, gets_k: 10 }); // 0.004

      assert.strictEqual(p1.monthlyCostUsd, 0.00); // 0.004 rounds to 0.00
      assert.strictEqual(p1.rawMonthlyCostUsd, 0.004); // raw unrounded preserved

      const batch = pricingService.calculateArchitectureCost({
        services: [
          { name: "Amazon S3", pricing_config: { storage_gb: 0, puts_k: 0, gets_k: 10 } },
          { name: "Amazon S3", pricing_config: { storage_gb: 0, puts_k: 0, gets_k: 10 } },
          { name: "Amazon S3", pricing_config: { storage_gb: 0, puts_k: 0, gets_k: 10 } }
        ]
      });

      // Raw total is 0.012, rounded is 0.01 (NOT 0.00)
      assert.strictEqual(batch.rawTotalMonthlyCostUsd, 0.012);
      assert.strictEqual(batch.totalMonthlyCostUsd, 0.01);
    });
  });
});
