const RefundRequestModel = require("../models/refundRequestModel");
const TaxReturnModel = require("../models/taxReturnModel");
const { getConnection } = require("../database/query");

const RefundService = {
  /**
   * Submit a new refund request for a tax return.
   */
  async submitRefundRequest(userId, payload = {}) {
    const {
      returnId,
      tax_return_id,
      account_holder_name,
      bank_name,
      bank_account_number,
      branch_name,
      reason,
    } = payload;

    const targetReturnId = Number(returnId || tax_return_id);

    if (!targetReturnId || isNaN(targetReturnId) || targetReturnId <= 0) {
      const err = new Error("A valid tax return ID is required.");
      err.code = "INVALID_RETURN_ID";
      throw err;
    }

    // 1. Validate required bank details
    if (!account_holder_name || !account_holder_name.trim()) {
      const err = new Error("Account holder name is required.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    if (!bank_name || !bank_name.trim()) {
      const err = new Error("Bank name is required.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    if (!bank_account_number || !bank_account_number.trim()) {
      const err = new Error("Bank account number is required.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    if (!branch_name || !branch_name.trim()) {
      const err = new Error("Branch name is required.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    // 2. Fetch tax return record
    const returnRecord = await TaxReturnModel.findById(targetReturnId);
    if (!returnRecord) {
      const err = new Error(`Tax return #${targetReturnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    // 3. Authorization check
    if (returnRecord.user_id !== userId) {
      const err = new Error("You do not have permission to submit a refund request for this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    // 4. Refund eligibility check
    const refundAmount = Number(returnRecord.refund_amount || 0);
    const payableTax = Number(returnRecord.payable_tax || 0);

    if (refundAmount <= 0 || payableTax > 0) {
      const statusLabel = payableTax > 0 ? "TAX_PAYABLE" : "NO_TAX_DUE";
      const err = new Error(
        `This tax return is not eligible for a refund (Status: ${statusLabel}). Only returns with a refundable balance can submit refund requests.`
      );
      err.code = "NOT_REFUND_ELIGIBLE";
      throw err;
    }

    // 5. Check for duplicate active refund requests (PENDING, APPROVED, REFUNDED)
    const existingActiveRequest = await RefundRequestModel.findActiveByReturnId(targetReturnId);
    if (existingActiveRequest) {
      const err = new Error(
        `An active refund request (#REF-${existingActiveRequest.id}, Status: ${existingActiveRequest.status}) already exists for Tax Return #${returnRecord.return_number || targetReturnId}.`
      );
      err.code = "ACTIVE_REFUND_EXISTS";
      err.existingRequest = existingActiveRequest;
      throw err;
    }

    // 6. Insert new refund request
    const insertId = await RefundRequestModel.create({
      user_id: userId,
      tax_return_id: targetReturnId,
      tax_calculation_id: returnRecord.tax_calculation_id,
      refund_amount: refundAmount,
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      bank_account_number: bank_account_number.trim(),
      branch_name: branch_name.trim(),
      reason: reason ? reason.trim() : null,
    });

    const createdRequest = await RefundRequestModel.findById(insertId);

    return {
      success: true,
      message: "Refund request submitted successfully. Our tax administration team will review your application.",
      data: createdRequest,
    };
  },

  /**
   * Get all refund requests for the authenticated taxpayer.
   */
  async getTaxpayerRequests(userId) {
    const requests = await RefundRequestModel.findByUserId(userId);
    return requests;
  },

  /**
   * Get a single refund request by ID, verifying permissions.
   */
  async getRequestById(id, userId, userRole = "user") {
    const request = await RefundRequestModel.findById(id);
    if (!request) {
      const err = new Error(`Refund request #${id} not found.`);
      err.code = "REFUND_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && request.user_id !== userId) {
      const err = new Error("Access denied: You cannot view this refund request.");
      err.code = "FORBIDDEN";
      throw err;
    }

    return request;
  },

  /**
   * Get the refund request(s) associated with a specific return ID.
   */
  async getRequestByReturnId(returnId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);
    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You cannot view refund details for this return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    const requests = await RefundRequestModel.findByReturnId(returnId);
    // Find active request if any
    const activeRequest = requests.find((r) => ["PENDING", "APPROVED", "REFUNDED"].includes(r.status)) || null;

    return {
      activeRequest,
      allRequests: requests,
      hasActiveRequest: !!activeRequest,
    };
  },

  /**
   * Admin: List all refund requests with optional filters and summary metrics.
   */
  async getAllRequestsAdmin(filters = {}) {
    const requests = await RefundRequestModel.findAll(filters);
    const metrics = await RefundRequestModel.getMetrics();

    return {
      metrics,
      requests,
      count: requests.length,
    };
  },

  /**
   * Admin: Approve a pending refund request.
   */
  async approveRequest(id, adminId) {
    const request = await RefundRequestModel.findById(id);
    if (!request) {
      const err = new Error(`Refund request #${id} not found.`);
      err.code = "REFUND_NOT_FOUND";
      throw err;
    }

    if (request.status !== "PENDING") {
      const err = new Error(
        `Only PENDING refund requests can be approved. Current status is ${request.status}.`
      );
      err.code = "INVALID_STATUS_TRANSITION";
      throw err;
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await RefundRequestModel.updateStatus(
        id,
        {
          status: "APPROVED",
          reviewed_by: adminId,
          reviewed_at: new Date(),
        },
        connection
      );

      // Trigger audit log for administrative refund approval
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: request.tax_return_id,
          previous_status: request.status,
          new_status: "REFUND_APPROVED",
          changed_by: adminId,
          remarks: `Admin approved refund claim #${id} (BDT ${Number(request.refund_amount || 0).toLocaleString("en-US")}) for bank ${request.bank_name}.`,
        },
        connection
      );

      await connection.commit();

      const updated = await RefundRequestModel.findById(id);
      return {
        success: true,
        message: `Refund request #${id} has been approved successfully.`,
        data: updated,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Admin: Reject a pending refund request with optional reason.
   */
  async rejectRequest(id, adminId, rejectionReason = null) {
    const request = await RefundRequestModel.findById(id);
    if (!request) {
      const err = new Error(`Refund request #${id} not found.`);
      err.code = "REFUND_NOT_FOUND";
      throw err;
    }

    if (request.status !== "PENDING") {
      const err = new Error(
        `Only PENDING refund requests can be rejected. Current status is ${request.status}.`
      );
      err.code = "INVALID_STATUS_TRANSITION";
      throw err;
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await RefundRequestModel.updateStatus(
        id,
        {
          status: "REJECTED",
          reviewed_by: adminId,
          reviewed_at: new Date(),
          rejection_reason: rejectionReason || "Rejected by tax authority review.",
        },
        connection
      );

      // Trigger audit log for administrative refund rejection
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: request.tax_return_id,
          previous_status: request.status,
          new_status: "REFUND_REJECTED",
          changed_by: adminId,
          remarks: `Admin rejected refund claim #${id}. Reason: ${rejectionReason || "Determined non-compliant upon administrative review."}`,
        },
        connection
      );

      await connection.commit();

      const updated = await RefundRequestModel.findById(id);
      return {
        success: true,
        message: `Refund request #${id} has been rejected.`,
        data: updated,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Admin: Mark an approved refund request as REFUNDED.
   */
  async markRefunded(id, adminId, refundData = {}) {
    const request = await RefundRequestModel.findById(id);
    if (!request) {
      const err = new Error(`Refund request #${id} not found.`);
      err.code = "REFUND_NOT_FOUND";
      throw err;
    }

    if (request.status !== "APPROVED") {
      const err = new Error(
        `Only APPROVED refund requests can be marked as refunded. Current status is ${request.status}.`
      );
      err.code = "INVALID_STATUS_TRANSITION";
      throw err;
    }

    const transactionReference =
      refundData.transactionReference ||
      refundData.transaction_reference ||
      `REF-TXN-${Date.now().toString().slice(-8)}`;

    const refundedAt = refundData.refundedAt || refundData.refunded_at || new Date();

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await RefundRequestModel.updateStatus(
        id,
        {
          status: "REFUNDED",
          reviewed_by: adminId,
          reviewed_at: new Date(),
          transaction_reference: transactionReference,
          refunded_at: refundedAt,
        },
        connection
      );

      // Trigger audit log for administrative refund payout confirmation
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: request.tax_return_id,
          previous_status: "APPROVED",
          new_status: "REFUND_DISBURSED",
          changed_by: adminId,
          remarks: `Admin confirmed payout of BDT ${Number(request.refund_amount || 0).toLocaleString("en-US")} for refund claim #${id} (Ref: ${transactionReference}).`,
        },
        connection
      );

      await connection.commit();

      const updated = await RefundRequestModel.findById(id);
      return {
        success: true,
        message: `Refund request #${id} has been marked as REFUNDED.`,
        data: updated,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};

module.exports = RefundService;

