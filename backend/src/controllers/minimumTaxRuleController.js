const MinimumTaxRuleService = require("../services/minimumTaxRuleService");

const MinimumTaxRuleController = {
  // get active minimum tax rules by tax year
  async getRulesByTaxYear(req, res) {
    try {
      const { taxYear } = req.params;
      if (!/^\d{4}-\d{2}$/.test(taxYear)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax year format. Expected YYYY-YY.",
        });
      }

      const rules = await MinimumTaxRuleService.getRulesByTaxYear(taxYear);
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get minimum tax rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch minimum tax rules.",
      });
    }
  },

  // get one active rule by area code
  async getRuleByAreaCode(req, res) {
    try {
      const { taxYear, areaCode } = req.params;
      if (!/^\d{4}-\d{2}$/.test(taxYear)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax year format. Expected YYYY-YY.",
        });
      }

      if (!areaCode || areaCode.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Area code is required.",
        });
      }

      const rule = await MinimumTaxRuleService.getRuleByAreaCode(
        taxYear,
        areaCode.trim().toUpperCase(),
      );

      if (!rule) {
        return res.status(404).json({
          success: false,
          message: "No active minimum tax rule found for this area.",
        });
      }

      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error("Get minimum tax rule error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch minimum tax rule.",
      });
    }
  },

  // admin: get all minimum tax rules with filters
  async getAllRules(req, res) {
    try {
      const rules = await MinimumTaxRuleService.getAllRules(req.query || {});
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get all minimum tax rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch minimum tax rules.",
      });
    }
  },

  // admin: get rule by id
  async getRuleById(req, res) {
    try {
      const rule = await MinimumTaxRuleService.getRuleById(req.params.id);
      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error("Get minimum tax rule by id error:", error);
      return res.status(error.message.includes("not found") ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to fetch rule.",
      });
    }
  },

  // admin: create minimum tax rule
  async createRule(req, res) {
    try {
      const result = await MinimumTaxRuleService.createRule(req.body);
      return res.status(201).json({
        success: true,
        message: "Minimum tax rule created successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Create minimum tax rule error:", error);
      return res.status(error.statusCode || (error.code === "DUPLICATE_RULE" ? 409 : 400)).json({
        success: false,
        message: error.message || "Failed to create minimum tax rule.",
      });
    }
  },

  // admin: update minimum tax rule
  async updateRule(req, res) {
    try {
      const { id } = req.params;
      const updated = await MinimumTaxRuleService.updateRule(id, req.body);
      return res.status(200).json({
        success: true,
        message: "Minimum tax rule updated successfully.",
        data: updated,
      });
    } catch (error) {
      console.error("Update minimum tax rule error:", error);
      return res.status(error.message.includes("not found") ? 404 : 400).json({
        success: false,
        message: error.message || "Failed to update minimum tax rule.",
      });
    }
  },

  // admin: toggle rule status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await MinimumTaxRuleService.toggleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Minimum tax rule status updated to ${result.status}.`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle minimum tax rule status error:", error);
      return res.status(error.message.includes("not found") ? 404 : 400).json({
        success: false,
        message: error.message || "Failed to update status.",
      });
    }
  },

  // admin: delete rule (with historical protection)
  async deleteRule(req, res) {
    try {
      const { id } = req.params;
      const result = await MinimumTaxRuleService.deleteRule(id);
      return res.status(200).json({
        success: true,
        message: result.message,
        action: result.action,
        data: { id: result.id },
      });
    } catch (error) {
      console.error("Delete minimum tax rule error:", error);
      return res.status(error.message.includes("not found") ? 404 : 400).json({
        success: false,
        message: error.message || "Failed to delete minimum tax rule.",
      });
    }
  },

  // admin: get available tax years
  async getAvailableTaxYears(req, res) {
    try {
      const years = await MinimumTaxRuleService.getAvailableTaxYears();
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get available tax years error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax years.",
      });
    }
  },
};

module.exports = MinimumTaxRuleController;
