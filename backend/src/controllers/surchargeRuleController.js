const db = require("../database/query");
const SurchargeRuleModel = require("../models/surchargeRuleModel");

const SurchargeRuleController = {
  // get active rules by tax year
  async getActiveRules(req, res) {
    try {
      const { taxYear } = req.params;
      const rules = await SurchargeRuleModel.findActiveRulesByTaxYear(taxYear);
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get active surcharge rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch surcharge rules.",
      });
    }
  },

  // admin: get available tax years
  async getAvailableTaxYears(req, res) {
    try {
      const years = await SurchargeRuleModel.getAvailableTaxYears();
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get surcharge tax years error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch surcharge tax years.",
      });
    }
  },

  // admin: get all surcharge rules with filters
  async getAllRules(req, res) {
    try {
      const rules = await SurchargeRuleModel.getAllRules(req.query || {});
      return res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      console.error("Get all surcharge rules error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch surcharge rules.",
      });
    }
  },

  // admin: get rule by id
  async getRuleById(req, res) {
    try {
      const rule = await SurchargeRuleModel.getRuleById(req.params.id);
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: "Surcharge rule not found.",
        });
      }
      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error("Get surcharge rule by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch surcharge rule.",
      });
    }
  },

  // admin: create rule
  async createRule(req, res) {
    try {
      const { tax_year, rule_name, surcharge_rate } = req.body;
      if (!tax_year || !rule_name || surcharge_rate === undefined) {
        return res.status(400).json({
          success: false,
          message: "Tax year, rule name, and surcharge rate are required.",
        });
      }

      const result = await SurchargeRuleModel.createRule(req.body);
      return res.status(201).json({
        success: true,
        message: "Surcharge rule created successfully.",
        data: { id: result.insertId },
      });
    } catch (error) {
      console.error("Create surcharge rule error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create surcharge rule.",
      });
    }
  },

  // admin: update rule
  async updateRule(req, res) {
    try {
      const rule = await SurchargeRuleModel.getRuleById(req.params.id);
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: "Surcharge rule not found.",
        });
      }

      await SurchargeRuleModel.updateRule(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: "Surcharge rule updated successfully.",
      });
    } catch (error) {
      console.error("Update surcharge rule error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update surcharge rule.",
      });
    }
  },

  // admin: toggle status
  async toggleStatus(req, res) {
    try {
      const { status } = req.body;
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either ACTIVE or INACTIVE.",
        });
      }

      await SurchargeRuleModel.toggleStatus(req.params.id, status);
      return res.status(200).json({
        success: true,
        message: `Surcharge rule status updated to ${status}.`,
      });
    } catch (error) {
      console.error("Toggle surcharge status error:", error);
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
      const existing = await SurchargeRuleModel.getRuleById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Surcharge rule not found.",
        });
      }
      const refCount = await db.query(
        'SELECT COUNT(*) as count FROM tax_calculations WHERE tax_year = ? AND surcharge_amount > 0',
        [existing.tax_year]
      );
      if (Number(refCount[0]?.count || 0) > 0) {
        await SurchargeRuleModel.toggleStatus(id, 'INACTIVE');
        return res.status(200).json({
          success: true,
          action: "DEACTIVATED",
          message: "Surcharge rule is referenced in historical calculations with surcharge liability. It has been deactivated (status set to INACTIVE).",
          data: { id, status: "INACTIVE" },
        });
      }
      await SurchargeRuleModel.deleteRule(id);
      return res.status(200).json({
        success: true,
        action: "DELETED",
        message: "Surcharge rule deleted successfully.",
        data: { id },
      });
    } catch (error) {
      console.error("Delete surcharge rule error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete surcharge rule.",
      });
    }
  },
};

module.exports = SurchargeRuleController;
