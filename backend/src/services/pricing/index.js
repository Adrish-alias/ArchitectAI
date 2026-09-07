/**
 * backend/src/services/pricing/index.js
 *
 * Public API for the ArchitectAI deterministic pricing engine.
 */

const { PricingService, pricingService } = require("./pricing.service");
const { PricingRegistry, pricingRegistry } = require("./pricing.registry");
const { PricingValidationError, roundCurrency, normalizeServiceName } = require("./pricing.types");
const {
  CANONICAL_SCHEMAS,
  getSchemaForService,
  getSchemasForServices,
  formatSchemasForPrompt,
  validateServicePricingConfig,
  validatePricingPayload
} = require("./pricing.schemas");

module.exports = {
  PricingService,
  pricingService,
  PricingRegistry,
  pricingRegistry,
  PricingValidationError,
  roundCurrency,
  normalizeServiceName,
  CANONICAL_SCHEMAS,
  getSchemaForService,
  getSchemasForServices,
  formatSchemasForPrompt,
  validateServicePricingConfig,
  validatePricingPayload
};
