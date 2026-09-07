/**
 * backend/src/services/pricing/domains/networking/api-gateway.pricer.js
 */

const { assertNonNegativeNumber, assertEnum, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon API Gateway";
const DOMAIN = "networking";
const ALIASES = ["API Gateway", "Amazon API Gateway (REST)", "Amazon API Gateway (HTTP)", "API Gateway REST", "API Gateway HTTP"];
const FORMULA = "reqs_m * (api_type === \"HTTP\" ? 1.00 : 3.50)";

function calculate(config = {}) {
  const api_type = assertEnum(SERVICE, "api_type", config.api_type, ["HTTP", "REST"]);
  const reqs_m = assertNonNegativeNumber(SERVICE, "reqs_m", config.reqs_m);

  const ratePerMillion = api_type === "HTTP" ? 1.00 : 3.50;
  const rawCost = reqs_m * ratePerMillion;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { api_type, reqs_m },
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
