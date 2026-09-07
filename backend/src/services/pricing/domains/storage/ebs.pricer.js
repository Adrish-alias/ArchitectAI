/**
 * backend/src/services/pricing/domains/storage/ebs.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon EBS (gp3)";
const DOMAIN = "storage";
const ALIASES = ["Amazon EBS", "EBS", "Amazon EBS gp3", "EBS gp3"];
const FORMULA = "storage_gb * 0.08";

function calculate(config = {}) {
  const storage_gb = assertNonNegativeNumber(SERVICE, "storage_gb", config.storage_gb);
  const volumes = assertNonNegativeNumber(SERVICE, "volumes", config.volumes);

  // Initial baseline: storage capacity price only, extra IOPS ignored per spec
  const rawCost = storage_gb * 0.08;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { storage_gb, volumes },
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
