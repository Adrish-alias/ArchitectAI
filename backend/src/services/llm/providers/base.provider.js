/**
 * Base LLM Provider definition and normalized error class.
 */

class LLMProviderError extends Error {
  constructor(message, { provider, model, statusCode, code, originalError } = {}) {
    super(message);
    this.name = "LLMProviderError";
    this.provider = provider;
    this.model = model;
    this.statusCode = statusCode;
    this.code = code;
    this.originalError = originalError;
  }
}

class BaseLLMProvider {
  constructor(name, model) {
    this.name = name;
    this.model = model;
  }

  /**
   * Generate text from the LLM given system and user prompts.
   *
   * @param {Object} params
   * @param {string} params.systemPrompt
   * @param {string} params.userPrompt
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @returns {Promise<string>} Generated text string
   */
  async generateText({ systemPrompt, userPrompt, temperature, maxTokens }) {
    throw new Error(`generateText() must be implemented by ${this.name} provider`);
  }

  /**
   * Validate provider configuration and credentials.
   * Throws an error if required configuration is missing.
   */
  validateConfig() {
    throw new Error(`validateConfig() must be implemented by ${this.name} provider`);
  }
}

module.exports = {
  BaseLLMProvider,
  LLMProviderError
};
