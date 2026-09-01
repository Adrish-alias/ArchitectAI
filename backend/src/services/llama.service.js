const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require("@aws-sdk/client-bedrock-runtime");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const { AWS_BEARER_TOKEN_BEDROCK } = require("../config/env");

/* =========================
   Bedrock Client
========================= */
const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: new NodeHttpHandler(),
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
  middlewareStack: {
    add: (next) => async (args) => {
      args.request.headers["Authorization"] =
        `Bearer ${AWS_BEARER_TOKEN_BEDROCK}`;
      return next(args);
    }
  }
});

/* =========================
   Llama Call
========================= */
async function callLlama(system, user, maxLen = 1200) {
  const prompt = [
    "<|begin_of_text|><|start_header_id|>system<|end_header_id|>",
    system,
    "<|eot_id|><|start_header_id|>user<|end_header_id|>",
    user,
    "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
  ].join("\n");

  const command = new InvokeModelCommand({
    modelId:
      "arn:aws:bedrock:us-east-1:434702088658:inference-profile/us.meta.llama3-3-70b-instruct-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      prompt,
      max_gen_len: maxLen,
      temperature: 0.1,
      top_p: 0.9
    })
  });

  const response = await client.send(command);
  const decoded = new TextDecoder().decode(response.body);
  const result = JSON.parse(decoded);
  return (result.generation || "").trim();
}

module.exports = { callLlama };
