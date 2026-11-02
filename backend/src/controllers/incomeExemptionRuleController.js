const db = require("../database/query");
const IncomeExemptionRuleModel = require("../models/incomeExemptionRuleModel");

const IncomeExemptionRuleController = {
  // Get active rules
  async getActiveRules(req, res) {
    try {
      const { taxYear } = req.params;
      const { income_type } = req.query;
      const rules = await IncomeExemptionRuleModel.getActiveRules(taxYear, income_type);
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get active income exemption rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch income exemption rules.",
      });
    }
  },

  // Admin: get all rules
  async getAllRules(req, res) {
    try {
      const rules = await IncomeExemptionRuleModel.getAllRules(req.query || {});
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get all income exemption rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch income exemption rules.",
      });
    }
  },

  // Admin: get rule by ID
  async getRuleById(req, res) {
    try {
      const { id } = req.params;
      const rule = await IncomeExemptionRuleModel.getRuleById(id);
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: "Income exemption rule not found.",
        });
      }
      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error("Get income exemption rule by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch income exemption rule.",
      });
    }
  },

  // Admin: create rule
  async createRule(req, res) {
    try {
      const { tax_year, income_type, exemption_code, exemption_name, effective_from } = req.body;

      if (!tax_year || !income_type || !exemption_code || !exemption_name || !effective_from) {
        return res.status(400).json({
          success: false,
          message: "tax_year, income_type, exemption_code, exemption_name, and effective_from are required.",
        });
      }

      const result = await IncomeExemptionRuleModel.createRule(req.body);
      return res.status(201).json({
        success: true,
        message: "Income exemption rule created successfully.",
        data: { id: result.insertId, ...req.body },
      });
    } catch (error) {
      console.error("Create income exemption rule error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create income exemption rule.",
      });
    }
  },

  // Admin: update rule
  async updateRule(req, res) {
    try {
      const { id } = req.params;
      const existing = await IncomeExemptionRuleModel.getRuleById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Income exemption rule not found.",
        });
      }

      await IncomeExemptionRuleModel.updateRule(id, req.body);
      const updated = await IncomeExemptionRuleModel.getRuleById(id);

      return res.status(200).json({
        success: true,
        message: "Income exemption rule updated successfully.",
        data: updated,
      });
    } catch (error) {
      console.error("Update income exemption rule error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update income exemption rule.",
      });
    }
  },

  // Admin: toggle status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status (ACTIVE or INACTIVE) is required.",
        });
      }

      await IncomeExemptionRuleModel.toggleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Income exemption rule status updated to ${status}.`,
      });
    } catch (error) {
      console.error("Toggle income exemption rule status error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update status.",
      });
    }
  },

  // Admin: delete rule with historical protection
  async deleteRule(req, res) {
    try {
      const { id } = req.params;
      const existing = await IncomeExemptionRuleModel.getRuleById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Income exemption rule not found.",
        });
      }
      const refCount = await db.query(
        'SELECT COUNT(*) as count FROM tax_calculations WHERE tax_year = ? AND (salary_exemption > 0 OR total_income > 0)',
        [existing.tax_year]
      );
      if (Number(refCount[0]?.count || 0) > 0) {
        await IncomeExemptionRuleModel.toggleStatus(id, 'INACTIVE');
        return res.status(200).json({
          success: true,
          action: "DEACTIVATED",
          message: "Income exemption rule is referenced in historical calculation records. It has been deactivated (status set to INACTIVE) to preserve historical integrity.",
          data: { id, status: "INACTIVE" },
        });
      }
      await IncomeExemptionRuleModel.deleteRule(id);
      return res.status(200).json({
        success: true,
        action: "DELETED",
        message: "Income exemption rule deleted successfully.",
        data: { id },
      });
    } catch (error) {
      console.error("Delete income exemption rule error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete income exemption rule.",
      });
    }
  },

  // Admin: get available tax years
  async getAvailableTaxYears(req, res) {
    try {
      const years = await IncomeExemptionRuleModel.getAvailableTaxYears();
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get exemption tax years error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax years.",
      });
    }
  },
};

module.exports = IncomeExemptionRuleController;

