/**
 * backend/src/services/pricing/domains/database/redshift-serverless.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon Redshift Serverless";
const DOMAIN = "database";
const ALIASES = ["Redshift Serverless", "Amazon Redshift", "Redshift"];
const FORMULA = "(avg_rpu * hours_active * 0.36) + (storage_tb * 24.58)";

function calculate(config = {}) {
  const avg_rpu = assertNonNegativeNumber(SERVICE, "avg_rpu", config.avg_rpu);
  const hours_active = assertNonNegativeNumber(SERVICE, "hours_active", config.hours_active);
  const storage_tb = assertNonNegativeNumber(SERVICE, "storage_tb", config.storage_tb);

  const rpuCost = avg_rpu * hours_active * 0.36;
  const storageCost = storage_tb * 24.58;

  const rawCost = rpuCost + storageCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { avg_rpu, hours_active, storage_tb },
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
