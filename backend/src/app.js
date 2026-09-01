const express = require("express");
const cors    = require("cors");

const architectureRoutes = require("./routes/architecture.routes");
const analysisRoutes     = require("./routes/analysis.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes — preserve exact externally visible paths
app.use("/generate", architectureRoutes);
app.use("/analyse",  analysisRoutes);

module.exports = app;
