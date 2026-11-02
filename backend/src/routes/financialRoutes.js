const express = require("express");

const router = express.Router();

const FinancialController = require("../controllers/financialController");
const verifyToken = require("../middleware/verifyToken");

router.get("/summary", verifyToken, FinancialController.getFinancialSummary);

module.exports = router;

