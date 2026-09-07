/**
 * backend/src/services/pricing/domains/compute/app-runner.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS App Runner";
const DOMAIN = "compute";
const ALIASES = ["App Runner", "AWS AppRunner"];
const FORMULA = "instances * hours * ((vcpu * 0.064) + (memory_gb * 0.007))";

function calculate(config = {}) {
  const instances = assertNonNegativeNumber(SERVICE, "instances", config.instances);
  const vcpu = assertNonNegativeNumber(SERVICE, "vcpu", config.vcpu);
  const memory_gb = assertNonNegativeNumber(SERVICE, "memory_gb", config.memory_gb);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);

  const rawCost = instances * hours * ((vcpu * 0.064) + (memory_gb * 0.007));

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { instances, vcpu, memory_gb, hours },
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
