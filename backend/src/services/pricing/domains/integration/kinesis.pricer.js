/**
 * backend/src/services/pricing/domains/integration/kinesis.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "Amazon Kinesis Data Streams";
const DOMAIN = "integration";
const ALIASES = ["Kinesis", "Amazon Kinesis", "Kinesis Data Streams"];
const FORMULA = "(shards * hours * 0.015) + (put_payloads_m * 0.014)";

function calculate(config = {}) {
  const shards = assertNonNegativeNumber(SERVICE, "shards", config.shards);
  const hours = assertNonNegativeNumber(SERVICE, "hours", config.hours);
  const put_payloads_m = assertNonNegativeNumber(SERVICE, "put_payloads_m", config.put_payloads_m);

  const shardCost = shards * hours * 0.015;
  const payloadCost = put_payloads_m * 0.014;

  const rawCost = shardCost + payloadCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { shards, hours, put_payloads_m },
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
