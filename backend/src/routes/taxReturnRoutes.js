const express = require("express");
const router = express.Router();
const TaxReturnController = require("../controllers/taxReturnController");
const verifyToken = require("../middleware/verifyToken");

// All return routes require authentication
router.use(verifyToken);

// 1. Initialize draft return from calculation
router.post("/draft", TaxReturnController.createDraft);

// 2. Retrieve or create return for calculation (avoids duplicates)
router.get("/by-calculation/:calculationId", TaxReturnController.getReturnByCalculationId);
router.post("/by-calculation/:calculationId", TaxReturnController.getOrCreateForCalculation);

// 3. List returns (user sees own; admin sees all/filtered)
router.get("/", TaxReturnController.listReturns);

// 3. Get single return by ID
router.get("/:id", TaxReturnController.getReturnById);

// 4. Get return breakdown snapshot details
router.get("/:id/details", TaxReturnController.getReturnDetails);

// 5. Validate draft return (transitions DRAFT -> VALIDATED)
router.post("/:id/validate", TaxReturnController.validateReturn);

// 6. Get return status transition history
router.get("/:id/status-history", TaxReturnController.getStatusHistory);

// 7. Submit tax return / Confirm filing
router.post("/:id/submit", TaxReturnController.submitReturn);
router.post("/:id/confirm-filing", TaxReturnController.confirmFiling);

// 8. Process tax payment (transitions status to PAID)
router.post("/:id/payment", TaxReturnController.processPayment);
router.post("/:id/pay", TaxReturnController.processPayment);

// 9. Delete tax return (cascading child records)
router.delete("/:id", TaxReturnController.deleteReturn);

module.exports = router;

