import axiosPublic from "@/lib/axiosPublic";

const AdminTaxYearService = {
  // Get all tax years with optional filter
  async getAllTaxYears(params = {}) {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    const qs = query.toString();
    const url = qs ? `/tax-years?${qs}` : "/tax-years";
    const response = await axiosPublic.get(url);
    return response.data;
  },

  // Get single tax year by ID
  async getTaxYearById(id) {
    if (!id) throw new Error("Tax Year ID is required.");
    const response = await axiosPublic.get(`/tax-years/${id}`);
    return response.data;
  },

  // Create new tax year
  async createTaxYear(data) {
    const response = await axiosPublic.post("/tax-years", data);
    return response.data;
  },

  // Update tax year
  async updateTaxYear(id, data) {
    if (!id) throw new Error("Tax Year ID is required.");
    const response = await axiosPublic.put(`/tax-years/${id}`, data);
    return response.data;
  },

  // Toggle status
  async toggleStatus(id, status) {
    if (!id) throw new Error("Tax Year ID is required.");
    const response = await axiosPublic.patch(`/tax-years/${id}/status`, { status });
    return response.data;
  },

  // Set current assessment year
  async setCurrent(id, is_current = 1) {
    if (!id) throw new Error("Tax Year ID is required.");
    const response = await axiosPublic.patch(`/tax-years/${id}/current`, { is_current });
    return response.data;
  },

  // Delete tax year
  async deleteTaxYear(id) {
    if (!id) throw new Error("Tax Year ID is required.");
    const response = await axiosPublic.delete(`/tax-years/${id}`);
    return response.data;
  },
};

export default AdminTaxYearService;

