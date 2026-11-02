import axiosPublic from "@/lib/axiosPublic";

const TaxRuleService = {
  // get tax years
  async getAvailableTaxYears() {
    const response = await axiosPublic.get("/tax-rules/years");
    return response.data;
  },

  // get active rules
  async getActiveTaxRules(taxYear) {
    if (!taxYear) throw new Error("Tax year is required.");
    const response = await axiosPublic.get(`/tax-rules/${taxYear}`);
    return response.data;
  },

  // get all rules
  async getAllTaxRules(taxYear) {
    if (!taxYear) throw new Error("Tax year is required.");
    const response = await axiosPublic.get(`/tax-rules/${taxYear}/all`);
    return response.data;
  },

  // get year status
  async getTaxYearStatus(taxYear) {
    if (!taxYear) throw new Error("Tax year is required.");
    const response = await axiosPublic.get(`/tax-rules/${taxYear}/status`);
    return response.data;
  },

  // update year status
  async updateTaxYearStatus(taxYear, status) {
    const response = await axiosPublic.patch(`/tax-rules/${taxYear}/status`, { status });
    return response.data;
  },

  // create slab
  async createTaxRule(taxRuleData) {
    const response = await axiosPublic.post("/tax-rules", taxRuleData);
    return response.data;
  },

  // update slab
  async updateTaxRule(id, taxRuleData) {
    if (!id) throw new Error("Tax rule ID is required.");
    const response = await axiosPublic.put(`/tax-rules/${id}`, taxRuleData);
    return response.data;
  },

  // get single slab by ID
  async getTaxRuleById(id) {
    if (!id) throw new Error("Tax rule ID is required.");
    const response = await axiosPublic.get(`/tax-rules/rule/${id}`);
    return response.data;
  },

  // toggle slab status
  async toggleStatus(id, status) {
    if (!id) throw new Error("Tax rule ID is required.");
    const response = await axiosPublic.patch(`/tax-rules/rule/${id}/status`, { status });
    return response.data;
  },

  // delete slab
  async deleteTaxRule(id) {
    if (!id) throw new Error("Tax rule ID is required.");
    const response = await axiosPublic.delete(`/tax-rules/rule/${id}`);
    return response.data;
  },
};

export default TaxRuleService;
