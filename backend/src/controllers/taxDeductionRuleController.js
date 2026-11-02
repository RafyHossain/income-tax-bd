const TaxDeductionRuleService = require("../services/taxDeductionRuleService");

const TaxDeductionRuleController = {
  // create deduction rule
  // post /api/tax-deduction-rules

  async createDeductionRule(req, res) {
    try {
      const result = await TaxDeductionRuleService.createDeductionRule(
        req.body,
      );

      return res.status(201).json({
        success: true,

        message: "Tax deduction rule created successfully",

        data: {
          id: result.insertId,
          ...req.body,
        },
      });
    } catch (error) {
      console.error("Create Tax Deduction Rule Error:", error);

      return res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  },

  // get active deduction rules by tax year
  // get /api/tax-deduction-rules/:taxyear

  async getActiveDeductionRules(req, res) {
    try {
      const { taxYear } = req.params;

      const rules =
        await TaxDeductionRuleService.getActiveDeductionRules(taxYear);

      return res.status(200).json({
        success: true,

        message: "Tax deduction rules fetched successfully",

        data: rules,
      });
    } catch (error) {
      console.error("Get Tax Deduction Rules Error:", error);

      return res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  },

  // get one deduction rule
  // get /api/tax-deduction-rules/id/:id

  async getDeductionRuleById(req, res) {
    try {
      const ruleId = Number(req.params.id);

      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid deduction rule ID",
        });
      }

      const rule = await TaxDeductionRuleService.getDeductionRuleById(ruleId);

      return res.status(200).json({
        success: true,

        message: "Tax deduction rule fetched successfully",

        data: rule,
      });
    } catch (error) {
      console.error("Get Tax Deduction Rule Error:", error);

      if (error.message === "Tax deduction rule not found.") {
        return res.status(404).json({
          success: false,

          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  },

  // update deduction rule
  // put /api/tax-deduction-rules/:id

  async updateDeductionRule(req, res) {
    try {
      const ruleId = Number(req.params.id);

      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid deduction rule ID",
        });
      }

      const result = await TaxDeductionRuleService.updateDeductionRule(
        ruleId,
        req.body,
      );

      return res.status(200).json({
        success: true,

        message: "Tax deduction rule updated successfully",

        data: result,
      });
    } catch (error) {
      console.error("Update Tax Deduction Rule Error:", error);

      if (error.message === "Tax deduction rule not found.") {
        return res.status(404).json({
          success: false,

          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  },

  // deactivate deduction rule
  // patch /api/tax-deduction-rules/:id/deactivate

  async deactivateDeductionRule(req, res) {
    try {
      const ruleId = Number(req.params.id);

      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid deduction rule ID",
        });
      }

      const result =
        await TaxDeductionRuleService.deactivateDeductionRule(ruleId);

      return res.status(200).json({
        success: true,

        message: "Tax deduction rule deactivated successfully",

        data: result,
      });
    } catch (error) {
      console.error("Deactivate Tax Deduction Rule Error:", error);

      if (error.message === "Tax deduction rule not found.") {
        return res.status(404).json({
          success: false,

          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  },

  // get all deduction rules (admin)
  // get /api/admin/tax-deduction-rules

  async getAllDeductionRules(req, res) {
    try {
      const filters = {
        tax_year: req.query.tax_year || null,
        status: req.query.status || null,
        search: req.query.search || null,
      };

      const rules =
        await TaxDeductionRuleService.getAllDeductionRules(filters);

      return res.status(200).json({
        success: true,

        message: "Tax deduction rules fetched successfully",

        data: rules,
      });
    } catch (error) {
      console.error("Get All Tax Deduction Rules Error:", error);

      return res.status(500).json({
        success: false,

        message: "Internal server error.",
      });
    }
  },

  // update deduction rule status (admin)
  // patch /api/admin/tax-deduction-rules/:id/status

  async updateDeductionRuleStatus(req, res) {
    try {
      const ruleId = Number(req.params.id);

      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid deduction rule ID",
        });
      }

      const { status } = req.body;

      const result =
        await TaxDeductionRuleService.updateDeductionRuleStatus(
          ruleId,
          status,
        );

      return res.status(200).json({
        success: true,

        message: `Tax deduction rule ${status === "ACTIVE" ? "activated" : "deactivated"} successfully`,

        data: result,
      });
    } catch (error) {
      console.error("Update Tax Deduction Rule Status Error:", error);

      if (error.message === "Tax deduction rule not found.") {
        return res.status(404).json({
          success: false,

          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  },
  // delete deduction rule
  async deleteDeductionRule(req, res) {
    try {
      const ruleId = Number(req.params.id);
      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deduction rule ID',
        });
      }
      const result = await TaxDeductionRuleService.deleteDeductionRule(ruleId);
      return res.status(200).json({
        success: true,
        message: result.message,
        action: result.action,
        data: { id: result.id },
      });
    } catch (error) {
      console.error('Delete Tax Deduction Rule Error:', error);
      if (error.message === 'Tax deduction rule not found.') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = TaxDeductionRuleController;
