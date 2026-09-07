/**
 * backend/src/services/pricing/pricing.service.js
 *
 * Core deterministic pricing engine for ArchitectAI.
 * Orchestrates service-specific pricing calculators via the PricingRegistry.
 */

const { pricingRegistry } = require("./pricing.registry");
const { roundCurrency } = require("./pricing.types");

class PricingService {
  /**
   * @param {import("./pricing.registry").PricingRegistry} [registry=pricingRegistry]
   */
  constructor(registry = pricingRegistry) {
    this.registry = registry;
  }

  /**
   * Calculate cost for an individual AWS service.
   *
   * @param {string} serviceName - Canonical or alias service name
   * @param {Object} [pricingConfig={}] - Service-specific sizing/usage parameters
   * @returns {Object} Service calculation result
   */
  calculateServiceCost(serviceName, pricingConfig = {}) {
    if (!serviceName || typeof serviceName !== "string") {
      return {
        service: serviceName || "Unknown",
        supported: false,
        monthlyCostUsd: null,
        currency: "USD",
        reason: "Invalid or missing service name"
      };
    }

    const pricer = this.registry.get(serviceName);

    if (!pricer) {
      return {
        service: serviceName,
        supported: false,
        monthlyCostUsd: null,
        currency: "USD",
        reason: "Pricing calculator not implemented"
      };
    }

    // Calculator runs validation and produces exact unrounded and rounded figures
    const calculation = pricer.calculate(pricingConfig);

    return {
      name: pricer.service,
      service: pricer.service,
      domain: calculation.domain,
      supported: true,
      monthlyCostUsd: calculation.monthlyCostUsd,
      rawMonthlyCostUsd: calculation.rawMonthlyCostUsd,
      currency: calculation.currency || "USD",
      pricingSource: calculation.pricingSource || "static_formula",
      inputs: calculation.inputs,
      formula: calculation.formula
    };
  }

  /**
   * Calculate deterministic pricing across a set of architecture services.
   *
   * @param {Object} params
   * @param {Array<{ name: string, pricing_config?: Object, config?: Object }>} params.services
   * @returns {Object} Architecture pricing summary
   */
  calculateArchitectureCost({ services = [] } = {}) {
    if (!Array.isArray(services)) {
      throw new Error('PricingService.calculateArchitectureCost expects an object with a "services" array');
    }

    const serviceResults = [];
    let unroundedTotal = 0;
    let supportedCount = 0;
    let unsupportedCount = 0;

    for (const item of services) {
      const serviceName = item.name || item.service;
      const config = item.pricing_config || item.config || {};

      try {
        const result = this.calculateServiceCost(serviceName, config);
        serviceResults.push(result);

        if (result.supported && typeof result.rawMonthlyCostUsd === "number") {
          unroundedTotal += result.rawMonthlyCostUsd;
          supportedCount++;
        } else {
          unsupportedCount++;
        }
      } catch (err) {
        // If an individual supported service failed validation (e.g. negative input)
        // rethrow or attach error according to validation rules
        throw err;
      }
    }

    return {
      services: serviceResults,
      totalMonthlyCostUsd: roundCurrency(unroundedTotal),
      rawTotalMonthlyCostUsd: unroundedTotal,
      currency: "USD",
      pricingSource: "deterministic_engine",
      summary: {
        totalServices: services.length,
        supportedServices: supportedCount,
        unsupportedServices: unsupportedCount
      }
    };
  }

  /**
   * Check if a given service is supported by the engine.
   *
   * @param {string} serviceName
   * @returns {boolean}
   */
  isServiceSupported(serviceName) {
    return this.registry.has(serviceName);
  }

  /**
   * Get all supported service names.
   *
   * @returns {string[]}
   */
  getSupportedServices() {
    return this.registry.getSupportedServices();
  }
}

// Default singleton instance
const pricingService = new PricingService();

module.exports = {
  PricingService,
  pricingService
};
