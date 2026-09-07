/**
 * backend/src/services/pricing/domains/networking/waf.pricer.js
 */

const { assertNonNegativeNumber, roundCurrency } = require("../../pricing.types");

const SERVICE = "AWS WAF";
const DOMAIN = "networking";
const ALIASES = ["WAF", "AWS WAF WebACL"];
const FORMULA = "(web_acls * 5.00) + (rules * 1.00) + (reqs_m * 0.60)";

function calculate(config = {}) {
  const web_acls = assertNonNegativeNumber(SERVICE, "web_acls", config.web_acls);
  const rules = assertNonNegativeNumber(SERVICE, "rules", config.rules);
  const reqs_m = assertNonNegativeNumber(SERVICE, "reqs_m", config.reqs_m);

  const aclCost = web_acls * 5.00;
  const ruleCost = rules * 1.00;
  const reqCost = reqs_m * 0.60;

  const rawCost = aclCost + ruleCost + reqCost;

  return {
    service: SERVICE,
    domain: DOMAIN,
    monthlyCostUsd: roundCurrency(rawCost),
    rawMonthlyCostUsd: rawCost,
    currency: "USD",
    pricingSource: "static_formula",
    inputs: { web_acls, rules, reqs_m },
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
