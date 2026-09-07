/**
 * backend/src/services/pricing/domains/networking/nat-gateway.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "VPC NAT Gateway";
const DOMAIN = "networking";
const ALIASES = ["NAT Gateway", "AWS NAT Gateway", "NAT Gateway (VPC)"];
const FORMULA = "(gateways * hours * 0.045) + (data_processed_gb * 0.045)";

function calculate(config = {}) {
  const gateways = assertNonNegativeNumber(SERVICE, "gateways", config.gateways);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);
  const data_processed_gb = assertNonNegativeNumber(SERVICE, "data_processed_gb", config.data_processed_gb);

  const hourlyCost = gateways * hours * 0.045;
  const dataCost = data_processed_gb * 0.045;

  const rawCost = hourlyCost + dataCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { gateways, hours, data_processed_gb },
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
