const { analyseArchitecture } = require("../services/analysis.service");

/**
 * POST /analyse
 * Validates input, delegates to the analysis service, returns result.
 */
async function analyse(req, res) {
  const { mermaid: mermaidCode, description } = req.body;

  if (!mermaidCode || !description) {
    return res.status(400).json({
      success: false,
      message: "Missing mermaid diagram or architecture description"
    });
  }

  try {
    const data = await analyseArchitecture({ mermaid: mermaidCode, description });
    return res.json({ success: true, data });
  } catch (err) {
    // If the service threw a Step 3 optimized architecture failure
    if (err.statusCode === 500 && err.issues) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate optimized architecture JSON",
        issues: err.issues
      });
    }
    console.error("Analyse Pipeline Error:", err);
    return res.status(500).json({ success: false, error: err.name, message: err.message });
  }
}

module.exports = { analyse };
