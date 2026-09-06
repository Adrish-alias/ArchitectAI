/**
 * Compatibility bridge for legacy callers of llama.service.js.
 * Delegates all calls to the unified LLM provider abstraction.
 */

const { callLLM } = require("./llm/llm.service");

/**
 * Legacy callLlama interface delegating to the active LLM provider.
 *
 * @param {string} system - System prompt
 * @param {string} user - User prompt
 * @param {number} [maxLen=1200] - Max generation length
 * @returns {Promise<string>}
 */
async function callLlama(system, user, maxLen = 1200) {
  return callLLM(system, user, maxLen);
}

module.exports = {
  callLlama,
  callLLM
};
