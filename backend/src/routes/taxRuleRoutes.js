const express = require("express");
const router = express.Router();
const TaxRuleController = require("../controllers/taxRuleController");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Public endpoints (no token required)
router.get("/public/years", TaxRuleController.getPublicTaxYears);
router.get("/public/all-years", TaxRuleController.getPublicAllYearsOverview);
router.get("/public/year/:taxYear", TaxRuleController.getPublicYearOverview);

// User / Admin endpoints
router.get("/years", verifyToken, TaxRuleController.getAvailableTaxYears);

// Admin: single rule operations by ID (defined before generic :taxYear routes)
router.get("/rule/:id", verifyToken, verifyAdmin, TaxRuleController.getTaxRuleById);
router.get("/admin/:id", verifyToken, verifyAdmin, TaxRuleController.getTaxRuleById);
router.patch("/rule/:id/status", verifyToken, verifyAdmin, TaxRuleController.toggleStatus);
router.delete("/rule/:id", verifyToken, verifyAdmin, TaxRuleController.deleteTaxRule);

// Admin: tax year bulk operations
router.get("/:taxYear/all", verifyToken, verifyAdmin, TaxRuleController.getAllTaxRules);
router.get("/:taxYear/status", verifyToken, verifyAdmin, TaxRuleController.getTaxYearStatus);
router.patch("/:taxYear/status", verifyToken, verifyAdmin, TaxRuleController.updateTaxYearStatus);

// Admin: create tax rule slab
router.post("/", verifyToken, verifyAdmin, TaxRuleController.createTaxRule);

// User / Admin: get active rules of a tax year
router.get("/:taxYear", verifyToken, TaxRuleController.getActiveTaxRules);

// Admin: update single slab
router.put("/:id", verifyToken, verifyAdmin, TaxRuleController.updateTaxRule);
router.patch("/:id/status", verifyToken, verifyAdmin, TaxRuleController.toggleStatus);
router.delete("/:id", verifyToken, verifyAdmin, TaxRuleController.deleteTaxRule);

module.exports = router;
