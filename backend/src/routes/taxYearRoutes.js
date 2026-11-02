const express = require("express");
const router = express.Router();
const TaxYearController = require("../controllers/taxYearController");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Public / Authenticated read endpoint
router.get("/", TaxYearController.getAllTaxYears);
router.get("/:id", verifyToken, verifyAdmin, TaxYearController.getTaxYearById);

// Admin mutation endpoints
router.post("/", verifyToken, verifyAdmin, TaxYearController.createTaxYear);
router.put("/:id", verifyToken, verifyAdmin, TaxYearController.updateTaxYear);
router.patch("/:id", verifyToken, verifyAdmin, TaxYearController.updateTaxYear);
router.patch("/:id/status", verifyToken, verifyAdmin, TaxYearController.toggleStatus);
router.patch("/:id/current", verifyToken, verifyAdmin, TaxYearController.setCurrent);
router.delete("/:id", verifyToken, verifyAdmin, TaxYearController.deleteTaxYear);

module.exports = router;

