/**
 * backend/src/services/pricing/domains/security/secrets-manager.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS Secrets Manager";
const DOMAIN = "security";
const ALIASES = ["Secrets Manager", "AWS SecretsManager"];
const FORMULA = "(secrets * 0.40) + (api_calls_10k * 0.05)";

function calculate(config = {}) {
  const secrets = assertNonNegativeNumber(SERVICE, "secrets", config.secrets);
  const api_calls_10k = assertNonNegativeNumber(SERVICE, "api_calls_10k", config.api_calls_10k);

  const secretCost = secrets * 0.40;
  const apiCost = api_calls_10k * 0.05;

  const rawCost = secretCost + apiCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { secrets, api_calls_10k },
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
