import axiosPublic from "@/lib/axiosPublic";

const AdminDeductionRuleService = {
  // get all deduction rules (admin)
  async getAllDeductionRules(params = {}) {
    const query = new URLSearchParams();

    if (params.tax_year) {
      query.set("tax_year", params.tax_year);
    }

    if (params.status) {
      query.set("status", params.status);
    }

    if (params.search) {
      query.set("search", params.search);
    }

    const qs = query.toString();
    const url = qs
      ? `/admin/tax-deduction-rules?${qs}`
      : "/admin/tax-deduction-rules";

    const response = await axiosPublic.get(url);
    return response.data;
  },

  // get deduction rule by id
  async getDeductionRuleById(id) {
    if (!id) {
      throw new Error("Deduction rule ID is required.");
    }

    const response = await axiosPublic.get(
      `/admin/tax-deduction-rules/${id}`,
    );
    return response.data;
  },

  // create deduction rule
  async createDeductionRule(data) {
    const response = await axiosPublic.post(
      "/admin/tax-deduction-rules",
      data,
    );
    return response.data;
  },

  // update deduction rule
  async updateDeductionRule(id, data) {
    if (!id) {
      throw new Error("Deduction rule ID is required.");
    }

    const response = await axiosPublic.patch(
      `/admin/tax-deduction-rules/${id}`,
      data,
    );
    return response.data;
  },

  // update deduction rule status
  async updateDeductionRuleStatus(id, status) {
    if (!id) {
      throw new Error("Deduction rule ID is required.");
    }

    const response = await axiosPublic.patch(
      `/admin/tax-deduction-rules/${id}/status`,
      { status },
    );
    return response.data;
  },

  // delete deduction rule
  async deleteDeductionRule(id) {
    if (!id) {
      throw new Error("Deduction rule ID is required.");
    }

    const response = await axiosPublic.delete(
      `/admin/tax-deduction-rules/${id}`,
    );
    return response.data;
  },
};

export default AdminDeductionRuleService;
