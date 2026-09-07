/**
 * backend/src/services/pricing/domains/integration/step-functions.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS Step Functions";
const DOMAIN = "integration";
const ALIASES = ["Step Functions", "AWS Step Functions (Standard)"];
const FORMULA = "max(0, state_transitions_k - 4) * 0.025";

function calculate(config = {}) {
  const state_transitions_k = assertNonNegativeNumber(SERVICE, "state_transitions_k", config.state_transitions_k);

  const rawCost = Math.max(0, state_transitions_k - 4) * 0.025;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { state_transitions_k },
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
