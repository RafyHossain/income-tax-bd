const TaxYearModel = require("../models/taxYearModel");
const {
  getIncomeYearFromAssessmentYear,
  getAssessmentYearDateRange,
} = require("../utils/taxYear");

const TaxYearController = {
  // Get all tax years
  async getAllTaxYears(req, res) {
    try {
      const years = await TaxYearModel.getAllTaxYears(req.query || {});
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get all tax years error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax years.",
      });
    }
  },

  // Get single tax year by ID
  async getTaxYearById(req, res) {
    try {
      const { id } = req.params;
      const year = await TaxYearModel.getTaxYearById(id);
      if (!year) {
        return res.status(404).json({
          success: false,
          message: "Tax year not found.",
        });
      }
      return res.status(200).json({
        success: true,
        data: year,
      });
    } catch (error) {
      console.error("Get tax year by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax year.",
      });
    }
  },

  // Create new tax year
  async createTaxYear(req, res) {
    try {
      const { tax_year, income_year, start_date, end_date, status, is_current, description } = req.body;

      if (!tax_year || typeof tax_year !== "string" || !tax_year.trim()) {
        return res.status(400).json({
          success: false,
          message: "tax_year is required (e.g. '2027-28').",
        });
      }

      const trimmedTaxYear = tax_year.trim();

      if (!/^\d{4}-\d{2}$/.test(trimmedTaxYear)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax_year format. Expected YYYY-YY (e.g. '2027-28').",
        });
      }

      // Check duplicate
      const existing = await TaxYearModel.getByTaxYear(trimmedTaxYear);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Tax year '${trimmedTaxYear}' already exists.`,
        });
      }

      // Automatically map Assessment Year to immediately preceding Income Year
      // e.g. AY 2027-28 -> Income Year 2026-27
      const resolvedIncomeYear = income_year && income_year.trim()
        ? income_year.trim()
        : getIncomeYearFromAssessmentYear(trimmedTaxYear);

      // Period dates: July 1 to June 30
      const defaultDates = getAssessmentYearDateRange(trimmedTaxYear);
      const resolvedStartDate = start_date ? String(start_date).substring(0, 10) : defaultDates.startDate;
      const resolvedEndDate = end_date ? String(end_date).substring(0, 10) : defaultDates.endDate;

      // Date validation
      const start = new Date(resolvedStartDate);
      const end = new Date(resolvedEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range. end_date must be after start_date.",
        });
      }

      const result = await TaxYearModel.createTaxYear({
        tax_year: trimmedTaxYear,
        income_year: resolvedIncomeYear,
        start_date: resolvedStartDate,
        end_date: resolvedEndDate,
        status: status || "ACTIVE",
        is_current: Boolean(is_current),
        description: description || `Assessment Year ${trimmedTaxYear}`,
      });

      return res.status(201).json({
        success: true,
        message: "Tax year created successfully.",
        data: {
          id: result.insertId,
          tax_year: trimmedTaxYear,
          income_year: resolvedIncomeYear,
          start_date: resolvedStartDate,
          end_date: resolvedEndDate,
          status: status || "ACTIVE",
        },
      });
    } catch (error) {
      console.error("Create tax year error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create tax year.",
      });
    }
  },

  // Update tax year
  async updateTaxYear(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxYearModel.getTaxYearById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax year not found.",
        });
      }

      const updateData = { ...req.body };
      if (updateData.start_date) updateData.start_date = String(updateData.start_date).substring(0, 10);
      if (updateData.end_date) updateData.end_date = String(updateData.end_date).substring(0, 10);

      await TaxYearModel.updateTaxYear(id, updateData);
      const updated = await TaxYearModel.getTaxYearById(id);

      return res.status(200).json({
        success: true,
        message: "Tax year updated successfully.",
        data: updated,
      });
    } catch (error) {
      console.error("Update tax year error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update tax year.",
      });
    }
  },

  // Toggle status
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

      await TaxYearModel.toggleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Tax year status updated to ${status}.`,
      });
    } catch (error) {
      console.error("Toggle tax year status error:", error);
      const statusCode = error.code === "CURRENT_YEAR_PROTECTED" ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update status.",
      });
    }
  },

  // Set as current active year
  async setCurrent(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxYearModel.getTaxYearById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax year not found.",
        });
      }

      await TaxYearModel.setCurrentTaxYear(id);
      return res.status(200).json({
        success: true,
        message: `Tax year '${existing.tax_year}' is now the current assessment year.`,
      });
    } catch (error) {
      console.error("Set current tax year error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to set current tax year.",
      });
    }
  },

  // Delete tax year
  async deleteTaxYear(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxYearModel.getTaxYearById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax year not found.",
        });
      }

      const result = await TaxYearModel.deleteTaxYear(id, existing.tax_year);
      return res.status(200).json({
        success: true,
        message: result.message,
        action: result.action,
        status: result.status,
        data: {
          id: result.id,
          tax_year: result.tax_year,
          action: result.action,
          reference_count: result.reference_count,
        },
      });
    } catch (error) {
      console.error("Delete tax year error:", error);
      const statusCode =
        error.code === "CURRENT_YEAR_PROTECTED"
          ? 400
          : error.code === "DEPENDENCY_EXISTS"
          ? 409
          : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to process tax year deletion.",
      });
    }
  },
};

module.exports = TaxYearController;

