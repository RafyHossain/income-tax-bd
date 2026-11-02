const TaxDeductionRuleModel = require("../models/taxDeductionRuleModel");
const db = require("../database/query");

const TaxDeductionRuleService = {
  // constants

  ALLOWED_CALCULATION_TYPES: ["FIXED", "PERCENTAGE", "LIMITED", "ACTUAL"],

  // validate tax year

  validateTaxYear(taxYear) {
    if (!taxYear) {
      throw new Error("Tax year is required.");
    }

    const pattern = /^\d{4}-\d{2}$/;

    if (!pattern.test(taxYear)) {
      throw new Error("Invalid tax year format. Use YYYY-YY.");
    }

    const startYear = Number(taxYear.substring(0, 4));

    const endYear = Number(taxYear.substring(5, 7));

    const expectedEndYear = (startYear + 1) % 100;

    if (endYear !== expectedEndYear) {
      throw new Error(
        "Invalid tax year. The ending year must be one year after the starting year.",
      );
    }

    return taxYear;
  },

  // validate date

  validateDate(date, fieldName) {
    if (!date) {
      throw new Error(`${fieldName} is required.`);
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid ${fieldName}.`);
    }

    return date;
  },

  // validate calculation type

  validateCalculationType(calculationType) {
    if (!calculationType) {
      throw new Error("Calculation type is required.");
    }

    if (!this.ALLOWED_CALCULATION_TYPES.includes(calculationType)) {
      throw new Error("Invalid calculation type.");
    }

    return calculationType;
  },

  // validate numeric values

  validateNumericValues(deductionRate, maximumAmount) {
    const rate =
      deductionRate === undefined ||
      deductionRate === null ||
      deductionRate === ""
        ? 0
        : Number(deductionRate);

    if (!Number.isFinite(rate)) {
      throw new Error("Deduction rate must be a valid number.");
    }

    if (rate < 0 || rate > 100) {
      throw new Error("Deduction rate must be between 0 and 100.");
    }

    let maximum = null;

    if (
      maximumAmount !== undefined &&
      maximumAmount !== null &&
      maximumAmount !== ""
    ) {
      maximum = Number(maximumAmount);

      if (!Number.isFinite(maximum)) {
        throw new Error("Maximum amount must be a valid number.");
      }

      if (maximum < 0) {
        throw new Error("Maximum amount cannot be negative.");
      }
    }

    return {
      rate,
      maximum,
    };
  },

  // validate effective dates

  validateEffectiveDates(effectiveFrom, effectiveTo) {
    this.validateDate(effectiveFrom, "effective from date");

    if (effectiveTo) {
      this.validateDate(effectiveTo, "effective to date");

      const fromDate = new Date(effectiveFrom);

      const toDate = new Date(effectiveTo);

      if (toDate < fromDate) {
        throw new Error(
          "Effective to date cannot be before effective from date.",
        );
      }
    }
  },

  // validate rule data

  validateRuleData(data) {
    const {
      tax_year,
      deduction_code,
      deduction_name,
      description,
      income_type,
      calculation_type,
      deduction_rate,
      maximum_amount,
      effective_from,
      effective_to,
    } = data;

    // required fields

    if (!tax_year) {
      throw new Error("Tax year is required.");
    }

    if (!deduction_code) {
      throw new Error("Deduction code is required.");
    }

    if (!deduction_name) {
      throw new Error("Deduction name is required.");
    }

    if (!calculation_type) {
      throw new Error("Calculation type is required.");
    }

    if (!effective_from) {
      throw new Error("Effective from date is required.");
    }

    // tax year

    this.validateTaxYear(tax_year);

    // deduction code

    const normalizedCode = String(deduction_code).trim().toUpperCase();

    if (!/^[A-Z0-9_]+$/.test(normalizedCode)) {
      throw new Error(
        "Deduction code may contain only letters, numbers and underscores.",
      );
    }

    // deduction name

    const normalizedName = String(deduction_name).trim();

    if (!normalizedName) {
      throw new Error("Deduction name cannot be empty.");
    }

    // calculation type

    this.validateCalculationType(calculation_type);

    // numeric values

    const { rate, maximum } = this.validateNumericValues(
      deduction_rate,
      maximum_amount,
    );

    // effective dates

    this.validateEffectiveDates(effective_from, effective_to);

    // return normalized data

    return {
      tax_year,

      deduction_code: normalizedCode,

      deduction_name: normalizedName,

      description:
        description !== undefined &&
        description !== null &&
        String(description).trim() !== ""
          ? String(description).trim()
          : null,

      income_type:
        income_type !== undefined &&
        income_type !== null &&
        String(income_type).trim() !== ""
          ? String(income_type).trim()
          : null,

      calculation_type,

      deduction_rate: rate,

      maximum_amount: maximum,

      effective_from,

      effective_to: effective_to || null,
    };
  },

  // create deduction rule

  async createDeductionRule(data) {
    const validated = this.validateRuleData(data);

    // check duplicate active rule

    const existingRules = await TaxDeductionRuleModel.getActiveRulesByTaxYear(
      validated.tax_year,
    );

    const duplicate = existingRules.find(
      (rule) =>
        String(rule.deduction_code).toUpperCase() === validated.deduction_code,
    );

    if (duplicate) {
      throw new Error(
        "A deduction rule with this code already exists for this tax year.",
      );
    }


    const result = await TaxDeductionRuleModel.createDeductionRule({
      tax_year: validated.tax_year,

      deduction_code: validated.deduction_code,

      deduction_name: validated.deduction_name,

      description: validated.description,

      income_type: validated.income_type,

      calculation_type: validated.calculation_type,

      deduction_rate: validated.deduction_rate,

      maximum_amount: validated.maximum_amount,

      status: "ACTIVE",

      effective_from: validated.effective_from,

      effective_to: validated.effective_to,
    });

    return result;
  },

  // get active rules by tax year

  async getActiveDeductionRules(taxYear) {
    this.validateTaxYear(taxYear);

    return await TaxDeductionRuleModel.getActiveRulesByTaxYear(taxYear);
  },

  // get one rule by id

  async getDeductionRuleById(id) {
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new Error("Invalid tax deduction rule ID.");
    }

    const rules = await TaxDeductionRuleModel.getDeductionRuleById(ruleId);

    if (!rules || rules.length === 0) {
      throw new Error("Tax deduction rule not found.");
    }

    return rules[0];
  },

  // update deduction rule

  async updateDeductionRule(id, data) {
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new Error("Invalid tax deduction rule ID.");
    }

    // existing rule

    const existingRules =
      await TaxDeductionRuleModel.getDeductionRuleById(ruleId);

    if (!existingRules || existingRules.length === 0) {
      throw new Error("Tax deduction rule not found.");
    }

    const existingRule = existingRules[0];

    // validate new data

    const validated = this.validateRuleData(data);

    // check duplicate except current rule

    const existingActiveRules =
      await TaxDeductionRuleModel.getActiveRulesByTaxYearExceptId(
        validated.tax_year,
        ruleId,
      );

    const duplicate = existingActiveRules.find(
      (rule) =>
        String(rule.deduction_code).toUpperCase() === validated.deduction_code,
    );

    if (duplicate) {
      throw new Error(
        "A deduction rule with this code already exists for this tax year.",
      );
    }


    const result = await TaxDeductionRuleModel.updateDeductionRule(ruleId, {
      tax_year: validated.tax_year,

      deduction_code: validated.deduction_code,

      deduction_name: validated.deduction_name,

      description: validated.description,

      income_type: validated.income_type,

      calculation_type: validated.calculation_type,

      deduction_rate: validated.deduction_rate,

      maximum_amount: validated.maximum_amount,

      effective_from: validated.effective_from,

      effective_to: validated.effective_to,
    });

    if (result.affectedRows === 0) {
      throw new Error("Tax deduction rule was not updated.");
    }

    return await this.getDeductionRuleById(ruleId);
  },

  // deactivate deduction rule

  async deactivateDeductionRule(id) {
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new Error("Invalid tax deduction rule ID.");
    }

    // check rule

    const existingRules =
      await TaxDeductionRuleModel.getDeductionRuleById(ruleId);

    if (!existingRules || existingRules.length === 0) {
      throw new Error("Tax deduction rule not found.");
    }

    const existingRule = existingRules[0];

    // already inactive

    if (existingRule.status === "INACTIVE") {
      throw new Error("Tax deduction rule is already inactive.");
    }

    // deactivate

    const result = await TaxDeductionRuleModel.deactivateDeductionRule(ruleId);

    if (result.affectedRows === 0) {
      throw new Error("Tax deduction rule was not deactivated.");
    }

    return await this.getDeductionRuleById(ruleId);
  },

  // activate deduction rule

  async activateDeductionRule(id) {
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new Error("Invalid tax deduction rule ID.");
    }

    const existingRules =
      await TaxDeductionRuleModel.getDeductionRuleById(ruleId);

    if (!existingRules || existingRules.length === 0) {
      throw new Error("Tax deduction rule not found.");
    }

    const existingRule = existingRules[0];

    if (existingRule.status === "ACTIVE") {
      throw new Error("Tax deduction rule is already active.");
    }

    const result = await TaxDeductionRuleModel.activateDeductionRule(ruleId);

    if (result.affectedRows === 0) {
      throw new Error("Tax deduction rule was not activated.");
    }

    return await this.getDeductionRuleById(ruleId);
  },

  // get all deduction rules (admin)

  async getAllDeductionRules(filters = {}) {
    return await TaxDeductionRuleModel.getAllDeductionRules(filters);
  },

  // update deduction rule status (admin toggle)

  async updateDeductionRuleStatus(id, status) {
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new Error("Invalid tax deduction rule ID.");
    }

    const normalizedStatus = String(status || "").trim().toUpperCase();

    if (normalizedStatus !== "ACTIVE" && normalizedStatus !== "INACTIVE") {
      throw new Error("Invalid status. Must be ACTIVE or INACTIVE.");
    }

    if (normalizedStatus === "ACTIVE") {
      return await this.activateDeductionRule(ruleId);
    }

    return await this.deactivateDeductionRule(ruleId);
  },
  // delete deduction rule with historical protection
  async deleteDeductionRule(ruleId) {
    const existing = await TaxDeductionRuleModel.getRuleById(ruleId);
    if (!existing) {
      throw new Error('Tax deduction rule not found.');
    }
    const refCount = await db.query(
      'SELECT COUNT(*) as count FROM tax_deductions WHERE tax_year = ? AND deduction_code = ?',
      [existing.tax_year, existing.deduction_code]
    );
    if (Number(refCount[0]?.count || 0) > 0) {
      await TaxDeductionRuleModel.updateDeductionRuleStatus(ruleId, 'INACTIVE');
      return {
        id: ruleId,
        action: 'DEACTIVATED',
        message: 'Tax deduction rule is referenced in taxpayer deduction records. It has been deactivated (status set to INACTIVE) to preserve historical records.',
      };
    }
    await TaxDeductionRuleModel.deleteDeductionRule(ruleId);
    return { id: ruleId, action: 'DELETED', message: 'Tax deduction rule deleted successfully.' };
  },
};

module.exports = TaxDeductionRuleService;
