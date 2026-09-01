const { Router } = require("express");
const { generate } = require("../controllers/architecture.controller");

const router = Router();

// POST /generate
router.post("/", generate);

module.exports = router;
