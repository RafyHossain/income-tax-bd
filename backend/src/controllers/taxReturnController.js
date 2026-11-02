const TaxReturnService = require("../services/taxReturnService");

const TaxReturnController = {
  /**
   * POST /api/tax-returns/draft
   * Create a new draft return from an existing tax calculation.
   */
  async createDraft(req, res) {
    try {
      const userId = req.user.id;
      const { tax_calculation_id, taxCalculationId, return_type, returnType } = req.body;

      const calcId = tax_calculation_id || taxCalculationId;
      const type = return_type || returnType || "INDIVIDUAL_REGULAR";

      if (!calcId) {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "tax_calculation_id is required to create a return draft.",
        });
      }

      const result = await TaxReturnService.createDraftReturn(userId, Number(calcId), type);

      return res.status(201).json({
        success: true,
        message: "Tax return draft initialized successfully.",
        data: result,
      });
    } catch (error) {
      if (error.code === "ACTIVE_DRAFT_EXISTS") {
        try {
          const existing = await TaxReturnService.getReturnById(error.existingReturnId, userId, req.user?.role || "user");
          return res.status(200).json({
            success: true,
            isReused: true,
            message: "An existing active tax return was found for this tax year. Displaying existing return.",
            data: existing,
          });
        } catch {
          return res.status(400).json({
            success: false,
            code: error.code,
            message: error.message,
            existingReturnId: error.existingReturnId,
          });
        }
      }

      if (error.code === "CALCULATION_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "UNAUTHORIZED_CALCULATION_REFERENCE") {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (
        error.code === "PROFILE_NOT_FOUND" ||
        error.code === "VALIDATION_ERROR" ||
        error.code === "INCOMPLETE_CALCULATION" ||
        error.code === "INVALID_TAX_YEAR"
      ) {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("createDraft error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while creating return draft.",
      });
    }
  },

  /**
   * GET /api/tax-returns
   * List tax returns (taxpayer sees own; admin sees all or filtered).
   */
  async listReturns(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { taxYear, status, returnType, userId: queryUserId } = req.query;

      const filters = {
        taxYear,
        status,
        returnType,
        userId: queryUserId ? Number(queryUserId) : undefined,
      };

      const returns = await TaxReturnService.listReturns(userId, userRole, filters);

      return res.status(200).json({
        success: true,
        data: returns,
      });
    } catch (error) {
      console.error("listReturns error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching tax returns.",
      });
    }
  },

  /**
   * GET /api/tax-returns/:id
   * Get return by ID with complete details and status history.
   */
  async getReturnById(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const returnRecord = await TaxReturnService.getReturnById(returnId, userId, userRole);

      return res.status(200).json({
        success: true,
        data: returnRecord,
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

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getReturnById error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching tax return.",
      });
    }
  },

  /**
   * GET /api/tax-returns/:id/details
   * Get return breakdown snapshot line items.
   */
  async getReturnDetails(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const details = await TaxReturnService.getReturnDetails(returnId, userId, userRole);

      return res.status(200).json({
        success: true,
        data: details,
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

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getReturnDetails error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching return details.",
      });
    }
  },

  /**
   * POST /api/tax-returns/:id/validate
   * Validate a draft return and transition to VALIDATED.
   */
  async validateReturn(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const result = await TaxReturnService.validateReturn(returnId, userId, userRole);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
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

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
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

      console.error("validateReturn error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while validating tax return.",
      });
    }
  },

  /**
   * GET /api/tax-returns/:id/status-history
   * Get return status transition audit trail.
   */
  async getStatusHistory(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const history = await TaxReturnService.getStatusHistory(returnId, userId, userRole);

      return res.status(200).json({
        success: true,
        data: history,
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

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getStatusHistory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching return status history.",
      });
    }
  },
  /**
   * POST /api/tax-returns/:id/submit
   * Submit and officially file a tax return.
   */
  async submitReturn(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const result = await TaxReturnService.submitTaxReturn(returnId, userId, userRole);
      return res.status(200).json(result);
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

      if (
        error.code === "ALREADY_FILED" ||
        error.code === "PAYMENT_REQUIRED" ||
        error.code === "INVALID_STATUS_TRANSITION" ||
        error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" ||
        error.code === "NO_TAX_DUE"
      ) {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "VALIDATION_FAILED") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
          errors: error.errors || [],
        });
      }

      console.error("submitReturn error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while submitting tax return.",
      });
    }
  },

  /**
   * POST /api/tax-returns/:id/confirm-filing
   * Confirm filing of a return (Backward-compatible alias).
   */
  async confirmFiling(req, res) {
    return TaxReturnController.submitReturn(req, res);
  },

  /**
   * GET /api/tax-returns/by-calculation/:calculationId
   * Retrieve existing tax return associated with a specific calculation ID.
   */
  async getReturnByCalculationId(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const calcId = Number(req.params.calculationId);

      if (isNaN(calcId) || calcId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax calculation ID.",
        });
      }

      const returnRecord = await TaxReturnService.getReturnByCalculationId(calcId, userId, userRole);
      if (!returnRecord) {
        return res.status(404).json({
          success: false,
          code: "RETURN_NOT_FOUND",
          message: `No tax return found for calculation #${calcId}.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: returnRecord,
      });
    } catch (error) {
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getReturnByCalculationId error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching return by calculation ID.",
      });
    }
  },

  /**
   * POST /api/tax-returns/by-calculation/:calculationId
   * Retrieve or create a tax return for a specific calculation.
   * If a return already exists, it is reused to avoid duplication.
   */
  async getOrCreateForCalculation(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const calcId = Number(req.params.calculationId);
      const { returnType = "INDIVIDUAL_REGULAR" } = req.body;

      if (isNaN(calcId) || calcId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax calculation ID.",
        });
      }

      const result = await TaxReturnService.getOrCreateReturnForCalculation(
        calcId,
        userId,
        returnType,
        userRole
      );

      return res.status(result.isNew ? 201 : 200).json({
        success: true,
        message: result.isNew
          ? "Tax return initialized successfully."
          : "Existing tax return retrieved successfully.",
        data: result.returnRecord,
        isReused: !result.isNew,
      });
    } catch (error) {
      if (error.code === "CALCULATION_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (error.code === "UNAUTHORIZED_CALCULATION_REFERENCE" || error.code === "FORBIDDEN") {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      if (
        error.code === "PROFILE_NOT_FOUND" ||
        error.code === "VALIDATION_ERROR" ||
        error.code === "INCOMPLETE_CALCULATION" ||
        error.code === "INVALID_TAX_YEAR"
      ) {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("getOrCreateForCalculation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while preparing tax return for calculation.",
      });
    }
  },

  /**
   * DELETE /api/tax-returns/:id
   * Delete a tax return (taxpayer can delete their own; admin can delete any).
   */
  async deleteReturn(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const result = await TaxReturnService.deleteReturn(returnId, userId, userRole);
      return res.status(200).json(result);
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

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("deleteReturn error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while deleting tax return.",
      });
    }
  },

  /**
   * POST /api/tax-returns/:id/payment
   * POST /api/tax-returns/:id/pay
   * Settle tax payment for a return and transition status to PAID.
   */
  async processPayment(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const returnId = Number(req.params.id);

      if (isNaN(returnId) || returnId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax return ID.",
        });
      }

      const result = await TaxReturnService.processPayment(
        returnId,
        req.body || {},
        userId,
        userRole
      );

      return res.status(200).json(result);
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

      if (error.code === "PAYMENT_NOT_APPLICABLE_REFUND_DUE" || error.code === "NO_TAX_DUE") {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      console.error("processPayment error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while processing tax payment.",
      });
    }
  },
};

module.exports = TaxReturnController;

