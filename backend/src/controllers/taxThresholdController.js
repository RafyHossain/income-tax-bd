const db = require("../database/query");
const TaxThresholdModel = require("../models/taxThresholdModel");

const TaxThresholdController = {
  // get active thresholds by tax year
  async getActiveThresholds(req, res) {
    try {
      const { taxYear } = req.params;
      const thresholds = await TaxThresholdModel.getActiveThresholdsByTaxYear(taxYear);
      return res.status(200).json({
        success: true,
        data: thresholds,
      });
    } catch (error) {
      console.error("Get active thresholds error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax thresholds.",
      });
    }
  },

  // admin: get all thresholds with filters
  async getAllThresholds(req, res) {
    try {
      const thresholds = await TaxThresholdModel.getAllThresholds(req.query || {});
      return res.status(200).json({
        success: true,
        data: thresholds,
      });
    } catch (error) {
      console.error("Get all thresholds error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax thresholds.",
      });
    }
  },

  // admin: get threshold by id
  async getThresholdById(req, res) {
    try {
      const threshold = await TaxThresholdModel.getThresholdById(req.params.id);
      if (!threshold) {
        return res.status(404).json({
          success: false,
          message: "Tax threshold not found.",
        });
      }
      return res.status(200).json({
        success: true,
        data: threshold,
      });
    } catch (error) {
      console.error("Get threshold by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax threshold.",
      });
    }
  },

  // admin: create threshold
  async createThreshold(req, res) {
    try {
      const { tax_year, category, tax_free_threshold, effective_from } = req.body;

      if (!tax_year || !category || tax_free_threshold === undefined || !effective_from) {
        return res.status(400).json({
          success: false,
          message: "tax_year, category, tax_free_threshold, and effective_from are required.",
        });
      }

      if (Number(tax_free_threshold) < 0 || isNaN(Number(tax_free_threshold))) {
        return res.status(400).json({
          success: false,
          message: "tax_free_threshold must be a non-negative number.",
        });
      }

      const result = await TaxThresholdModel.createThreshold(req.body);
      return res.status(201).json({
        success: true,
        message: "Tax threshold created successfully.",
        data: { id: result.insertId, ...req.body },
      });
    } catch (error) {
      console.error("Create threshold error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create tax threshold.",
      });
    }
  },

  // admin: update threshold
  async updateThreshold(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxThresholdModel.getThresholdById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax threshold not found.",
        });
      }

      await TaxThresholdModel.updateThreshold(id, req.body);
      const updated = await TaxThresholdModel.getThresholdById(id);

      return res.status(200).json({
        success: true,
        message: "Tax threshold updated successfully.",
        data: updated,
      });
    } catch (error) {
      console.error("Update threshold error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update tax threshold.",
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

      await TaxThresholdModel.toggleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Tax threshold status updated to ${status}.`,
      });
    } catch (error) {
      console.error("Toggle threshold status error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update status.",
      });
    }
  },

  // admin: delete threshold with historical protection
  async deleteThreshold(req, res) {
    try {
      const { id } = req.params;
      const existing = await TaxThresholdModel.getThresholdById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Tax threshold not found.",
        });
      }
      const refCount = await db.query(
        'SELECT COUNT(*) as count FROM tax_calculations WHERE tax_year = ? AND category = ?',
        [existing.tax_year, existing.category]
      );
      if (Number(refCount[0]?.count || 0) > 0) {
        await TaxThresholdModel.toggleStatus(id, 'INACTIVE');
        return res.status(200).json({
          success: true,
          action: "DEACTIVATED",
          message: "Tax threshold is referenced in historical calculations. It has been deactivated (status set to INACTIVE) to preserve historical records.",
          data: { id, status: "INACTIVE" },
        });
      }
      await TaxThresholdModel.deleteThreshold(id);
      return res.status(200).json({
        success: true,
        action: "DELETED",
        message: "Tax threshold deleted successfully.",
        data: { id },
      });
    } catch (error) {
      console.error("Delete threshold error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete tax threshold.",
      });
    }
  },

  // admin: get available tax years
  async getAvailableTaxYears(req, res) {
    try {
      const years = await TaxThresholdModel.getAvailableTaxYears();
      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error) {
      console.error("Get threshold tax years error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tax years.",
      });
    }
  },
};

module.exports = TaxThresholdController;
