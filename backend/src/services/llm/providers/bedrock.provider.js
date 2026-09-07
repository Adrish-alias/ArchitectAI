const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require("@aws-sdk/client-bedrock-runtime");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const env = require("../../../config/env");
const { BaseLLMProvider, LLMProviderError } = require("./base.provider");

/**
 * Check if the model ID is an OpenAI-compatible model on AWS Bedrock (e.g. GPT-OSS).
 */
function isOpenAIModel(modelId = "") {
  const m = modelId.toLowerCase();
  return m.startsWith("openai.") || m.includes("gpt-oss");
}

class BedrockProvider extends BaseLLMProvider {
  constructor(modelId = env.BEDROCK_MODEL_ID) {
    super("bedrock", modelId);

    this.client = new BedrockRuntimeClient({
      region: "us-east-1",
      requestHandler: new NodeHttpHandler(),
      credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
      middlewareStack: {
        add: (next) => async (args) => {
          args.request.headers["Authorization"] =
            `Bearer ${env.AWS_BEARER_TOKEN_BEDROCK}`;
          return next(args);
        }
      }
    });
  }

  validateConfig() {
    if (!env.AWS_BEARER_TOKEN_BEDROCK) {
      throw new Error("AWS_BEARER_TOKEN_BEDROCK is required when LLM_PROVIDER=bedrock");
    }
  }

  /**
   * Generates text via AWS Bedrock supporting Llama 3 and OpenAI/GPT-OSS models.
   *
   * @param {Object} params
   * @param {string} params.systemPrompt
   * @param {string} params.userPrompt
   * @param {number} [params.temperature=0.1]
   * @param {number} [params.maxTokens=1200]
   * @returns {Promise<string>}
   */
  async generateText({ systemPrompt, userPrompt, temperature = 0.1, maxTokens = 1200, step }) {
    let command;

    if (isOpenAIModel(this.model)) {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      if (userPrompt) {
        messages.push({ role: "user", content: userPrompt });
      }

      command = new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          messages,
          max_tokens: maxTokens,
          temperature
        })
      });
    } else {
      // Existing Llama 3 envelope preserved exactly
      const prompt = [
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>",
        systemPrompt || "",
        "<|eot_id|><|start_header_id|>user<|end_header_id|>",
        userPrompt || "",
        "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
      ].join("\n");

      command = new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt,
          max_gen_len: maxTokens,
          temperature,
          top_p: 0.9
        })
      });
    }

    try {
      const response = await this.client.send(command);
      const decoded = new TextDecoder().decode(response.body);
      const result = JSON.parse(decoded);

      let text = "";
      if (isOpenAIModel(this.model)) {
        const choice = result.choices?.[0];
        const finishReason = choice?.finish_reason;
        const usage = result.usage;

        const stepLabel = step || (
          maxTokens === 600 ? "Step 1: Classification" :
          maxTokens === 1500 ? "Step 1.1 / RAG Requirement Analyzer" :
          maxTokens === 4500 ? "Step 2: Service Selection" :
          maxTokens === 6000 ? "Step 3: JSON Assembly" :
          maxTokens === 1800 ? "Step 4: Mermaid Validation" :
          maxTokens === 5000 ? "Correction Loop" :
          "LLM Call"
        );

        console.log(`[Bedrock ${this.model}] [${stepLabel}] maxTokens: ${maxTokens} | prompt_tokens: ${usage?.prompt_tokens ?? "N/A"}, completion_tokens: ${usage?.completion_tokens ?? "N/A"}, total_tokens: ${usage?.total_tokens ?? "N/A"}, finish_reason: ${finishReason ?? "unknown"}`);
        if (finishReason === "length") {
          console.warn(`[Bedrock ${this.model}] [${stepLabel}] WARNING: Response truncated by token limit (finish_reason=length, completion_tokens=${usage?.completion_tokens ?? "ceiling"})!`);
        }

        text = choice?.message?.content || "";
        if (text.includes("</reasoning>")) {
          text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>\s*/i, "");
        }
      } else {
        text = result.generation || "";
      }

      return text.trim();
    } catch (err) {
      // Sanitize potential token leaks in error message
      let safeMsg = err.message || "Unknown Bedrock error";
      if (env.AWS_BEARER_TOKEN_BEDROCK && safeMsg.includes(env.AWS_BEARER_TOKEN_BEDROCK)) {
        safeMsg = safeMsg.replace(env.AWS_BEARER_TOKEN_BEDROCK, "[REDACTED]");
      }

      throw new LLMProviderError(safeMsg, {
        provider: this.name,
        model: this.model,
        statusCode: err.$metadata?.httpStatusCode || 500,
        code: err.name,
        originalError: err
      });
    }
  }

  /**
   * Helper method for testing with latency and token metrics.
   */
  async generateWithMetadata({ systemPrompt, userPrompt, temperature = 0.1, maxTokens = 1200 }) {
    const start = Date.now();
    let command;

    if (isOpenAIModel(this.model)) {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      if (userPrompt) {
        messages.push({ role: "user", content: userPrompt });
      }

      command = new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          messages,
          max_tokens: maxTokens,
          temperature
        })
      });
    } else {
      const prompt = [
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>",
        systemPrompt || "",
        "<|eot_id|><|start_header_id|>user<|end_header_id|>",
        userPrompt || "",
        "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
      ].join("\n");

      command = new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt,
          max_gen_len: maxTokens,
          temperature,
          top_p: 0.9
        })
      });
    }

    try {
      const response = await this.client.send(command);
      const latencyMs = Date.now() - start;
      const decoded = new TextDecoder().decode(response.body);
      const result = JSON.parse(decoded);

      let text = "";
      let tokenUsage = null;

      if (isOpenAIModel(this.model)) {
        text = result.choices?.[0]?.message?.content || "";
        if (text.includes("</reasoning>")) {
          text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>\s*/i, "");
        }
        tokenUsage = {
          promptTokens: result.usage?.prompt_tokens ?? null,
          completionTokens: result.usage?.completion_tokens ?? null,
          totalTokens: result.usage?.total_tokens ?? null,
          finishReason: result.choices?.[0]?.finish_reason ?? null
        };
      } else {
        text = result.generation || "";
        tokenUsage = {
          promptTokens: result.prompt_token_count ?? null,
          completionTokens: result.generation_token_count ?? null,
          totalTokens: (result.prompt_token_count && result.generation_token_count)
            ? result.prompt_token_count + result.generation_token_count
            : null
        };
      }

      return {
        text: text.trim(),
        latencyMs,
        tokenUsage
      };
    } catch (err) {
      let safeMsg = err.message || "Unknown Bedrock error";
      if (env.AWS_BEARER_TOKEN_BEDROCK && safeMsg.includes(env.AWS_BEARER_TOKEN_BEDROCK)) {
        safeMsg = safeMsg.replace(env.AWS_BEARER_TOKEN_BEDROCK, "[REDACTED]");
      }

      throw new LLMProviderError(safeMsg, {
        provider: this.name,
        model: this.model,
        statusCode: err.$metadata?.httpStatusCode || 500,
        code: err.name,
        originalError: err
      });
    }
  }
}

module.exports = { BedrockProvider, isOpenAIModel };
