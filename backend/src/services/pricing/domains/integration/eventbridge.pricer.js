/**
 * backend/src/services/pricing/domains/integration/eventbridge.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon EventBridge";
const DOMAIN = "integration";
const ALIASES = ["EventBridge", "Amazon EventBridge (Event Bus)", "AWS EventBridge"];
const FORMULA = "events_m * 1.00";

function calculate(config = {}) {
  const events_m = assertNonNegativeNumber(SERVICE, "events_m", config.events_m);

  const rawCost = events_m * 1.00;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { events_m },
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
