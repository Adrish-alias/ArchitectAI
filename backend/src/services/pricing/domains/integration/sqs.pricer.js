/**
 * backend/src/services/pricing/domains/integration/sqs.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon SQS";
const DOMAIN = "integration";
const ALIASES = ["SQS", "Amazon SQS (Standard)", "Amazon SQS FIFO", "Amazon Simple Queue Service"];
const FORMULA = "max(0, requests_m - 1) * 0.40";

function calculate(config = {}) {
  const requests_m = assertNonNegativeNumber(SERVICE, "requests_m", config.requests_m);

  const rawCost = Math.max(0, requests_m - 1) * 0.40;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { requests_m },
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
