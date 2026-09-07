/**
 * backend/src/services/pricing/domains/database/aurora-serverless.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Aurora Serverless v2";
const DOMAIN = "database";
const ALIASES = ["Amazon Aurora Serverless v2", "Aurora Serverless", "Amazon Aurora Serverless", "Aurora v2"];
const FORMULA = "(avg_acu * 730 * 0.12) + (storage_gb * 0.10)";

function calculate(config = {}) {
  const avg_acu = assertNonNegativeNumber(SERVICE, "avg_acu", config.avg_acu);
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);

  const acuCost = avg_acu * 730 * 0.12;
  const storageCost = storage_gb * 0.10;

  const rawCost = acuCost + storageCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { avg_acu, storage_gb },
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
