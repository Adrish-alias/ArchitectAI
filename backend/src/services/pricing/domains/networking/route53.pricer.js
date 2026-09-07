/**
 * backend/src/services/pricing/domains/networking/route53.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon Route 53";
const DOMAIN = "networking";
const ALIASES = ["Route 53", "Route53", "Amazon Route 53 (DNS)"];
const FORMULA = "(hosted_zones * 0.50) + (queries_m * 0.40)";

function calculate(config = {}) {
  const hosted_zones = assertNonNegativeNumber(SERVICE, "hosted_zones", config.hosted_zones);
  const queries_m = assertNonNegativeNumber(SERVICE, "queries_m", config.queries_m);

  const zoneCost = hosted_zones * 0.50;
  const queryCost = queries_m * 0.40;

  const rawCost = zoneCost + queryCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { hosted_zones, queries_m },
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
