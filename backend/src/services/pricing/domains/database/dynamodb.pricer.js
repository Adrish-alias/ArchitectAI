/**
 * backend/src/services/pricing/domains/database/dynamodb.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon DynamoDB";
const DOMAIN = "database";
const ALIASES = ["DynamoDB", "Amazon DynamoDB (On‑Demand)", "Amazon DynamoDB (On-Demand)", "DynamoDB On-Demand"];
const FORMULA = "(max(0, storage_gb - 25) * 0.25) + (reads_m * 0.25) + (writes_m * 1.25)";

function calculate(config = {}) {
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);
  const reads_m = assertNonNegativeNumber(SERVICE, "reads_m", config.reads_m);
  const writes_m = assertNonNegativeNumber(SERVICE, "writes_m", config.writes_m);

  const storageCost = Math.max(0, storage_gb - 25) * 0.25;
  const readCost = reads_m * 0.25;
  const writeCost = writes_m * 1.25;

  const rawCost = storageCost + readCost + writeCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { storage_gb, reads_m, writes_m },
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
