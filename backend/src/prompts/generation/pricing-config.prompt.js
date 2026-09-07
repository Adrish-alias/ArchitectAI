/**
 * backend/src/prompts/generation/pricing-config.prompt.js
 *
 * Prompts for Step 2.5: Pricing Configuration Generation.
 *
 * Generates structured sizing and monthly usage inputs for the deterministic
 * AWS pricing engine. The LLM provides ONLY usage parameters and workload-derived
 * assumptions; all dollar costs are computed deterministically by the pricing engine.
 */

/**
 * Build the Step 2.5 system prompt.
 *
 * @param {string} schemasContext - Dynamically formatted schema definitions for selected services
 * @returns {string}
 */
function buildPricingConfigSystemPrompt(schemasContext) {
  return `You are a cloud financial operations (FinOps) and AWS sizing specialist.
Output ONLY a single valid JSON object containing monthly usage and sizing configurations for the selected AWS services.

CRITICAL RULES:
1. Output MUST be valid JSON only. No markdown fences, no backticks, no comments, no conversational text.
2. DO NOT calculate prices, dollar costs, or totals. The pricing engine calculates all costs deterministically.
3. DO NOT output formulas.
4. ONLY output configurations for the supported services listed below. Do NOT configure unselected services.
5. ONLY include the exact field names defined in each service's schema below. Do NOT invent fields.
6. All numeric values MUST be non-negative finite numbers (>= 0).
7. Values represent estimated MONTHLY usage based on the user's workload scale.
8. For services requiring "hourly_rate" (e.g. EC2, RDS, ElastiCache, DocumentDB), estimate a realistic standard on-demand hourly rate in USD for the chosen instance size (e.g., db.t3.medium ~$0.068/hr, t3.medium ~$0.0416/hr) and state the instance type assumption.

SCHEMAS FOR SELECTED SERVICES:
${schemasContext}

PRODUCE THIS EXACT JSON STRUCTURE:
{
  "services": [
    {
      "name": "exact canonical AWS service name",
      "pricing_config": {
        // exact fields from the service schema above
      },
      "assumptions": [
        "concise explanation deriving each parameter from user requirements"
      ]
    }
  ]
}`;
}

/**
 * Build the Step 2.5 user prompt.
 *
 * @param {Object} params
 * @param {string} params.idea
 * @param {string} params.users
 * @param {string} [params.budget]
 * @param {string[]} [params.features]
 * @param {string[]} params.selectedServices - Canonical or extracted service names
 * @param {string} [params.analysis] - Scale analysis from Step 1
 * @returns {string}
 */
function buildPricingConfigUserPrompt({ idea, users, budget, features, selectedServices = [], analysis }) {
  const featuresList = Array.isArray(features) && features.length > 0
    ? features.join(", ")
    : "standard web/application features";

  const servicesList = selectedServices.length > 0
    ? selectedServices.map(s => `- ${s}`).join("\n")
    : "- (None specified)";

  return `Workload Requirements:
- Application: ${idea}
- Target Users / Scale: ${users}
- Target Budget: ${budget || "Not specified"}
- Key Features: ${featuresList}

Scale Analysis Summary:
${analysis || "Standard multi-tier workload"}

Selected AWS Services to Size:
${servicesList}

Generate the exact sizing configurations and assumptions matching the schemas for these selected services. Strict JSON only.`;
}

module.exports = {
  buildPricingConfigSystemPrompt,
  buildPricingConfigUserPrompt
};
