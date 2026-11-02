const AdminModel = require("../models/AdminModel");

const AdminService = {
  async getDashboardStats() {
    return await AdminModel.getDashboardStats();
  },

  async getAllUsers() {
    return await AdminModel.getAllUsers();
  },

  async getUserById(id) {
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user ID.");
    }

    const user = await AdminModel.getUserById(userId);

    if (!user) {
      throw new Error("User not found.");
    }

    return user;
  },

  async updateUserRole(id, role, adminUserId) {
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user ID.");
    }

    if (userId === Number(adminUserId)) {
      throw new Error("You cannot change your own admin role.");
    }

    const normalizedRole = String(role || "")
      .trim()
      .toLowerCase();

    if (
      normalizedRole !== "user" &&
      normalizedRole !== "admin"
    ) {
      throw new Error(
        "Invalid role. Role must be user or admin.",
      );
    }

    const user = await AdminModel.getUserById(userId);

    if (!user) {
      throw new Error("User not found.");
    }

    await AdminModel.updateUserRole(
      userId,
      normalizedRole,
    );

    return await AdminModel.getUserById(userId);
  },

  async deleteUser(id, adminUserId) {
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user ID.");
    }

    if (userId === Number(adminUserId)) {
      throw new Error("You cannot delete your own account.");
    }

    const user = await AdminModel.getUserById(userId);

    if (!user) {
      throw new Error("User not found.");
    }

    await AdminModel.deleteUser(userId);

    return true;
  },

  async getAllCalculations() {
    return await AdminModel.getAllCalculations();
  },

  async getAuditLogs() {
    return await AdminModel.getAuditLogs();
  },
};

module.exports = AdminService;
