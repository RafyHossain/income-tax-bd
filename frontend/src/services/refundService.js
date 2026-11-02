import axiosPublic from "@/lib/axiosPublic";

/**
 * Service for Refund Management APIs.
 * Connects to /api/refunds and /api/admin/refunds endpoints.
 */
const RefundService = {
  /**
   * Submit a new refund request for a tax return.
   * @param {Object} data - { returnId, account_holder_name, bank_name, bank_account_number, branch_name, reason }
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async submitRefundRequest(data) {
    const response = await axiosPublic.post("/refunds", data);
    return response.data;
  },

  /**
   * Get all refund requests for the authenticated taxpayer.
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  async getMyRefundRequests() {
    const response = await axiosPublic.get("/refunds/my-requests");
    return response.data;
  },

  /**
   * Get refund request details associated with a specific return ID.
   * @param {number|string} returnId
   * @returns {Promise<{ success: boolean, data: { activeRequest: Object|null, allRequests: Array, hasActiveRequest: boolean } }>}
   */
  async getByReturnId(returnId) {
    if (!returnId) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.get(`/refunds/by-return/${returnId}`);
    return response.data;
  },

  /**
   * Get single refund request by ID.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  async getById(id) {
    if (!id) throw new Error("Refund request ID is required.");
    const response = await axiosPublic.get(`/refunds/${id}`);
    return response.data;
  },

  // ---------------------------------------------------------------------------
  // Admin Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Admin: List all refund requests with optional filters (status, tax_year, search).
   * @param {Object} params - { status, tax_year, search }
   * @returns {Promise<{ success: boolean, data: { metrics: Object, requests: Array, count: number } }>}
   */
  async getAllAdmin(params = {}) {
    const response = await axiosPublic.get("/admin/refunds", { params });
    return response.data;
  },

  /**
   * Admin: Approve a pending refund request.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async approve(id) {
    if (!id) throw new Error("Refund request ID is required.");
    const response = await axiosPublic.patch(`/admin/refunds/${id}/approve`);
    return response.data;
  },

  /**
   * Admin: Reject a pending refund request with optional reason.
   * @param {number|string} id
   * @param {string} rejectionReason
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async reject(id, rejectionReason = "") {
    if (!id) throw new Error("Refund request ID is required.");
    const response = await axiosPublic.patch(`/admin/refunds/${id}/reject`, {
      rejectionReason,
    });
    return response.data;
  },

  /**
   * Admin: Mark an approved refund request as REFUNDED.
   * @param {number|string} id
   * @param {Object} data - { transactionReference, refundedAt }
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async markRefunded(id, data = {}) {
    if (!id) throw new Error("Refund request ID is required.");
    const response = await axiosPublic.patch(`/admin/refunds/${id}/mark-refunded`, data);
    return response.data;
  },
};

export default RefundService;

