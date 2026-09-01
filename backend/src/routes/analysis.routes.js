const { Router } = require("express");
const { analyse } = require("../controllers/analysis.controller");

const router = Router();

// POST /analyse
router.post("/", analyse);

module.exports = router;
