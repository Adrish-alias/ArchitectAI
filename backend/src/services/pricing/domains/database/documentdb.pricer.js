/**
 * backend/src/services/pricing/domains/database/documentdb.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon DocumentDB";
const DOMAIN = "database";
const ALIASES = ["DocumentDB", "Amazon DocumentDB (with MongoDB compatibility)"];
const FORMULA = "(instances * hours * hourly_rate) + (storage_gb * 0.10) + (io_m * 0.20)";

function calculate(config = {}) {
  const instances = assertNonNegativeNumber(SERVICE, "instances", config.instances);
  const hourly_rate = assertNonNegativeNumber(SERVICE, "hourly_rate", config.hourly_rate);
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);
  const io_m = assertNonNegativeNumber(SERVICE, "io_m", config.io_m);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours !== undefined ? config.hours : 730);

  const instanceCost = instances * hours * hourly_rate;
  const storageCost = storage_gb * 0.10;
  const ioCost = io_m * 0.20;

  const rawCost = instanceCost + storageCost + ioCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { instances, hourly_rate, storage_gb, io_m, hours },
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
