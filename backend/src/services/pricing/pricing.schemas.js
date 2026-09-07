/**
 * backend/src/services/pricing/pricing.schemas.js
 *
 * Canonical schema registry and validation utilities for the ArchitectAI
 * deterministic pricing engine.
 *
 * Serves as the single source of truth for input configuration schemas expected
 * by the deterministic calculators.
 */

const { pricingRegistry } = require("./pricing.registry");
const { normalizeServiceName } = require("./pricing.types");

/**
 * Schema definitions for all 30 supported AWS services.
 * Keys are canonical service names matching pricingRegistry.
 */
const CANONICAL_SCHEMAS = {
  // ─── COMPUTE ─────────────────────────────────────────────────────────────
  "AWS Lambda": {
    service: "AWS Lambda",
    domain: "compute",
    fields: {
      invocations_m: { type: "number", required: true, min: 0, description: "Monthly invocations in millions (e.g. 10 for 10M)" },
      memory_mb: { type: "number", required: true, min: 128, description: "Average allocated memory in MB (e.g. 128, 512, 1024)" },
      duration_ms: { type: "number", required: true, min: 1, description: "Average execution duration in milliseconds (e.g. 250)" }
    }
  },
  "AWS Fargate": {
    service: "AWS Fargate",
    domain: "compute",
    fields: {
      tasks: { type: "number", required: true, min: 0, description: "Number of concurrent tasks running" },
      vcpu: { type: "number", required: true, min: 0.25, description: "vCPU per task (e.g. 0.5, 1, 2, 4)" },
      memory_gb: { type: "number", required: true, min: 0.5, description: "Memory in GB per task (e.g. 1, 2, 4, 8)" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Running hours per month (standard 730)" }
    }
  },
  "Amazon EC2": {
    service: "Amazon EC2",
    domain: "compute",
    fields: {
      instances: { type: "number", required: true, min: 0, description: "Number of instances" },
      hourly_rate: { type: "number", required: true, min: 0, description: "Estimated hourly rate in USD based on instance type (e.g. 0.0416 for t3.medium)" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Running hours per month (standard 730)" }
    }
  },
  "Amazon EKS": {
    service: "Amazon EKS",
    domain: "compute",
    fields: {
      clusters: { type: "number", required: true, min: 0, description: "Number of EKS clusters" }
    }
  },
  "AWS App Runner": {
    service: "AWS App Runner",
    domain: "compute",
    fields: {
      instances: { type: "number", required: true, min: 0, description: "Number of provisioned container instances" },
      vcpu: { type: "number", required: true, min: 0.25, description: "vCPU per instance (e.g. 1, 2)" },
      memory_gb: { type: "number", required: true, min: 0.5, description: "Memory in GB per instance (e.g. 2, 4)" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Active hours per month (standard 730)" }
    }
  },

  // ─── DATABASE ────────────────────────────────────────────────────────────
  "Amazon DynamoDB": {
    service: "Amazon DynamoDB",
    domain: "database",
    fields: {
      storage_gb: { type: "number", required: true, min: 0, description: "Stored data in GB" },
      reads_m: { type: "number", required: true, min: 0, description: "Monthly read request units in millions" },
      writes_m: { type: "number", required: true, min: 0, description: "Monthly write request units in millions" }
    }
  },
  "Aurora Serverless v2": {
    service: "Aurora Serverless v2",
    domain: "database",
    fields: {
      avg_acu: { type: "number", required: true, min: 0, description: "Average Aurora Capacity Units (ACUs)" },
      storage_gb: { type: "number", required: true, min: 0, description: "Stored database data in GB" }
    }
  },
  "Amazon RDS": {
    service: "Amazon RDS",
    domain: "database",
    fields: {
      instances: { type: "number", required: true, min: 0, description: "Number of DB instances" },
      hourly_rate: { type: "number", required: true, min: 0, description: "Estimated DB instance hourly rate in USD (e.g. 0.068 for db.t3.medium)" },
      storage_gb: { type: "number", required: true, min: 0, description: "Allocated database storage in GB" },
      hours: { type: "number", required: false, min: 0, default: 730, description: "Running hours per month (defaults to 730)" }
    }
  },
  "Amazon ElastiCache": {
    service: "Amazon ElastiCache",
    domain: "database",
    fields: {
      nodes: { type: "number", required: true, min: 0, description: "Number of cache nodes" },
      hourly_rate: { type: "number", required: true, min: 0, description: "Estimated cache node hourly rate in USD (e.g. 0.034 for cache.t3.micro)" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Running hours per month (standard 730)" }
    }
  },
  "Amazon DocumentDB": {
    service: "Amazon DocumentDB",
    domain: "database",
    fields: {
      instances: { type: "number", required: true, min: 0, description: "Number of DocumentDB instances" },
      hourly_rate: { type: "number", required: true, min: 0, description: "Estimated instance hourly rate in USD" },
      storage_gb: { type: "number", required: true, min: 0, description: "Database storage in GB" },
      io_m: { type: "number", required: true, min: 0, description: "I/O requests in millions" },
      hours: { type: "number", required: false, min: 0, default: 730, description: "Running hours per month (defaults to 730)" }
    }
  },
  "Amazon Redshift Serverless": {
    service: "Amazon Redshift Serverless",
    domain: "database",
    fields: {
      avg_rpu: { type: "number", required: true, min: 0, description: "Average Redshift Processing Units (RPUs)" },
      hours_active: { type: "number", required: true, min: 0, description: "Active query processing hours per month" },
      storage_tb: { type: "number", required: true, min: 0, description: "Stored data in TB" }
    }
  },

  // ─── STORAGE ─────────────────────────────────────────────────────────────
  "Amazon S3": {
    service: "Amazon S3",
    domain: "storage",
    fields: {
      storage_gb: { type: "number", required: true, min: 0, description: "Storage in GB" },
      puts_k: { type: "number", required: true, min: 0, description: "PUT/COPY/POST requests in thousands" },
      gets_k: { type: "number", required: true, min: 0, description: "GET/SELECT requests in thousands" }
    }
  },
  "Amazon EFS": {
    service: "Amazon EFS",
    domain: "storage",
    fields: {
      storage_gb: { type: "number", required: true, min: 0, description: "Standard storage in GB" }
    }
  },
  "Amazon EBS (gp3)": {
    service: "Amazon EBS (gp3)",
    domain: "storage",
    fields: {
      storage_gb: { type: "number", required: true, min: 0, description: "Provisioned gp3 storage in GB" },
      volumes: { type: "number", required: true, min: 0, description: "Number of EBS volumes" }
    }
  },
  "S3 Glacier Deep Archive": {
    service: "S3 Glacier Deep Archive",
    domain: "storage",
    fields: {
      storage_gb: { type: "number", required: true, min: 0, description: "Archive storage in GB" },
      puts_k: { type: "number", required: true, min: 0, description: "PUT/archive requests in thousands" }
    }
  },

  // ─── NETWORKING / EDGE ───────────────────────────────────────────────────
  "Amazon CloudFront": {
    service: "Amazon CloudFront",
    domain: "networking",
    fields: {
      egress_gb: { type: "number", required: true, min: 0, description: "Data transfer out to internet in GB" },
      https_reqs_m: { type: "number", required: true, min: 0, description: "HTTPS requests in millions" }
    }
  },
  "Amazon API Gateway": {
    service: "Amazon API Gateway",
    domain: "networking",
    fields: {
      api_type: { type: "string", required: true, enum: ["HTTP", "REST"], description: '"HTTP" or "REST"' },
      reqs_m: { type: "number", required: true, min: 0, description: "API calls in millions" }
    }
  },
  "Application Load Balancer": {
    service: "Application Load Balancer",
    domain: "networking",
    fields: {
      albs: { type: "number", required: true, min: 0, description: "Number of Application Load Balancers" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Running hours per month (standard 730)" },
      avg_lcu: { type: "number", required: true, min: 0, description: "Average Load Balancer Capacity Units (LCUs)" }
    }
  },
  "VPC NAT Gateway": {
    service: "VPC NAT Gateway",
    domain: "networking",
    fields: {
      gateways: { type: "number", required: true, min: 0, description: "Number of NAT Gateways" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Running hours per month (standard 730)" },
      data_processed_gb: { type: "number", required: true, min: 0, description: "Data processed in GB" }
    }
  },
  "Amazon Route 53": {
    service: "Amazon Route 53",
    domain: "networking",
    fields: {
      hosted_zones: { type: "number", required: true, min: 0, description: "Number of hosted zones" },
      queries_m: { type: "number", required: true, min: 0, description: "DNS queries in millions" }
    }
  },
  "AWS WAF": {
    service: "AWS WAF",
    domain: "networking",
    fields: {
      web_acls: { type: "number", required: true, min: 0, description: "Number of Web ACLs" },
      rules: { type: "number", required: true, min: 0, description: "Number of rules across all Web ACLs" },
      reqs_m: { type: "number", required: true, min: 0, description: "Inspected web requests in millions" }
    }
  },

  // ─── INTEGRATION / EVENTS ────────────────────────────────────────────────
  "Amazon SQS": {
    service: "Amazon SQS",
    domain: "integration",
    fields: {
      requests_m: { type: "number", required: true, min: 0, description: "API actions / messages in millions" }
    }
  },
  "Amazon SNS": {
    service: "Amazon SNS",
    domain: "integration",
    fields: {
      requests_m: { type: "number", required: true, min: 0, description: "Publish requests in millions" },
      http_deliveries_m: { type: "number", required: true, min: 0, description: "HTTP/S notifications delivered in millions" }
    }
  },
  "Amazon EventBridge": {
    service: "Amazon EventBridge",
    domain: "integration",
    fields: {
      events_m: { type: "number", required: true, min: 0, description: "Custom/third-party events in millions" }
    }
  },
  "Amazon Kinesis Data Streams": {
    service: "Amazon Kinesis Data Streams",
    domain: "integration",
    fields: {
      shards: { type: "number", required: true, min: 0, description: "Number of provisioned shards" },
      hours: { type: "number", required: true, min: 0, default: 730, description: "Running hours per month (standard 730)" },
      put_payloads_m: { type: "number", required: true, min: 0, description: "PUT payload units in millions (50KB units)" }
    }
  },
  "AWS Step Functions": {
    service: "AWS Step Functions",
    domain: "integration",
    fields: {
      state_transitions_k: { type: "number", required: true, min: 0, description: "State transitions in thousands" }
    }
  },

  // ─── SECURITY ────────────────────────────────────────────────────────────
  "Amazon Cognito": {
    service: "Amazon Cognito",
    domain: "security",
    fields: {
      mau: { type: "number", required: true, min: 0, description: "Monthly Active Users (MAU)" }
    }
  },
  "AWS Secrets Manager": {
    service: "AWS Secrets Manager",
    domain: "security",
    fields: {
      secrets: { type: "number", required: true, min: 0, description: "Number of stored secrets" },
      api_calls_10k: { type: "number", required: true, min: 0, description: "API calls in units of 10,000 (e.g. 10 for 100k calls)" }
    }
  },
  "AWS KMS": {
    service: "AWS KMS",
    domain: "security",
    fields: {
      keys: { type: "number", required: true, min: 0, description: "Number of customer managed keys" },
      reqs_10k: { type: "number", required: true, min: 0, description: "Cryptographic requests in units of 10,000 (e.g. 20 for 200k requests)" }
    }
  },

  // ─── ANALYTICS ───────────────────────────────────────────────────────────
  "Amazon Athena": {
    service: "Amazon Athena",
    domain: "analytics",
    fields: {
      data_scanned_tb: { type: "number", required: true, min: 0, description: "Data scanned by queries in TB" }
    }
  }
};

/**
 * Retrieve the canonical schema for a service name or alias.
 *
 * @param {string} serviceName
 * @returns {Object|null} Schema object or null if unsupported
 */
function getSchemaForService(serviceName) {
  if (!serviceName) return null;
  const pricer = pricingRegistry.get(serviceName);
  if (!pricer) return null;
  return CANONICAL_SCHEMAS[pricer.service] || null;
}

/**
 * Filter and retrieve schemas for a list of selected services.
 *
 * @param {string[]} serviceNames
 * @returns {{ supportedSchemas: Object[], unsupportedServices: string[] }}
 */
function getSchemasForServices(serviceNames = []) {
  const supportedSchemas = [];
  const unsupportedServices = [];
  const seenCanonical = new Set();

  for (const name of serviceNames) {
    const schema = getSchemaForService(name);
    if (schema) {
      if (!seenCanonical.has(schema.service)) {
        seenCanonical.add(schema.service);
        supportedSchemas.push(schema);
      }
    } else {
      unsupportedServices.push(name);
    }
  }

  return { supportedSchemas, unsupportedServices };
}

/**
 * Formats a compact schema representation for injection into LLM prompts.
 *
 * @param {Object[]} schemas - Array of schema objects from getSchemasForServices
 * @returns {string} Formatted schema documentation
 */
function formatSchemasForPrompt(schemas = []) {
  if (!schemas || schemas.length === 0) {
    return "(No supported services selected)";
  }

  return schemas.map(schema => {
    const fieldLines = Object.entries(schema.fields).map(([fieldName, def]) => {
      const typeStr = def.enum ? def.enum.map(e => `"${e}"`).join(" | ") : def.type;
      const optStr = def.required ? "" : " (optional, default: " + def.default + ")";
      return `    "${fieldName}": ${typeStr} // ${def.description}${optStr}`;
    }).join("\n");

    return `${schema.service}:\n{\n${fieldLines}\n}`;
  }).join("\n\n");
}

/**
 * Validates a single service's pricing_config against its canonical schema.
 * Rejects:
 * - missing required fields
 * - invalid types
 * - NaN, Infinity, negative values
 * - unsupported enum values
 * - unexpected/unknown fields
 *
 * @param {string} serviceName
 * @param {Object} pricingConfig
 * @returns {{ valid: boolean, sanitizedConfig: Object, errors: string[] }}
 */
function validateServicePricingConfig(serviceName, pricingConfig) {
  const errors = [];
  const schema = getSchemaForService(serviceName);

  if (!schema) {
    return {
      valid: false,
      sanitizedConfig: {},
      errors: [`Unsupported service: "${serviceName}"`]
    };
  }

  if (!pricingConfig || typeof pricingConfig !== "object" || Array.isArray(pricingConfig)) {
    return {
      valid: false,
      sanitizedConfig: {},
      errors: [`pricing_config for "${serviceName}" must be a non-null object`]
    };
  }

  const sanitizedConfig = {};
  const schemaFields = schema.fields;

  // 1. Check for unexpected / unknown fields
  for (const key of Object.keys(pricingConfig)) {
    if (!schemaFields[key]) {
      errors.push(`Unknown field "${key}" is not supported for ${schema.service}`);
    }
  }

  // 2. Validate all schema fields
  for (const [fieldName, fieldDef] of Object.entries(schemaFields)) {
    let val = pricingConfig[fieldName];

    // Apply default if undefined and not strictly required
    if (val === undefined || val === null) {
      if (fieldDef.required) {
        errors.push(`Missing required field "${fieldName}" for ${schema.service}`);
        continue;
      } else if (fieldDef.default !== undefined) {
        val = fieldDef.default;
      } else {
        continue;
      }
    }

    // Type validation
    if (fieldDef.type === "number") {
      if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
        errors.push(`Field "${fieldName}" on ${schema.service} must be a finite number, received: ${JSON.stringify(val)}`);
        continue;
      }
      if (val < (fieldDef.min !== undefined ? fieldDef.min : 0)) {
        errors.push(`Field "${fieldName}" on ${schema.service} must be >= ${fieldDef.min ?? 0}, received: ${val}`);
        continue;
      }
      sanitizedConfig[fieldName] = val;
    } else if (fieldDef.type === "string") {
      if (typeof val !== "string") {
        errors.push(`Field "${fieldName}" on ${schema.service} must be a string, received: ${JSON.stringify(val)}`);
        continue;
      }
      if (fieldDef.enum && !fieldDef.enum.includes(val)) {
        errors.push(`Field "${fieldName}" on ${schema.service} must be one of [${fieldDef.enum.join(", ")}], received: "${val}"`);
        continue;
      }
      sanitizedConfig[fieldName] = val;
    }
  }

  return {
    valid: errors.length === 0,
    sanitizedConfig,
    errors
  };
}

/**
 * Validates the full LLM output payload.
 * Supports both { services: [...] } and { pricing_configs: [...] } envelopes.
 *
 * @param {Object} payload - Parsed LLM JSON output
 * @param {string[]} selectedServices - Services selected in Step 2
 * @returns {{ valid: boolean, configs: Array<{ name: string, service: string, pricing_config: Object, assumptions: string[] }>, errors: string[], unsupportedServices: string[] }}
 */
function validatePricingPayload(payload, selectedServices = []) {
  const errors = [];
  const configs = [];
  const unsupportedServices = [];

  if (!payload || typeof payload !== "object") {
    return {
      valid: false,
      configs: [],
      errors: ["Pricing output must be a valid JSON object"],
      unsupportedServices: []
    };
  }

  const items = Array.isArray(payload.services)
    ? payload.services
    : (Array.isArray(payload.pricing_configs) ? payload.pricing_configs : null);

  if (!items) {
    return {
      valid: false,
      configs: [],
      errors: ['Pricing output must contain a "services" or "pricing_configs" array'],
      unsupportedServices: []
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rawName = item.name || item.service;

    if (!rawName || typeof rawName !== "string") {
      errors.push(`Item at index ${i} is missing a valid service name`);
      continue;
    }

    const pricer = pricingRegistry.get(rawName);
    if (!pricer) {
      unsupportedServices.push(rawName);
      continue;
    }

    const canonicalName = pricer.service;
    const configResult = validateServicePricingConfig(canonicalName, item.pricing_config);

    if (!configResult.valid) {
      errors.push(...configResult.errors);
      continue;
    }

    const assumptions = Array.isArray(item.assumptions)
      ? item.assumptions.map(a => String(a).trim()).filter(Boolean)
      : [];

    configs.push({
      name: canonicalName,
      service: canonicalName,
      pricing_config: configResult.sanitizedConfig,
      assumptions
    });
  }

  return {
    valid: errors.length === 0 && configs.length > 0,
    configs,
    errors,
    unsupportedServices
  };
}

module.exports = {
  CANONICAL_SCHEMAS,
  getSchemaForService,
  getSchemasForServices,
  formatSchemasForPrompt,
  validateServicePricingConfig,
  validatePricingPayload
};
