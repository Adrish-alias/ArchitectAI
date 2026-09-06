const Groq = require("groq-sdk");
const env = require("../../../config/env");
const { BaseLLMProvider, LLMProviderError } = require("./base.provider");

class GroqProvider extends BaseLLMProvider {
  constructor(model = env.GROQ_MODEL) {
    super("groq", model);

    const clientOptions = {
      apiKey: env.GROQ_API_KEY || "dummy"
    };
    if (env.GROQ_BASE_URL) {
      clientOptions.baseURL = env.GROQ_BASE_URL;
    }

    this.client = new Groq(clientOptions);
  }

  validateConfig() {
    if (!env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is required when LLM_PROVIDER=groq");
    }
  }

  /**
   * Generates text via Groq SDK using standard chat completions.
   *
   * @param {Object} params
   * @param {string} params.systemPrompt
   * @param {string} params.userPrompt
   * @param {number} [params.temperature=0.1]
   * @param {number} [params.maxTokens=1200]
   * @returns {Promise<string>} Plain generated text string
   */
  async generateText({ systemPrompt, userPrompt, temperature = 0.1, maxTokens = 1200 }) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }

    const params = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    try {
      const completion = await this.client.chat.completions.create(params);
      const text = completion.choices?.[0]?.message?.content || "";
      return text.trim();
    } catch (err) {
      let safeMsg = err.message || "Unknown Groq error";
      if (env.GROQ_API_KEY && safeMsg.includes(env.GROQ_API_KEY)) {
        safeMsg = safeMsg.replace(env.GROQ_API_KEY, "[REDACTED]");
      }

      throw new LLMProviderError(safeMsg, {
        provider: this.name,
        model: this.model,
        statusCode: err.status || err.statusCode || 500,
        code: err.code || err.type || "GROQ_API_ERROR",
        originalError: err
      });
    }
  }

  /**
   * Helper method for testing with latency and token metrics.
   */
  async generateWithMetadata({ systemPrompt, userPrompt, temperature = 0.1, maxTokens = 1200 }) {
    const start = Date.now();
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }

    const params = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    try {
      const completion = await this.client.chat.completions.create(params);
      const latencyMs = Date.now() - start;
      const text = (completion.choices?.[0]?.message?.content || "").trim();

      return {
        text,
        latencyMs,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens || null,
          completionTokens: completion.usage?.completion_tokens || null,
          totalTokens: completion.usage?.total_tokens || null
        }
      };
    } catch (err) {
      let safeMsg = err.message || "Unknown Groq error";
      if (env.GROQ_API_KEY && safeMsg.includes(env.GROQ_API_KEY)) {
        safeMsg = safeMsg.replace(env.GROQ_API_KEY, "[REDACTED]");
      }

      throw new LLMProviderError(safeMsg, {
        provider: this.name,
        model: this.model,
        statusCode: err.status || err.statusCode || 500,
        code: err.code || err.type || "GROQ_API_ERROR",
        originalError: err
      });
    }
  }
}

module.exports = { GroqProvider };
