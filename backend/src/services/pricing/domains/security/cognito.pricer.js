/**
 * backend/src/services/pricing/domains/security/cognito.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon Cognito";
const DOMAIN = "security";
const ALIASES = ["Cognito", "Amazon Cognito User Pools"];
const FORMULA = "max(0, mau - 50000) * 0.0055";

function calculate(config = {}) {
  const mau = assertNonNegativeNumber(SERVICE, "mau", config.mau);

  const rawCost = Math.max(0, mau - 50000) * 0.0055;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { mau },
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
