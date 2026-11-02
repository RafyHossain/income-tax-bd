const TaxRuleService = require("../services/taxRuleService");

const TaxRuleController = {
  // create tax rule

  async createTaxRule(
    req,
    res,
  ) {
    try {
      const result =
        await TaxRuleService.createTaxRule(
          req.body,
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Tax rule created successfully",
          data: {
            id:
              result.insertId,
            ...req.body,
          },
        });
    } catch (error) {
      console.error(
        "Create Tax Rule Error:",
        error,
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  },

  // get active tax rules

  async getActiveTaxRules(
    req,
    res,
  ) {
    try {
      const {
        taxYear,
      } = req.params;

      const rules =
        await TaxRuleService.getActiveTaxRules(
          taxYear,
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Tax rules fetched successfully",
          data: rules,
        });
    } catch (error) {
      console.error(
        "Get Active Tax Rules Error:",
        error,
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  },

  // get all tax rules
  // admin

  async getAllTaxRules(
    req,
    res,
  ) {
    try {
      const {
        taxYear,
      } = req.params;

      const rules =
        await TaxRuleService.getAllTaxRules(
          taxYear,
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "All tax rules fetched successfully",
          data: rules,
        });
    } catch (error) {
      console.error(
        "Get All Tax Rules Error:",
        error,
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  },

  // get available tax years

  async getAvailableTaxYears(
    req,
    res,
  ) {
    try {
      const years =
        await TaxRuleService.getAvailableTaxYears();

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Tax years fetched successfully",
          data: years,
        });
    } catch (error) {
      console.error(
        "Get Tax Years Error:",
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Internal server error",
        });
    }
  },

  // get tax year status

  async getTaxYearStatus(
    req,
    res,
  ) {
    try {
      const {
        taxYear,
      } = req.params;

      const status =
        await TaxRuleService.getTaxYearStatus(
          taxYear,
        );

      if (!status) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Tax year not found.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Tax year status fetched successfully",
          data: status,
        });
    } catch (error) {
      console.error(
        "Get Tax Year Status Error:",
        error,
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  },

  // update tax year status

  async updateTaxYearStatus(
    req,
    res,
  ) {
    try {
      const {
        taxYear,
      } = req.params;

      const {
        status,
      } = req.body;

      const result =
        await TaxRuleService.updateTaxYearStatus(
          taxYear,
          status,
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            `Tax year ${taxYear} updated successfully`,
          data: result,
        });
    } catch (error) {
      console.error(
        "Update Tax Year Status Error:",
        error,
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  },

  // update single tax rule

  async updateTaxRule(
    req,
    res,
  ) {
    try {
      const {
        id,
      } = req.params;

      const result =
        await TaxRuleService.updateTaxRule(
          id,
          req.body,
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Tax rule updated successfully",
          data: result,
        });
    } catch (error) {
      console.error(
        "Update Tax Rule Error:",
        error,
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  },

  // Public: get available tax years
  async getPublicTaxYears(req, res) {
    try {
      const years = await TaxRuleService.getPublicTaxYears();
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get Public Tax Years Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax years",
      });
    }
  },

  // Public: get complete overview for a single tax year
  async getPublicYearOverview(req, res) {
    try {
      const { taxYear } = req.params;
      const overview = await TaxRuleService.getPublicYearOverview(taxYear);
      return res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      console.error("Get Public Year Overview Error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch tax rules for this year",
      });
    }
  },

  // Public: get complete overview for all active tax years
  async getPublicAllYearsOverview(req, res) {
    try {
      const data = await TaxRuleService.getPublicAllYearsOverview();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Get Public All Years Overview Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax rules overview",
      });
    }
  },
  // get rule by id
  async getTaxRuleById(req, res) {
    try {
      const { id } = req.params;
      const rule = await TaxRuleService.getTaxRuleById(id);
      return res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error('Get Tax Rule By ID Error:', error);
      return res.status(error.message === 'Tax rule not found.' ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // toggle single rule status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await TaxRuleService.toggleRuleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Tax rule status updated to ${status}`,
        data: result,
      });
    } catch (error) {
      console.error('Toggle Tax Rule Status Error:', error);
      return res.status(error.message === 'Tax rule not found.' ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // delete tax rule
  async deleteTaxRule(req, res) {
    try {
      const { id } = req.params;
      const result = await TaxRuleService.deleteTaxRule(id);
      return res.status(200).json({
        success: true,
        message: result.message,
        action: result.action,
        data: { id: result.id },
      });
    } catch (error) {
      console.error('Delete Tax Rule Error:', error);
      return res.status(error.message === 'Tax rule not found.' ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = TaxRuleController;
