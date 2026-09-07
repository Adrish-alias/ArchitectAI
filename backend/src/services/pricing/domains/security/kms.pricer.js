/**
 * backend/src/services/pricing/domains/security/kms.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS KMS";
const DOMAIN = "security";
const ALIASES = ["KMS", "AWS Key Management Service"];
const FORMULA = "(keys * 1.00) + (reqs_10k * 0.03)";

function calculate(config = {}) {
  const keys = assertNonNegativeNumber(SERVICE, "keys", config.keys);
  const reqs_10k = assertNonNegativeNumber(SERVICE, "reqs_10k", config.reqs_10k);

  const keyCost = keys * 1.00;
  const reqCost = reqs_10k * 0.03;

  const rawCost = keyCost + reqCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { keys, reqs_10k },
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
