/**
 * backend/src/services/pricing/domains/storage/s3.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon S3";
const DOMAIN = "storage";
const ALIASES = ["S3", "Amazon Simple Storage Service", "S3 Standard"];
const FORMULA = "(storage_gb * 0.023) + (puts_k * 0.005) + (gets_k * 0.0004)";

function calculate(config = {}) {
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);
  const puts_k = assertNonNegativeNumber(SERVICE, "puts_k", config.puts_k);
  const gets_k = assertNonNegativeNumber(SERVICE, "gets_k", config.gets_k);

  const storageCost = storage_gb * 0.023;
  const putCost = puts_k * 0.005;
  const getCost = gets_k * 0.0004;

  const rawCost = storageCost + putCost + getCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { storage_gb, puts_k, gets_k },
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
