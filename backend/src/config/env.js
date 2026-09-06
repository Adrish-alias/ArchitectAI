require("dotenv").config();

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AWS_BEARER_TOKEN_BEDROCK: process.env.AWS_BEARER_TOKEN_BEDROCK,
  PORT: process.env.PORT || 5000,
  RAG_ENABLED: process.env.RAG_ENABLED !== "false",
  RAG_RELEVANCE_THRESHOLD: process.env.RAG_RELEVANCE_THRESHOLD ? parseFloat(process.env.RAG_RELEVANCE_THRESHOLD) : 0.45,
  LLM_PROVIDER: (process.env.LLM_PROVIDER || "bedrock").toLowerCase(),
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || "arn:aws:bedrock:us-east-1:434702088658:inference-profile/us.meta.llama3-3-70b-instruct-v1:0",
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  GROQ_BASE_URL: process.env.GROQ_BASE_URL
};


