import axiosPublic from "@/lib/axiosPublic";

const AdminService = {
  async getDashboardStats() {
    const response = await axiosPublic.get(
      "/admin/dashboard",
    );

    return response.data;
  },

  async getAllUsers() {
    const response = await axiosPublic.get(
      "/admin/users",
    );

    return response.data;
  },

  async getUserById(id) {
    if (!id) {
      throw new Error("User ID is required.");
    }

    const response = await axiosPublic.get(
      `/admin/users/${id}`,
    );

    return response.data;
  },

  async updateUserRole(id, role) {
    if (!id) {
      throw new Error("User ID is required.");
    }

    if (!role) {
      throw new Error("Role is required.");
    }

    const response = await axiosPublic.patch(
      `/admin/users/${id}/role`,
      {
        role,
      },
    );

    return response.data;
  },

  async deleteUser(id) {
    if (!id) {
      throw new Error("User ID is required.");
    }

    const response = await axiosPublic.delete(
      `/admin/users/${id}`,
    );

    return response.data;
  },

  async getAllCalculations() {
    const response = await axiosPublic.get(
      "/admin/calculations",
    );

    return response.data;
  },

  async getAllTaxReturns(params = {}) {
    const response = await axiosPublic.get(
      "/tax-returns",
      { params },
    );

    return response.data;
  },

  async getAuditLogs() {
    const response = await axiosPublic.get(
      "/admin/audit-logs",
    );

    return response.data;
  },
};

export default AdminService;
