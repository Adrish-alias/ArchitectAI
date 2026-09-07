/**
 * backend/src/services/pricing/domains/compute/fargate.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS Fargate";
const DOMAIN = "compute";
const ALIASES = ["Fargate", "Amazon ECS (Fargate)", "Amazon ECS Fargate", "ECS Fargate"];
const FORMULA = "tasks * hours * ((vcpu * 0.04048) + (memory_gb * 0.004445))";

function calculate(config = {}) {
  const tasks = assertNonNegativeNumber(SERVICE, "tasks", config.tasks);
  const vcpu = assertNonNegativeNumber(SERVICE, "vcpu", config.vcpu);
  const memory_gb = assertNonNegativeNumber(SERVICE, "memory_gb", config.memory_gb);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);

  const rawCost = tasks * hours * ((vcpu * 0.04048) + (memory_gb * 0.004445));

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { tasks, vcpu, memory_gb, hours },
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
