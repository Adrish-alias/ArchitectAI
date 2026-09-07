/**
 * backend/src/services/pricing/domains/storage/efs.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon EFS";
const DOMAIN = "storage";
const ALIASES = ["EFS", "Amazon Elastic File System"];
const FORMULA = "storage_gb * 0.30";

function calculate(config = {}) {
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);

  const rawCost = storage_gb * 0.30;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { storage_gb },
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
