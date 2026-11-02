const express = require("express");
const router = express.Router();
const RefundController = require("../controllers/refundController");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// All refund routes require authentication
router.use(verifyToken);

// Taxpayer routes
router.post("/", RefundController.submitRefundRequest);
router.get("/my-requests", RefundController.getMyRefundRequests);
router.get("/by-return/:returnId", RefundController.getRefundRequestByReturnId);
router.get("/:id", RefundController.getRefundRequestById);

// Admin routes mirror (convenience aliases)
router.get("/admin/all", verifyAdmin, RefundController.getAllRefundRequestsAdmin);
router.patch("/admin/:id/approve", verifyAdmin, RefundController.approveRefundRequest);
router.patch("/admin/:id/reject", verifyAdmin, RefundController.rejectRefundRequest);
router.patch("/admin/:id/mark-refunded", verifyAdmin, RefundController.markRefunded);

module.exports = router;

