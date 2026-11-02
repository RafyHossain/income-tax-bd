const TaxpayerProfileService = require("../services/taxpayerProfileService");

const TaxpayerProfileController = {
  async createProfile(req, res) {
    try {
      const userId = req.user.id; // get from user login payload

      const result = await TaxpayerProfileService.createProfile(
        userId,
        req.body // data from frontend
      );

      return res.status(201).json({
        success: true,
        message: "Taxpayer profile created successfully",
        data: result,
      });
    } catch (error) {
      if (
        error.message === "Taxpayer profile already exists" ||
        error.message === "This e-TIN number is already registered." ||
        error.message.includes("already registered") ||
        error.message.includes("already exists") ||
        error.code === "ER_DUP_ENTRY" ||
        error.errno === 1062
      ) {
        return res.status(409).json({
          success: false,
          message: error.message.includes("e-TIN") || error.message.includes("tin_number")
            ? "This e-TIN number is already registered."
            : error.message,
        });
      }

      if (
        error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("cannot be") ||
        error.message.includes("must be") ||
        error.message.includes("12 digits")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Create taxpayer profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const rows = await TaxpayerProfileService.getProfile(userId);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Taxpayer profile not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      console.error("Get taxpayer profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;

      const result = await TaxpayerProfileService.updateProfile(
        userId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Taxpayer profile updated successfully",
        data: result,
      });
    } catch (error) {
      if (error.message === "Taxpayer profile not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (
        error.message === "This e-TIN number is already registered." ||
        error.message.includes("already registered") ||
        error.message.includes("already exists") ||
        error.code === "ER_DUP_ENTRY" ||
        error.errno === 1062
      ) {
        return res.status(409).json({
          success: false,
          message: error.message.includes("e-TIN") || error.message.includes("tin_number")
            ? "This e-TIN number is already registered."
            : error.message,
        });
      }

      if (
        error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("cannot be") ||
        error.message.includes("must be") ||
        error.message.includes("12 digits")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Update taxpayer profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};

module.exports = TaxpayerProfileController;
