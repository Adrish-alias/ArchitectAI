/**
 * backend/src/services/pricing/domains/compute/lambda.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS Lambda";
const DOMAIN = "compute";
const ALIASES = ["Lambda", "AWS Lambda Serverless", "AWS Lambda Function"];
const FORMULA = "(max(0, invocations_m - 1) * 0.20) + (invocations_m * 1,000,000 * (duration_ms / 1000) * (memory_mb / 1024) * 0.00001667)";

function calculate(config = {}) {
  const invocations_m = assertNonNegativeNumber(SERVICE, "invocations_m", config.invocations_m);
  const memory_mb = assertNonNegativeNumber(SERVICE, "memory_mb", config.memory_mb);
  const duration_ms = assertNonNegativeNumber(SERVICE, "duration_ms", config.duration_ms);

  const requestCost = Math.max(0, invocations_m - 1) * 0.20;
  const computeSeconds = (duration_ms / 1000);
  const memoryGigabytes = (memory_mb / 1024);
  const computeCost = invocations_m * 1000000 * computeSeconds * memoryGigabytes * 0.00001667;

  const rawCost = requestCost + computeCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { invocations_m, memory_mb, duration_ms },
    formula: FORMULA
  };
}

module.exports = {
  service: SERVICE,
  domain: DOMAIN,
  aliases: ALIASES,
  formula: FORMULA,
  pricingSource: "static_formula",
  calculate
};
