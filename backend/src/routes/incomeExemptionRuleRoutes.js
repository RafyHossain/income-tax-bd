const express = require("express");
const router = express.Router();
const IncomeExemptionRuleController = require("../controllers/incomeExemptionRuleController");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Read endpoints
router.get("/tax-years", IncomeExemptionRuleController.getAvailableTaxYears);
router.get("/active/:taxYear", IncomeExemptionRuleController.getActiveRules);
router.get("/", verifyToken, verifyAdmin, IncomeExemptionRuleController.getAllRules);
router.get("/:id", verifyToken, verifyAdmin, IncomeExemptionRuleController.getRuleById);

// Admin mutation endpoints
router.post("/", verifyToken, verifyAdmin, IncomeExemptionRuleController.createRule);
router.put("/:id", verifyToken, verifyAdmin, IncomeExemptionRuleController.updateRule);
router.patch("/:id", verifyToken, verifyAdmin, IncomeExemptionRuleController.updateRule);
router.patch("/:id/status", verifyToken, verifyAdmin, IncomeExemptionRuleController.toggleStatus);
router.delete("/:id", verifyToken, verifyAdmin, IncomeExemptionRuleController.deleteRule);

module.exports = router;

