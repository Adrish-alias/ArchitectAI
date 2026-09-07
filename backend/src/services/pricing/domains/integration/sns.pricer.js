/**
 * backend/src/services/pricing/domains/integration/sns.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon SNS";
const DOMAIN = "integration";
const ALIASES = ["SNS", "Amazon Simple Notification Service"];
const FORMULA = "(max(0, requests_m - 1) * 0.50) + (max(0, http_deliveries_m - 0.1) * 0.60)";

function calculate(config = {}) {
  const requests_m = assertNonNegativeNumber(SERVICE, "requests_m", config.requests_m);
  const http_deliveries_m = assertNonNegativeNumber(SERVICE, "http_deliveries_m", config.http_deliveries_m);

  const requestCost = Math.max(0, requests_m - 1) * 0.50;
  const deliveryCost = Math.max(0, http_deliveries_m - 0.1) * 0.60;

  const rawCost = requestCost + deliveryCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { requests_m, http_deliveries_m },
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
