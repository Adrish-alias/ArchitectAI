/**
 * backend/src/services/pricing/pricing.types.js
 *
 * Types, error classes, and validation primitives for the ArchitectAI
 * deterministic AWS pricing engine.
 */

class PricingValidationError extends Error {
  /**
   * @param {string} service - Name of the AWS service
   * @param {string} field - Configuration field that failed validation
   * @param {*} value - The invalid value supplied
   * @param {string} message - Human-readable explanation
   */
  constructor(service, field, value, message) {
    super(`[${service}] Pricing validation error on "${field}": ${message} (received: ${JSON.stringify(value)})`);
    this.name = "PricingValidationError";
    this.service = service;
    this.field = field;
    this.value = value;
    this.statusCode = 400;
  }
}

/**
 * Validates that a field is a valid non-negative finite number.
 *
 * @param {string} service
 * @param {string} field
 * @param {*} value
 * @param {Object} [options]
 * @param {boolean} [options.allowZero=true]
 * @param {boolean} [options.required=true]
 * @returns {number}
 */
function assertNonNegativeNumber(service, field, value, { allowZero = true, required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new PricingValidationError(service, field, value, "Field is required and cannot be missing/null");
    }
    return 0;
  }

  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new PricingValidationError(service, field, value, "Must be a valid finite number");
  }

  if (value < 0) {
    throw new PricingValidationError(service, field, value, "Must be non-negative (>= 0)");
  }

  if (!allowZero && value === 0) {
    throw new PricingValidationError(service, field, value, "Must be strictly positive (> 0)");
  }

  return value;
}

/**
 * Validates that a string field matches one of the allowed enum values.
 *
 * @param {string} service
 * @param {string} field
 * @param {*} value
 * @param {string[]} allowedValues
 * @returns {string}
 */
function assertEnum(service, field, value, allowedValues) {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw new PricingValidationError(
      service,
      field,
      value,
      `Must be one of [${allowedValues.join(", ")}]`
    );
  }
  return value;
}

/**
 * Normalizes service names for registry lookups:
 * - strips non-breaking spaces (\u00a0)
 * - trims and collapses whitespace
 * - lowercases
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeServiceName(name) {
  if (typeof name !== "string") return "";
  return name
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Rounds a dollar amount to 2 decimal places using epsilon rounding.
 *
 * @param {number} amount
 * @returns {number}
 */
function roundCurrency(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

module.exports = {
  PricingValidationError,
  assertNonNegativeNumber,
  assertEnum,
  normalizeServiceName,
  roundCurrency
};
