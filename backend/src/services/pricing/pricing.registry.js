/**
 * backend/src/services/pricing/pricing.registry.js
 *
 * Registry for all deterministic AWS service pricing calculators.
 * Provides normalized lookup across canonical names and known aliases.
 */

const { normalizeServiceName } = require("./pricing.types");

// Compute
const lambdaPricer = require("./domains/compute/lambda.pricer");
const fargatePricer = require("./domains/compute/fargate.pricer");
const ec2Pricer = require("./domains/compute/ec2.pricer");
const eksPricer = require("./domains/compute/eks.pricer");
const appRunnerPricer = require("./domains/compute/app-runner.pricer");

// Database
const dynamoDbPricer = require("./domains/database/dynamodb.pricer");
const auroraServerlessPricer = require("./domains/database/aurora-serverless.pricer");
const rdsPricer = require("./domains/database/rds.pricer");
const elasticachePricer = require("./domains/database/elasticache.pricer");
const documentDbPricer = require("./domains/database/documentdb.pricer");
const redshiftServerlessPricer = require("./domains/database/redshift-serverless.pricer");

// Storage
const s3Pricer = require("./domains/storage/s3.pricer");
const efsPricer = require("./domains/storage/efs.pricer");
const ebsPricer = require("./domains/storage/ebs.pricer");
const glacierPricer = require("./domains/storage/glacier.pricer");

// Networking
const cloudfrontPricer = require("./domains/networking/cloudfront.pricer");
const apiGatewayPricer = require("./domains/networking/api-gateway.pricer");
const albPricer = require("./domains/networking/alb.pricer");
const natGatewayPricer = require("./domains/networking/nat-gateway.pricer");
const route53Pricer = require("./domains/networking/route53.pricer");
const wafPricer = require("./domains/networking/waf.pricer");

// Integration
const sqsPricer = require("./domains/integration/sqs.pricer");
const snsPricer = require("./domains/integration/sns.pricer");
const eventbridgePricer = require("./domains/integration/eventbridge.pricer");
const kinesisPricer = require("./domains/integration/kinesis.pricer");
const stepFunctionsPricer = require("./domains/integration/step-functions.pricer");

// Security
const cognitoPricer = require("./domains/security/cognito.pricer");
const secretsManagerPricer = require("./domains/security/secrets-manager.pricer");
const kmsPricer = require("./domains/security/kms.pricer");

// Analytics
const athenaPricer = require("./domains/analytics/athena.pricer");

const ALL_PRICERS = [
  lambdaPricer,
  fargatePricer,
  ec2Pricer,
  eksPricer,
  appRunnerPricer,
  dynamoDbPricer,
  auroraServerlessPricer,
  rdsPricer,
  elasticachePricer,
  documentDbPricer,
  redshiftServerlessPricer,
  s3Pricer,
  efsPricer,
  ebsPricer,
  glacierPricer,
  cloudfrontPricer,
  apiGatewayPricer,
  albPricer,
  natGatewayPricer,
  route53Pricer,
  wafPricer,
  sqsPricer,
  snsPricer,
  eventbridgePricer,
  kinesisPricer,
  stepFunctionsPricer,
  cognitoPricer,
  secretsManagerPricer,
  kmsPricer,
  athenaPricer
];

class PricingRegistry {
  constructor() {
    /** @type {Map<string, Object>} Canonical name -> pricer */
    this._canonicalMap = new Map();
    /** @type {Map<string, Object>} Normalized name/alias -> pricer */
    this._lookupMap = new Map();

    // Register all default built-in calculators
    for (const pricer of ALL_PRICERS) {
      this.register(pricer);
    }
  }

  /**
   * Register a pricing calculator.
   *
   * @param {Object} pricer
   * @param {string} pricer.service - Canonical service name
   * @param {string} pricer.domain - Architectural domain
   * @param {string[]} [pricer.aliases] - Alternate lookup names
   * @param {Function} pricer.calculate - Calculation function
   */
  register(pricer) {
    if (!pricer || !pricer.service || typeof pricer.calculate !== "function") {
      throw new Error(`Invalid pricing calculator definition for ${pricer?.service || "unknown"}`);
    }

    this._canonicalMap.set(pricer.service, pricer);

    // Map canonical name
    this._lookupMap.set(normalizeServiceName(pricer.service), pricer);

    // Map all aliases
    if (Array.isArray(pricer.aliases)) {
      for (const alias of pricer.aliases) {
        this._lookupMap.set(normalizeServiceName(alias), pricer);
      }
    }
  }

  /**
   * Retrieve a calculator by canonical name or alias.
   *
   * @param {string} serviceName
   * @returns {Object|null}
   */
  get(serviceName) {
    if (!serviceName) return null;
    const normalized = normalizeServiceName(serviceName);
    return this._lookupMap.get(normalized) || null;
  }

  /**
   * Check whether a calculator exists for the given service.
   *
   * @param {string} serviceName
   * @returns {boolean}
   */
  has(serviceName) {
    return this.get(serviceName) !== null;
  }

  /**
   * List all unique registered calculators.
   *
   * @returns {Object[]}
   */
  list() {
    return Array.from(this._canonicalMap.values());
  }

  /**
   * Return a list of all supported canonical service names.
   *
   * @returns {string[]}
   */
  getSupportedServices() {
    return Array.from(this._canonicalMap.keys());
  }

  /**
   * Return all calculators belonging to a specific domain.
   *
   * @param {string} domain
   * @returns {Object[]}
   */
  getByDomain(domain) {
    const d = (domain || "").toLowerCase();
    return this.list().filter(p => (p.domain || "").toLowerCase() === d);
  }

  /**
   * Retrieve schema for a given service.
   *
   * @param {string} serviceName
   * @returns {Object|null}
   */
  getSchema(serviceName) {
    const { getSchemaForService } = require("./pricing.schemas");
    return getSchemaForService(serviceName);
  }
}

// Singleton registry instance
const defaultRegistry = new PricingRegistry();

module.exports = {
  PricingRegistry,
  pricingRegistry: defaultRegistry
};
