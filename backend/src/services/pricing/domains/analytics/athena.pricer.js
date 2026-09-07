/**
 * backend/src/services/pricing/domains/analytics/athena.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon Athena";
const DOMAIN = "analytics";
const ALIASES = ["Athena"];
const FORMULA = "data_scanned_tb * 5.00";

function calculate(config = {}) {
  const data_scanned_tb = assertNonNegativeNumber(SERVICE, "data_scanned_tb", config.data_scanned_tb);

  const rawCost = data_scanned_tb * 5.00;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { data_scanned_tb },
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
