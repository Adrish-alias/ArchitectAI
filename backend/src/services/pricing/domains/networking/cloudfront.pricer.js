/**
 * backend/src/services/pricing/domains/networking/cloudfront.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon CloudFront";
const DOMAIN = "networking";
const ALIASES = ["CloudFront"];
const FORMULA = "(max(0, egress_gb - 1024) * 0.085) + (https_reqs_m * 0.012)";

function calculate(config = {}) {
  const egress_gb = assertNonNegativeNumber(SERVICE, "egress_gb", config.egress_gb);
  const https_reqs_m = assertNonNegativeNumber(SERVICE, "https_reqs_m", config.https_reqs_m);

  const egressCost = Math.max(0, egress_gb - 1024) * 0.085;
  const requestCost = https_reqs_m * 0.012;

  const rawCost = egressCost + requestCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { egress_gb, https_reqs_m },
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
