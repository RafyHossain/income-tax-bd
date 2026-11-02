const TaxCreditService = require("../services/taxCreditService");

const TaxCreditController = {
  // Get all credits for user
  async getMyCredits(req, res) {
    try {
      const userId = req.user.id;
      const credits = await TaxCreditService.getMyCredits(userId);
      return res.status(200).json({
        success: true,
        message: "Tax credits fetched successfully",
        data: credits,
      });
    } catch (error) {
      console.error("Get Tax Credits Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch tax credits",
      });
    }
  },

  // Get credit for specific tax year
  async getCreditByYear(req, res) {
    try {
      const userId = req.user.id;
      const { taxYear } = req.params;
      const credit = await TaxCreditService.getCreditByYear(userId, taxYear);
      return res.status(200).json({
        success: true,
        message: "Tax credit fetched successfully",
        data: credit,
      });
    } catch (error) {
      console.error("Get Tax Credit By Year Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch tax credit",
      });
    }
  },

  // Save or update tax credit
  async saveCredit(req, res) {
    try {
      const userId = req.user.id;
      const result = await TaxCreditService.saveCredit(userId, req.body);
      return res.status(200).json({
        success: true,
        message: "Tax credits saved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Save Tax Credit Error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to save tax credit",
      });
    }
  },

  // Delete tax credit entry
  async deleteCredit(req, res) {
    try {
      const userId = req.user.id;
      const { taxYear } = req.params;
      await TaxCreditService.deleteCredit(userId, taxYear);
      return res.status(200).json({
        success: true,
        message: "Tax credit deleted successfully",
      });
    } catch (error) {
      console.error("Delete Tax Credit Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete tax credit",
      });
    }
  },
};

module.exports = TaxCreditController;

