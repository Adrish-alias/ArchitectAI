/**
 * backend/src/services/pricing/domains/compute/ec2.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon EC2";
const DOMAIN = "compute";
const ALIASES = ["EC2", "Amazon Elastic Compute Cloud"];
const FORMULA = "instances * hours * hourly_rate";

function calculate(config = {}) {
  const instances = assertNonNegativeNumber(SERVICE, "instances", config.instances);
  const hourly_rate = assertNonNegativeNumber(SERVICE, "hourly_rate", config.hourly_rate);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);

  const rawCost = instances * hours * hourly_rate;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { instances, hourly_rate, hours },
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
