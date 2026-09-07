/**
 * backend/src/services/pricing/domains/storage/glacier.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "S3 Glacier Deep Archive";
const DOMAIN = "storage";
const ALIASES = ["Amazon S3 Glacier Deep Archive", "Glacier Deep Archive", "S3 Glacier", "Amazon Glacier"];
const FORMULA = "(storage_gb * 0.00099) + (puts_k * 0.05)";

function calculate(config = {}) {
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);
  const puts_k = assertNonNegativeNumber(SERVICE, "puts_k", config.puts_k);

  const storageCost = storage_gb * 0.00099;
  const putCost = puts_k * 0.05;

  const rawCost = storageCost + putCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { storage_gb, puts_k },
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
