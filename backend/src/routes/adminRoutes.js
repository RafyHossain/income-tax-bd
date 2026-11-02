const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const AdminController = require("../controllers/adminController");
const TaxDeductionRuleController = require("../controllers/taxDeductionRuleController");
const RefundController = require("../controllers/refundController");

router.get(
  "/dashboard",
  verifyToken,
  verifyAdmin,
  AdminController.getDashboardStats,
);

router.get(
  "/users",
  verifyToken,
  verifyAdmin,
  AdminController.getAllUsers,
);

router.get(
  "/users/:id",
  verifyToken,
  verifyAdmin,
  AdminController.getUserById,
);

router.patch(
  "/users/:id/role",
  verifyToken,
  verifyAdmin,
  AdminController.updateUserRole,
);

router.delete(
  "/users/:id",
  verifyToken,
  verifyAdmin,
  AdminController.deleteUser,
);

// Admin Calculations oversight
router.get(
  "/calculations",
  verifyToken,
  verifyAdmin,
  AdminController.getAllCalculations,
);

// Admin Audit Logs viewer
router.get(
  "/audit-logs",
  verifyToken,
  verifyAdmin,
  AdminController.getAuditLogs,
);

// admin tax deduction rules
router.get(
  "/tax-deduction-rules",
  verifyToken,
  verifyAdmin,
  TaxDeductionRuleController.getAllDeductionRules,
);

router.get(
  "/tax-deduction-rules/:id",
  verifyToken,
  verifyAdmin,
  TaxDeductionRuleController.getDeductionRuleById,
);

router.post(
  "/tax-deduction-rules",
  verifyToken,
  verifyAdmin,
  TaxDeductionRuleController.createDeductionRule,
);

router.patch(
  "/tax-deduction-rules/:id",
  verifyToken,
  verifyAdmin,
  TaxDeductionRuleController.updateDeductionRule,
);

router.patch(
  "/tax-deduction-rules/:id/status",
  verifyToken,
  verifyAdmin,
  TaxDeductionRuleController.updateDeductionRuleStatus,
);

router.delete(
  "/tax-deduction-rules/:id",
  verifyToken,
  verifyAdmin,
  TaxDeductionRuleController.deleteDeductionRule,
);

// Admin Refund Management routes
router.get(
  "/refunds",
  verifyToken,
  verifyAdmin,
  RefundController.getAllRefundRequestsAdmin,
);

router.get(
  "/refunds/:id",
  verifyToken,
  verifyAdmin,
  RefundController.getRefundRequestById,
);

router.patch(
  "/refunds/:id/approve",
  verifyToken,
  verifyAdmin,
  RefundController.approveRefundRequest,
);

router.patch(
  "/refunds/:id/reject",
  verifyToken,
  verifyAdmin,
  RefundController.rejectRefundRequest,
);

router.patch(
  "/refunds/:id/mark-refunded",
  verifyToken,
  verifyAdmin,
  RefundController.markRefunded,
);

module.exports = router;
