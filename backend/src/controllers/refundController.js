const RefundService = require("../services/refundService");

const RefundController = {
  /**
   * POST /api/refunds
   * Taxpayer: Submit a new refund request for a tax return.
   */
  async submitRefundRequest(req, res) {
    try {
      const userId = req.user.id;
      const result = await RefundService.submitRefundRequest(userId, req.body || {});
      return res.status(201).json(result);
    } catch (error) {
      if (error.code === "VALIDATION_ERROR" || error.code === "INVALID_RETURN_ID") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "RETURN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "FORBIDDEN") {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "NOT_REFUND_ELIGIBLE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "ACTIVE_REFUND_EXISTS") {
        return res.status(409).json({
          success: false,
          code: error.code,
          message: error.message,
          data: error.existingRequest || null,
        });
      }

      console.error("submitRefundRequest error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while submitting refund request.",
      });
    }
  },

  /**
   * GET /api/refunds/my-requests
   * Taxpayer: Get all refund requests submitted by the authenticated user.
   */
  async getMyRefundRequests(req, res) {
    try {
      const userId = req.user.id;
      const requests = await RefundService.getTaxpayerRequests(userId);
      return res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      console.error("getMyRefundRequests error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while retrieving refund requests.",
      });
    }
  },

  /**
   * GET /api/refunds/by-return/:returnId
   * Taxpayer / Admin: Get refund request information for a specific return.
   */
  async getRefundRequestByReturnId(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.returnId);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const result = await RefundService.getRequestByReturnId(returnId, userId, userRole);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error.code === "RETURN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "FORBIDDEN") {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getRefundRequestByReturnId error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while retrieving return refund status.",
      });
    }
  },

  /**
   * GET /api/refunds/:id
   * Taxpayer / Admin: Get single refund request by ID.
   */
  async getRefundRequestById(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const id = Number(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid refund request ID.",
        });
      }

      const request = await RefundService.getRequestById(id, userId, userRole);
      return res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      if (error.code === "REFUND_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "FORBIDDEN") {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getRefundRequestById error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while retrieving refund request.",
      });
    }
  },

  /**
   * GET /api/admin/refunds
   * Admin: List all refund requests with filter and metrics.
   */
  async getAllRefundRequestsAdmin(req, res) {
    try {
      const filters = {
        status: req.query.status || "ALL",
        tax_year: req.query.tax_year,
        search: req.query.search,
      };

      const result = await RefundService.getAllRequestsAdmin(filters);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("getAllRefundRequestsAdmin error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching admin refund requests.",
      });
    }
  },

  /**
   * PATCH /api/admin/refunds/:id/approve
   * Admin: Approve a pending refund request.
   */
  async approveRefundRequest(req, res) {
    try {
      const adminId = req.user.id;
      const id = Number(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid refund request ID.",
        });
      }

      const result = await RefundService.approveRequest(id, adminId);
      return res.status(200).json(result);
    } catch (error) {
      if (error.code === "REFUND_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "INVALID_STATUS_TRANSITION") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("approveRefundRequest error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while approving refund request.",
      });
    }
  },

  /**
   * PATCH /api/admin/refunds/:id/reject
   * Admin: Reject a pending refund request.
   */
  async rejectRefundRequest(req, res) {
    try {
      const adminId = req.user.id;
      const id = Number(req.params.id);
      const { rejectionReason, rejection_reason } = req.body || {};

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid refund request ID.",
        });
      }

      const result = await RefundService.rejectRequest(id, adminId, rejectionReason || rejection_reason);
      return res.status(200).json(result);
    } catch (error) {
      if (error.code === "REFUND_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "INVALID_STATUS_TRANSITION") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("rejectRefundRequest error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while rejecting refund request.",
      });
    }
  },

  /**
   * PATCH /api/admin/refunds/:id/mark-refunded
   * Admin: Mark an approved refund request as REFUNDED.
   */
  async markRefunded(req, res) {
    try {
      const adminId = req.user.id;
      const id = Number(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid refund request ID.",
        });
      }

      const result = await RefundService.markRefunded(id, adminId, req.body || {});
      return res.status(200).json(result);
    } catch (error) {
      if (error.code === "REFUND_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "INVALID_STATUS_TRANSITION") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("markRefunded error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while marking refund as refunded.",
      });
    }
  },
};

module.exports = RefundController;

