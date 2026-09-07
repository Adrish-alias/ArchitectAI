/**
 * backend/src/services/pricing/domains/database/rds.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon RDS";
const DOMAIN = "database";
const ALIASES = ["RDS", "Amazon Relational Database Service"];
const FORMULA = "(instances * hours * hourly_rate) + (storage_gb * 0.115)";

function calculate(config = {}) {
  const instances = assertNonNegativeNumber(SERVICE, "instances", config.instances);
  const hourly_rate = assertNonNegativeNumber(SERVICE, "hourly_rate", config.hourly_rate);
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours !== undefined ? config.hours : 730);

  const instanceCost = instances * hours * hourly_rate;
  const storageCost = storage_gb * 0.115;

  const rawCost = instanceCost + storageCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { instances, hourly_rate, storage_gb, hours },
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
