const { generateArchitecture } = require("../services/architecture.service");

/**
 * POST /generate
 * Validates input, delegates to the architecture service, returns result.
 */
async function generate(req, res) {
  const { idea, users, budget, features, tier } = req.body;

  if (!idea || !users) {
    return res.status(400).json({ success: false, message: "Missing idea or users" });
  }

  try {
    const finalData = await generateArchitecture({ idea, users, budget, features, tier });
    return res.json({ success: true, data: finalData });
  } catch (err) {
    // If the service threw a Step 3 JSON-parse failure (custom statusCode)
    if (err.statusCode === 500) {
      return res.status(500).json({
        success: false,
        error: "Invalid JSON from Step 3 — even recovery failed",
        raw: err.rawOutput
      });
    }
    console.error("Pipeline Error:", err);
    return res.status(500).json({ success: false, error: err.name, message: err.message });
  }
}

module.exports = { generate };
