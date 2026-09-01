require("dotenv").config();

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AWS_BEARER_TOKEN_BEDROCK: process.env.AWS_BEARER_TOKEN_BEDROCK,
  PORT: process.env.PORT || 5000
};
