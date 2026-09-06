/**
 * Unified LLM Service Abstraction for ArchitectAI.
 *
 * Exposes a provider-neutral interface delegating to the configured provider
 * specified by LLM_PROVIDER in backend/.env ("bedrock" | "groq").
 */

const env = require("../../config/env");
const { BedrockProvider } = require("./providers/bedrock.provider");
const { GroqProvider } = require("./providers/groq.provider");
const { LLMProviderError } = require("./providers/base.provider");

const SUPPORTED_PROVIDERS = ["bedrock", "groq"];

let activeProviderInstance = null;

/**
 * Validate LLM_PROVIDER and ensure required provider credentials are present.
 * Throws a descriptive error on failure; never silently falls back.
 */
function validateProviderConfig() {
  const provider = (env.LLM_PROVIDER || "").toLowerCase();

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported LLM_PROVIDER: "${env.LLM_PROVIDER}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  const instance = getActiveProvider();
  instance.validateConfig();
}

/**
 * Get or instantiate the active LLM provider.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {import("./providers/base.provider").BaseLLMProvider}
 */
function getActiveProvider(forceRefresh = false) {
  const provider = (env.LLM_PROVIDER || "").toLowerCase();
  const currentModel = provider === "bedrock" ? env.BEDROCK_MODEL_ID : env.GROQ_MODEL;

  if (
    activeProviderInstance &&
    !forceRefresh &&
    activeProviderInstance.name === provider &&
    activeProviderInstance.model === currentModel
  ) {
    return activeProviderInstance;
  }

  switch (provider) {
    case "bedrock":
      activeProviderInstance = new BedrockProvider();
      break;
    case "groq":
      activeProviderInstance = new GroqProvider();
      break;
    default:
      throw new Error(
        `Unsupported LLM_PROVIDER: "${env.LLM_PROVIDER}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`
      );
  }

  return activeProviderInstance;
}

/**
 * Provider-agnostic text generation.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {number} [params.temperature=0.1]
 * @param {number} [params.maxTokens=1200]
 * @returns {Promise<string>} Generated text string
 */
async function generateText({ systemPrompt, userPrompt, temperature = 0.1, maxTokens = 1200 }) {
  const provider = getActiveProvider();
  return provider.generateText({ systemPrompt, userPrompt, temperature, maxTokens });
}

/**
 * Convenience drop-in replacement matching the exact signature of callLlama(system, user, maxLen).
 *
 * @param {string} system - System prompt
 * @param {string} user   - User prompt
 * @param {number} [maxLen=1200] - Maximum generation tokens
 * @param {Object} [options={}]  - Additional optional parameters (e.g. temperature)
 * @returns {Promise<string>} Generated text string
 */
async function callLLM(system, user, maxLen = 1200, options = {}) {
  const provider = getActiveProvider();
  const temperature = options.temperature !== undefined ? options.temperature : 0.1;
  return provider.generateText({
    systemPrompt: system,
    userPrompt: user,
    temperature,
    maxTokens: maxLen
  });
}

/**
 * Returns metadata about the active provider and model for logging and health checks.
 *
 * @returns {{ provider: string, model: string }}
 */
function getProviderInfo() {
  const provider = getActiveProvider();
  // Format display name
  const displayName = provider.name === "bedrock" ? "Bedrock" : (provider.name === "groq" ? "Groq" : provider.name);
  return {
    provider: displayName,
    model: provider.model
  };
}

module.exports = {
  callLLM,
  generateText,
  getActiveProvider,
  validateProviderConfig,
  getProviderInfo,
  LLMProviderError,
  SUPPORTED_PROVIDERS
};
