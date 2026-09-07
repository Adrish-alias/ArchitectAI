# ArchitectAI Deterministic AWS Pricing Engine

## Overview

ArchitectAI's pricing engine computes monthly AWS infrastructure cost estimates using **deterministic mathematical models** rather than unconstrained LLM hallucinations. 

### Why Pricing is Deterministic
LLMs frequently hallucinate AWS rates, drop line items, produce non-reproducible estimations, or drift across runs. In contrast, this engine applies exact AWS pricing formulas to validated workload inputs (`pricing_config`), guaranteeing reproducible, auditable, and transparent projections.

> **Disclaimer:** These formulas represent baseline architectural estimates based on official AWS published rates in standard US regions (us-east-1). They do **NOT** constitute exact real-time AWS billing or account-specific invoice predictions (which may vary based on Enterprise Discount Programs, Savings Plans, Reserved Instances, regional price differences, or taxes).

---

## Architecture & Extensibility

```
backend/src/services/pricing/
├── index.js                     # Public API exports
├── pricing.service.js           # Central pricing orchestrator (single & batch)
├── pricing.registry.js          # Normalizing registry resolving canonical names & aliases
├── pricing.schemas.js           # Canonical schemas for 30 services & validation utilities
├── pricing.types.js             # Validation primitives, errors, and rounding helpers
├── domains/                     # Domain-specific calculator modules
│   ├── compute/                 # Lambda, Fargate, EC2, EKS, App Runner
│   ├── database/                # DynamoDB, Aurora v2, RDS, ElastiCache, DocDB, Redshift
│   ├── storage/                 # S3, EFS, EBS (gp3), Glacier Deep Archive
│   ├── networking/              # CloudFront, API Gateway, ALB, NAT Gateway, Route 53, WAF
│   ├── integration/             # SQS, SNS, EventBridge, Kinesis Data Streams, Step Functions
│   ├── security/                # Cognito, Secrets Manager, KMS
│   └── analytics/               # Athena
└── test/
    └── pricing-engine.test.js   # 39-test verification suite
```

### AWS Pricing API Compatibility
Every pricer module implements a standardized interface declaring `pricingSource: "static_formula"`. This architecture allows future extensions where live rates can be resolved dynamically via the AWS Pricing API (`pricingSource: "aws_pricing_api"`) without altering the orchestrator contract or calling code.

For services where instance rates vary widely (e.g. **Amazon EC2**, **Amazon RDS**, **Amazon ElastiCache**, **Amazon DocumentDB**), the calculator explicitly accepts `hourly_rate` as a clean external configuration input rather than relying on hardcoded assumptions.

---

## Supported Services (30 Initial Services)

| Domain | Service | Inputs (`pricing_config`) | Baseline Formula |
| :--- | :--- | :--- | :--- |
| **Compute** | **AWS Lambda** | `invocations_m`, `memory_mb`, `duration_ms` | `max(0, invocations_m - 1) * 0.20 + invocations_m * 1M * (duration_ms/1000) * (memory_mb/1024) * 0.00001667` |
| **Compute** | **AWS Fargate** | `tasks`, `vcpu`, `memory_gb`, `hours` | `tasks * hours * ((vcpu * 0.04048) + (memory_gb * 0.004445))` |
| **Compute** | **Amazon EC2** | `instances`, `hourly_rate`, `hours` | `instances * hours * hourly_rate` |
| **Compute** | **Amazon EKS** | `clusters` | `clusters * 730 * 0.10` (control plane only) |
| **Compute** | **AWS App Runner** | `instances`, `vcpu`, `memory_gb`, `hours` | `instances * hours * ((vcpu * 0.064) + (memory_gb * 0.007))` |
| **Database** | **Amazon DynamoDB** | `storage_gb`, `reads_m`, `writes_m` | `max(0, storage_gb - 25) * 0.25 + reads_m * 0.25 + writes_m * 1.25` |
| **Database** | **Aurora Serverless v2** | `avg_acu`, `storage_gb` | `avg_acu * 730 * 0.12 + storage_gb * 0.10` |
| **Database** | **Amazon RDS** | `instances`, `hourly_rate`, `storage_gb`, `hours` (optional, default: 730) | `instances * hours * hourly_rate + storage_gb * 0.115` |
| **Database** | **Amazon ElastiCache** | `nodes`, `hourly_rate`, `hours` | `nodes * hours * hourly_rate` |
| **Database** | **Amazon DocumentDB** | `instances`, `hourly_rate`, `storage_gb`, `io_m`, `hours` (optional, default: 730) | `instances * hours * hourly_rate + storage_gb * 0.10 + io_m * 0.20` |
| **Database** | **Amazon Redshift Serverless**| `avg_rpu`, `hours_active`, `storage_tb` | `avg_rpu * hours_active * 0.36 + storage_tb * 24.58` |
| **Storage** | **Amazon S3** | `storage_gb`, `puts_k`, `gets_k` | `storage_gb * 0.023 + puts_k * 0.005 + gets_k * 0.0004` |
| **Storage** | **Amazon EFS** | `storage_gb` | `storage_gb * 0.30` |
| **Storage** | **Amazon EBS (gp3)** | `storage_gb`, `volumes` | `storage_gb * 0.08` |
| **Storage** | **S3 Glacier Deep Archive** | `storage_gb`, `puts_k` | `storage_gb * 0.00099 + puts_k * 0.05` |
| **Networking** | **Amazon CloudFront** | `egress_gb`, `https_reqs_m` | `max(0, egress_gb - 1024) * 0.085 + https_reqs_m * 0.012` |
| **Networking** | **Amazon API Gateway** | `api_type: "HTTP"\|"REST"`, `reqs_m` | `reqs_m * (api_type === "HTTP" ? 1.00 : 3.50)` |
| **Networking** | **Application Load Balancer** | `albs`, `hours`, `avg_lcu` | `albs * ((hours * 0.0225) + (avg_lcu * hours * 0.008))` |
| **Networking** | **VPC NAT Gateway** | `gateways`, `hours`, `data_processed_gb` | `gateways * hours * 0.045 + data_processed_gb * 0.045` |
| **Networking** | **Amazon Route 53** | `hosted_zones`, `queries_m` | `hosted_zones * 0.50 + queries_m * 0.40` |
| **Networking** | **AWS WAF** | `web_acls`, `rules`, `reqs_m` | `web_acls * 5.00 + rules * 1.00 + reqs_m * 0.60` |
| **Integration** | **Amazon SQS** | `requests_m` | `max(0, requests_m - 1) * 0.40` |
| **Integration** | **Amazon SNS** | `requests_m`, `http_deliveries_m` | `max(0, requests_m - 1) * 0.50 + max(0, http_deliveries_m - 0.1) * 0.60` |
| **Integration** | **Amazon EventBridge** | `events_m` | `events_m * 1.00` |
| **Integration** | **Amazon Kinesis Data Streams**| `shards`, `hours`, `put_payloads_m` | `shards * hours * 0.015 + put_payloads_m * 0.014` |
| **Integration** | **AWS Step Functions** | `state_transitions_k` | `max(0, state_transitions_k - 4) * 0.025` |
| **Security** | **Amazon Cognito** | `mau` | `max(0, mau - 50000) * 0.0055` |
| **Security** | **AWS Secrets Manager** | `secrets`, `api_calls_10k` | `secrets * 0.40 + api_calls_10k * 0.05` |
| **Security** | **AWS KMS** | `keys`, `reqs_10k` | `keys * 1.00 + reqs_10k * 0.03` |
| **Analytics** | **Amazon Athena** | `data_scanned_tb` | `data_scanned_tb * 5.00` |

---

## Usage Examples

### 1. Single Service Calculation
```javascript
const { pricingService } = require("./services/pricing");

const result = pricingService.calculateServiceCost("Amazon DynamoDB", {
  storage_gb: 100,
  reads_m: 50,
  writes_m: 20
});

console.log(result);
// {
//   name: "Amazon DynamoDB",
//   service: "Amazon DynamoDB",
//   domain: "database",
//   supported: true,
//   monthlyCostUsd: 56.25,
//   rawMonthlyCostUsd: 56.25,
//   currency: "USD",
//   pricingSource: "static_formula",
//   inputs: { storage_gb: 100, reads_m: 50, writes_m: 20 },
//   formula: "(max(0, storage_gb - 25) * 0.25) + (reads_m * 0.25) + (writes_m * 1.25)"
// }
```

### 2. Multi-Service Architecture Batch Calculation
```javascript
const { pricingService } = require("./services/pricing");

const batch = {
  services: [
    {
      name: "Amazon DynamoDB",
      pricing_config: { storage_gb: 100, reads_m: 50, writes_m: 20 }
    },
    {
      name: "AWS Lambda",
      pricing_config: { invocations_m: 10, memory_mb: 1024, duration_ms: 250 }
    },
    {
      name: "Amazon S3",
      pricing_config: { storage_gb: 500, puts_k: 200, gets_k: 2000 }
    }
  ]
};

const costBreakdown = pricingService.calculateArchitectureCost(batch);
console.log(`Total Monthly Estimate: $${costBreakdown.totalMonthlyCostUsd}`);
// Total Monthly Estimate: $113.03
```

### 3. Graceful Handling of Unsupported Services
```javascript
const batchWithUnknown = {
  services: [
    { name: "AWS Lambda", pricing_config: { invocations_m: 1, memory_mb: 128, duration_ms: 100 } },
    { name: "Amazon Quantum Ledger Database", pricing_config: { transactions: 100 } }
  ]
};

const report = pricingService.calculateArchitectureCost(batchWithUnknown);
// report.services[1] -> { service: "Amazon Quantum Ledger Database", supported: false, monthlyCostUsd: null, reason: "Pricing calculator not implemented" }
// report.totalMonthlyCostUsd -> Only sums supported services
```

---

## Validation & Precision Guarantees
1. **Strict Non-Negative Numbers:** Negative quantities, negative rates, or non-finite numbers immediately throw `PricingValidationError`.
2. **Missing Input Rejection:** Required sizing fields cannot be omitted.
3. **Enum Verification:** Strict enum checks (e.g. `api_type: "HTTP" | "REST"`).
4. **Intermediate Precision:** Unrounded floating point precision (`rawMonthlyCostUsd`, `rawTotalMonthlyCostUsd`) is preserved across all calculations to prevent roundoff error drift. Final totals round to 2 decimal places using epsilon rounding.

---

## Running Unit Tests
```bash
npm run test:pricing
# or
node --test src/services/pricing/test/pricing-engine.test.js
```
