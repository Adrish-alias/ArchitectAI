const app = require("./app");
const { PORT } = require("./config/env");
const { validateProviderConfig, getProviderInfo } = require("./services/llm/llm.service");

// Validate LLM provider configuration at startup — fails fast if invalid or missing credentials
validateProviderConfig();
const providerInfo = getProviderInfo();

const server = app.listen(PORT);

server.on("listening", () => {
  console.log(`AWS Architect Agent running on port ${PORT}`);
  console.log(`LLM Provider: ${providerInfo.provider}`);
  console.log(`LLM Model: ${providerInfo.model}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`ERROR: Port ${PORT} is already in use. Kill the existing process or use a different port.`);
  } else {
    console.error(`ERROR: Server failed to start: ${err.message}`);
  }
  process.exit(1);
});
