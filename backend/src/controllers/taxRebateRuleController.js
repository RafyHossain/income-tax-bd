const db = require("../database/query");
const TaxRebateRuleModel = require("../models/TaxRebateRuleModel");

const TaxRebateRuleController = {
  // get active rules by tax year
  async getActiveRules(req, res) {
    try {
      const { taxYear } = req.params;
      const rules = await TaxRebateRuleModel.findActiveRulesByTaxYear(taxYear);
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get active rebate rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax rebate rules.",
      });
    }
  },

  // admin: get all rebate rules with filters
  async getAllRules(req, res) {
    try {
      const rules = await TaxRebateRuleModel.getAllRules(req.query || {});
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get all rebate rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax rebate rules.",
      });
    }
  },

  // admin: get rule by id
  async getRuleById(req, res) {
    try {
      const rule = await TaxRebateRuleModel.getRuleById(req.params.id);
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: "Tax rebate rule not found.",
        });
      }
      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error("Get rebate rule by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax rebate rule.",
      });
    }
  },

  // admin: create rebate rule
  async createRule(req, res) {
    try {
      const { tax_year, rule_code, rule_name, calculation_type, basis_type, effective_from } = req.body;

      if (!tax_year || !rule_code || !rule_name || !calculation_type || !basis_type || !effective_from) {
        return res.status(400).json({
          success: false,
          message: "tax_year, rule_code, rule_name, calculation_type, basis_type, and effective_from are required.",
        });
      }

      const result = await TaxRebateRuleModel.createRule(req.body);
      return res.status(201).json({
        success: true,
        message: "Tax rebate rule created successfully.",
        data: { id: result.insertId, ...req.body },
      });
    } catch (error) {
      console.error("Create rebate rule error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create tax rebate rule.",
      });
    }
  },

  // admin: update rebate rule
  async updateRule(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxRebateRuleModel.getRuleById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax rebate rule not found.",
        });
      }

      await TaxRebateRuleModel.updateRule(id, req.body);
      const updated = await TaxRebateRuleModel.getRuleById(id);

      return res.status(200).json({
        success: true,
        message: "Tax rebate rule updated successfully.",
        data: updated,
      });
    } catch (error) {
      console.error("Update rebate rule error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update tax rebate rule.",
      });
    }
  },

  // admin: toggle status
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

      await TaxRebateRuleModel.toggleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Tax rebate rule status updated to ${status}.`,
      });
    } catch (error) {
      console.error("Toggle rebate rule status error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update status.",
      });
    }
  },

  // admin: delete rule with historical protection
  async deleteRule(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxRebateRuleModel.getRuleById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax rebate rule not found.",
        });
      }
      const refCount = await db.query(
        'SELECT COUNT(*) as count FROM tax_calculations WHERE tax_year = ? AND tax_rebate > 0',
        [existing.tax_year]
      );
      if (Number(refCount[0]?.count || 0) > 0) {
        await TaxRebateRuleModel.toggleStatus(id, 'INACTIVE');
        return res.status(200).json({
          success: true,
          action: "DEACTIVATED",
          message: "Tax rebate rule is referenced in historical calculations. It has been deactivated (status set to INACTIVE) to preserve historical records.",
          data: { id, status: "INACTIVE" },
        });
      }
      await TaxRebateRuleModel.deleteRule(id);
      return res.status(200).json({
        success: true,
        action: "DELETED",
        message: "Tax rebate rule deleted successfully.",
        data: { id },
      });
    } catch (error) {
      console.error("Delete rebate rule error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete tax rebate rule.",
      });
    }
  },

  // admin: get available tax years
  async getAvailableTaxYears(req, res) {
    try {
      const years = await TaxRebateRuleModel.getAvailableTaxYears();
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get rebate tax years error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax years.",
      });
    }
  },
};

module.exports = TaxRebateRuleController;
