const MinimumTaxRuleModel = require("../models/minimumTaxRuleModel");
const db = require("../database/query");

const MinimumTaxRuleService = {
  // Get active rules by tax year
  async getRulesByTaxYear(taxYear) {
    if (!taxYear) {
      throw new Error("Tax year is required.");
    }
    return await MinimumTaxRuleModel.findByTaxYear(taxYear);
  },

  // Get active rule by area code
  async getRuleByAreaCode(taxYear, areaCode) {
    if (!taxYear || !areaCode) {
      throw new Error("Tax year and area code are required.");
    }
    return await MinimumTaxRuleModel.findByAreaCode(taxYear, areaCode);
  },

  // Admin: get available tax years
  async getAvailableTaxYears() {
    return await MinimumTaxRuleModel.getAvailableTaxYears();
  },

  // Admin: get all rules with filters
  async getAllRules(filters = {}) {
    return await MinimumTaxRuleModel.getAllRules(filters);
  },

  // Admin: get rule by ID
  async getRuleById(id) {
    const rule = await MinimumTaxRuleModel.getRuleById(id);
    if (!rule) {
      throw new Error("Minimum tax rule not found.");
    }
    return rule;
  },

  // Admin: create rule
  async createRule(data) {
    if (!data) {
      throw new Error("Rule data is required.");
    }

    const { tax_year, minimum_tax_amount, effective_from } = data;

    if (!tax_year || minimum_tax_amount === undefined || !effective_from) {
      throw new Error("tax_year, minimum_tax_amount, and effective_from are required.");
    }

    if (!/^\d{4}-\d{2}$/.test(String(tax_year).trim())) {
      throw new Error("Invalid tax year format. Expected YYYY-YY.");
    }

    const amount = Number(minimum_tax_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("minimum_tax_amount must be a non-negative number.");
    }

    // Support NEW_TAXPAYER, REGULAR_TAXPAYER, and AREA_BASED
    let ruleType = data.rule_type ? String(data.rule_type).trim().toUpperCase() : "AREA_BASED";
    let areaCode = data.area_code ? String(data.area_code).trim().toUpperCase() : null;
    let areaName = data.area_name ? String(data.area_name).trim() : null;

    if (ruleType === "NEW_TAXPAYER") {
      ruleType = "TAXPAYER_TYPE";
      areaCode = areaCode || "NEW_TAXPAYER";
      areaName = areaName || "New / First-Time Taxpayer (নতুন করদাতা)";
    } else if (ruleType === "REGULAR_TAXPAYER") {
      ruleType = "TAXPAYER_TYPE";
      areaCode = areaCode || "REGULAR_TAXPAYER";
      areaName = areaName || "Regular Taxpayer (নিয়মিত করদাতা)";
    } else if (ruleType === "TAXPAYER_TYPE") {
      if (!areaCode) {
        throw new Error("area_code (e.g. NEW_TAXPAYER or REGULAR_TAXPAYER) is required for TAXPAYER_TYPE rules.");
      }
      if (!areaName) {
        areaName = areaCode === "NEW_TAXPAYER" ? "New / First-Time Taxpayer" : "Regular Taxpayer";
      }
    } else {
      // AREA_BASED
      ruleType = "AREA_BASED";
      if (!areaCode || !areaName) {
        throw new Error("area_code and area_name are required for AREA_BASED rules.");
      }
    }

    // Check duplicate rule for this tax year and area code
    const existing = await MinimumTaxRuleModel.findByAreaCode(tax_year, areaCode);
    if (existing) {
      const err = new Error(`A minimum tax rule for ${areaCode} already exists in tax year ${tax_year}.`);
      err.code = "DUPLICATE_RULE";
      err.statusCode = 409;
      throw err;
    }

    const ruleData = {
      tax_year: String(tax_year).trim(),
      rule_type: ruleType,
      area_code: areaCode,
      area_name: areaName,
      minimum_tax_amount: amount,
      status: data.status || "ACTIVE",
      effective_from: data.effective_from,
      effective_to: data.effective_to || null,
    };

    const result = await MinimumTaxRuleModel.createRule(ruleData);
    return {
      id: result.insertId,
      ...ruleData,
    };
  },

  // Admin: update rule
  async updateRule(id, data) {
    const existing = await MinimumTaxRuleModel.getRuleById(id);
    if (!existing) {
      throw new Error("Minimum tax rule not found.");
    }

    if (data.minimum_tax_amount !== undefined) {
      const amount = Number(data.minimum_tax_amount);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("minimum_tax_amount must be a non-negative number.");
      }
    }

    await MinimumTaxRuleModel.updateRule(id, data);
    return await MinimumTaxRuleModel.getRuleById(id);
  },

  // Admin: toggle status
  async toggleStatus(id, status) {
    const existing = await MinimumTaxRuleModel.getRuleById(id);
    if (!existing) {
      throw new Error("Minimum tax rule not found.");
    }

    const normalizedStatus = String(status || "").trim().toUpperCase();
    if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
      throw new Error("Status must be ACTIVE or INACTIVE.");
    }

    await MinimumTaxRuleModel.toggleStatus(id, normalizedStatus);
    return { id, status: normalizedStatus };
  },

  // Admin: delete rule with historical protection
  async deleteRule(id) {
    const existing = await MinimumTaxRuleModel.getRuleById(id);
    if (!existing) {
      throw new Error("Minimum tax rule not found.");
    }

    // Check if referenced in historical calculations
    const refCount = await db.query(
      `SELECT COUNT(*) as count FROM tax_calculations WHERE minimum_tax_rule_id = ?`,
      [id]
    );

    if (Number(refCount[0]?.count || 0) > 0) {
      // Historical rule protection: Auto-deactivate instead of hard delete
      await MinimumTaxRuleModel.toggleStatus(id, "INACTIVE");
      return {
        id,
        action: "DEACTIVATED",
        message: "Rule is referenced in historical calculations. It has been deactivated (status set to INACTIVE) to preserve historical calculation records.",
      };
    }

    // Safe to permanently delete unused draft rule
    await MinimumTaxRuleModel.deleteRule(id);
    return {
      id,
      action: "DELETED",
      message: "Minimum tax rule deleted successfully.",
    };
  },
};

module.exports = MinimumTaxRuleService;

