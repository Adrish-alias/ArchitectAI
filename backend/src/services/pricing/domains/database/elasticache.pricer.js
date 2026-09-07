/**
 * backend/src/services/pricing/domains/database/elasticache.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon ElastiCache";
const DOMAIN = "database";
const ALIASES = ["ElastiCache", "Amazon ElastiCache for Redis", "Amazon ElastiCache for Memcached", "ElastiCache Redis"];
const FORMULA = "nodes * hours * hourly_rate";

function calculate(config = {}) {
  const nodes = assertNonNegativeNumber(SERVICE, "nodes", config.nodes);
  const hourly_rate = assertNonNegativeNumber(SERVICE, "hourly_rate", config.hourly_rate);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);

  const rawCost = nodes * hours * hourly_rate;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { nodes, hourly_rate, hours },
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
