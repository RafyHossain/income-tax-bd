import axiosPublic from "@/lib/axiosPublic";

/**
 * Service for Tax Return Filing APIs.
 * Connects to /api/tax-returns endpoints using authenticated axiosPublic instance.
 */
const TaxReturnService = {
  /**
   * Get all tax returns for current authenticated user (or filtered for admin).
   * @param {Object} params - Query filters { taxYear, status, returnType }
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  async getTaxReturns(params = {}) {
    const response = await axiosPublic.get("/tax-returns", { params });
    return response.data;
  },

  /**
   * Get single tax return by ID with structured summaries and details.
   * @param {number|string} id - Return ID
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  async getTaxReturnById(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.get(`/tax-returns/${id}`);
    return response.data;
  },

  /**
   * Get frozen snapshot line items for a return.
   * @param {number|string} id - Return ID
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  async getTaxReturnDetails(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.get(`/tax-returns/${id}/details`);
    return response.data;
  },

  /**
   * Generate an immutable return draft from an existing persisted tax calculation.
   * @param {number|string} taxCalculationId - Source calculation ID
   * @param {string} returnType - Return type (default: "INDIVIDUAL_REGULAR")
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async generateTaxReturnDraft(taxCalculationId, returnType = "INDIVIDUAL_REGULAR") {
    if (!taxCalculationId) throw new Error("Tax calculation ID is required.");
    const response = await axiosPublic.post("/tax-returns/draft", {
      taxCalculationId: Number(taxCalculationId),
      returnType,
    });
    return response.data;
  },

  /**
   * Validate a draft return against statutory rules and profile criteria.
   * Transitions DRAFT -> VALIDATED if zero blockers and zero errors exist.
   * @param {number|string} id - Return ID
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async validateTaxReturn(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.post(`/tax-returns/${id}/validate`, {});
    return response.data;
  },

  /**
   * Get audit log of return status workflow transitions.
   * @param {number|string} id - Return ID
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  async getTaxReturnStatusHistory(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.get(`/tax-returns/${id}/status-history`);
    return response.data;
  },

  /**
   * Submit and officially file a tax return.
   * Transitions PAID/VALIDATED -> FILED.
   * @param {number|string} id - Return ID
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async submitTaxReturn(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.post(`/tax-returns/${id}/submit`, {});
    return response.data;
  },

  /**
   * Confirm filing of a tax return (alias for submitTaxReturn).
   * Transitions VALIDATED/PAID -> FILED.
   * @param {number|string} id - Return ID
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async confirmFiling(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.post(`/tax-returns/${id}/confirm-filing`, {});
    return response.data;
  },

  /**
   * Retrieve existing tax return by calculation ID.
   * @param {number|string} calculationId
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  async getReturnByCalculationId(calculationId) {
    if (!calculationId) throw new Error("Tax calculation ID is required.");
    const response = await axiosPublic.get(`/tax-returns/by-calculation/${calculationId}`);
    return response.data;
  },

  /**
   * Retrieve or create a tax return for a specific calculation.
   * Every time this is invoked, a fresh return is generated.
   * @param {number|string} calculationId
   * @param {string} returnType
   * @returns {Promise<{ success: boolean, data: Object, isReused: boolean }>}
   */
  async getOrCreateReturnForCalculation(calculationId, returnType = "INDIVIDUAL_REGULAR") {
    if (!calculationId) throw new Error("Tax calculation ID is required.");
    const response = await axiosPublic.post(`/tax-returns/by-calculation/${calculationId}`, {
      returnType,
    });
    return response.data;
  },

  /**
   * Delete a tax return and its associated child records.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async deleteTaxReturn(id) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.delete(`/tax-returns/${id}`);
    return response.data;
  },

  /**
   * Pay for a tax return (transitions payment_status to PAID).
   * @param {number|string} id
   * @param {Object} paymentData
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async payTaxReturn(id, paymentData = {}) {
    if (!id) throw new Error("Tax return ID is required.");
    const response = await axiosPublic.post(`/tax-returns/${id}/payment`, paymentData);
    return response.data;
  },
};

export default TaxReturnService;

