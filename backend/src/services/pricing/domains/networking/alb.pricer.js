/**
 * backend/src/services/pricing/domains/networking/alb.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Application Load Balancer";
const DOMAIN = "networking";
const ALIASES = ["ALB", "Elastic Load Balancing", "AWS ALB", "Amazon Application Load Balancer"];
const FORMULA = "albs * ((hours * 0.0225) + (avg_lcu * hours * 0.008))";

function calculate(config = {}) {
  const albs = assertNonNegativeNumber(SERVICE, "albs", config.albs);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);
  const avg_lcu = assertNonNegativeNumber(SERVICE, "avg_lcu", config.avg_lcu);

  const rawCost = albs * ((hours * 0.0225) + (avg_lcu * hours * 0.008));

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { albs, hours, avg_lcu },
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
