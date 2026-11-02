import axiosPublic from "@/lib/axiosPublic";

const AdminIncomeExemptionRuleService = {
  // Get available tax years
  async getAvailableTaxYears() {
    const response = await axiosPublic.get("/income-exemption-rules/tax-years");
    return response.data;
  },

  // Get all income exemption rules with filters
  async getAllRules(params = {}) {
    const query = new URLSearchParams();
    if (params.tax_year) query.set("tax_year", params.tax_year);
    if (params.income_type) query.set("income_type", params.income_type);
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);

    const qs = query.toString();
    const url = qs ? `/income-exemption-rules?${qs}` : "/income-exemption-rules";
    const response = await axiosPublic.get(url);
    return response.data;
  },

  // Get rule by ID
  async getRuleById(id) {
    if (!id) throw new Error("Rule ID is required.");
    const response = await axiosPublic.get(`/income-exemption-rules/${id}`);
    return response.data;
  },

  // Create rule
  async createRule(data) {
    const response = await axiosPublic.post("/income-exemption-rules", data);
    return response.data;
  },

  // Update rule
  async updateRule(id, data) {
    if (!id) throw new Error("Rule ID is required.");
    const response = await axiosPublic.put(`/income-exemption-rules/${id}`, data);
    return response.data;
  },

  // Toggle status
  async toggleStatus(id, status) {
    if (!id) throw new Error("Rule ID is required.");
    const response = await axiosPublic.patch(`/income-exemption-rules/${id}/status`, { status });
    return response.data;
  },

  // Delete rule
  async deleteRule(id) {
    if (!id) throw new Error("Rule ID is required.");
    const response = await axiosPublic.delete(`/income-exemption-rules/${id}`);
    return response.data;
  },
};

export default AdminIncomeExemptionRuleService;

