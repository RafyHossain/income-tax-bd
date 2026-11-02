const express = require("express");
const router = express.Router();
const TaxDeductionRuleController = require("../controllers/taxDeductionRuleController");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Admin routes
router.get("/admin/all", verifyToken, verifyAdmin, TaxDeductionRuleController.getAllDeductionRules);
router.get("/admin/:id", verifyToken, verifyAdmin, TaxDeductionRuleController.getDeductionRuleById);

// Read endpoints
router.get("/id/:id", verifyToken, TaxDeductionRuleController.getDeductionRuleById);
router.get("/:taxYear", verifyToken, TaxDeductionRuleController.getActiveDeductionRules);

// Admin mutation endpoints
router.post("/", verifyToken, verifyAdmin, TaxDeductionRuleController.createDeductionRule);
router.put("/:id", verifyToken, verifyAdmin, TaxDeductionRuleController.updateDeductionRule);
router.patch("/:id", verifyToken, verifyAdmin, TaxDeductionRuleController.updateDeductionRule);
router.patch("/:id/status", verifyToken, verifyAdmin, TaxDeductionRuleController.updateDeductionRuleStatus);
router.patch("/:id/deactivate", verifyToken, verifyAdmin, TaxDeductionRuleController.deactivateDeductionRule);
router.delete("/:id", verifyToken, verifyAdmin, TaxDeductionRuleController.deleteDeductionRule);

module.exports = router;
