/**
 * backend/src/services/pricing/domains/compute/eks.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon EKS";
const DOMAIN = "compute";
const ALIASES = ["EKS", "Amazon Elastic Kubernetes Service"];
const FORMULA = "clusters * 730 * 0.10";

function calculate(config = {}) {
  const clusters = assertNonNegativeNumber(SERVICE, "clusters", config.clusters);

  const rawCost = clusters * 730 * 0.10;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { clusters },
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
