const TaxDeductionModel = require("../models/taxDeductionModel");

const TaxDeductionRuleModel = require("../models/taxDeductionRuleModel");

const TaxDeductionService = {
  // validate tax year

  validateTaxYear(taxYear) {
    if (typeof taxYear !== "string" || !/^\d{4}-\d{2}$/.test(taxYear.trim())) {
      throw new Error("Invalid tax year format. Use YYYY-YY.");
    }

    return taxYear.trim();
  },

  // validate deduction code

  validateDeductionCode(deductionCode) {
    if (typeof deductionCode !== "string" || deductionCode.trim() === "") {
      throw new Error("Deduction code is required.");
    }

    return deductionCode.trim().toUpperCase();
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

  // validate deduction data

  async validateDeductionData(data) {
    const { tax_year, deduction_code, amount, description, deduction_date } =
      data;

    // tax year

    const normalizedTaxYear = this.validateTaxYear(tax_year);

    // deduction code

    const normalizedCode = this.validateDeductionCode(deduction_code);

    // amount required

    if (amount === undefined || amount === null || amount === "") {
      throw new Error("Deduction amount is required.");
    }

    // amount validation

    const deductionAmount = Number(amount);

    if (!Number.isFinite(deductionAmount)) {
      throw new Error("Deduction amount must be a valid number.");
    }

    if (deductionAmount <= 0) {
      throw new Error("Deduction amount must be greater than 0.");
    }

    // deduction date

    const normalizedDate = this.validateDate(deduction_date, "deduction date");

    // get active rules

    const rules =
      await TaxDeductionRuleModel.getActiveRulesByTaxYear(normalizedTaxYear);

    if (!rules || rules.length === 0) {
      throw new Error(
        `No active tax deduction rules found for ${normalizedTaxYear}.`,
      );
    }

    // find matching rule

    const rule = rules.find(
      (item) => String(item.deduction_code).toUpperCase() === normalizedCode,
    );

    if (!rule) {
      throw new Error(`Invalid or inactive deduction code: ${normalizedCode}`);
    }

    // effective date validation

    const effectiveFrom = new Date(rule.effective_from);

    const effectiveTo = rule.effective_to ? new Date(rule.effective_to) : null;

    const actualDeductionDate = new Date(normalizedDate);

    // Earning period (Income Year) validation:
    // For Assessment Year YYYY-YY, investments must be made within the Income Year (July 1 of YYYY-1 to June 30 of YYYY).
    const startYear = parseInt(normalizedTaxYear.split("-")[0], 10);
    const incomeStartDate = new Date(`${startYear - 1}-07-01`);
    const incomeEndDate = new Date(`${startYear}-06-30T23:59:59.999Z`);

    if (actualDeductionDate < incomeStartDate) {
      throw new Error(`Deduction date cannot be before Income Year start (${startYear - 1}-07-01).`);
    }

    if (actualDeductionDate > incomeEndDate) {
      throw new Error(`Deduction date cannot be after Income Year end (${startYear}-06-30).`);
    }

    if (effectiveTo && actualDeductionDate > effectiveTo) {
      throw new Error("Deduction date is after the rule effective date.");
    }

    // important
    // maximum_amount এখানে deduction amount reject
    // করার জন্য ব্যবহার করা হচ্ছে না।
    // example:
    // pension_scheme
    // maximum_amount = 120000
    // user actual contribution = 150000
    // 150000 database-এ রাখা যাবে।
    // tax calculation engine:
    // allowable = min(150000, 120000)
    // তাই এখানে maximum_amount দিয়ে reject করা হবে না.

    const policySumAssured =
      data.policy_sum_assured !== undefined &&
      data.policy_sum_assured !== null &&
      data.policy_sum_assured !== ""
        ? Math.max(0, Number(data.policy_sum_assured))
        : null;

    return {
      tax_year: normalizedTaxYear,
      deduction_code: normalizedCode,
      amount: deductionAmount,
      policy_sum_assured: policySumAssured,
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      deduction_date: normalizedDate,
      rule,
    };
  },

  // create tax deduction

  async createDeduction(userId, deductionData) {
    const validated = await this.validateDeductionData(deductionData);

    const result = await TaxDeductionModel.create({
      user_id: userId,
      tax_year: validated.tax_year,
      deduction_code: validated.deduction_code,
      amount: validated.amount,
      policy_sum_assured: validated.policy_sum_assured,
      description: validated.description,
      deduction_date: validated.deduction_date,
    });

    return {
      id: result.insertId,
      user_id: userId,
      tax_year: validated.tax_year,
      deduction_code: validated.deduction_code,
      amount: validated.amount,
      policy_sum_assured: validated.policy_sum_assured,
      description: validated.description,
      deduction_date: validated.deduction_date,
    };
  },

  // get all my deductions

  async getMyDeductions(userId) {
    return await TaxDeductionModel.findByUserId(userId);
  },

  // get my deductions by tax year

  async getMyDeductionsByTaxYear(userId, taxYear) {
    const normalizedTaxYear = this.validateTaxYear(taxYear);

    return await TaxDeductionModel.findByUserIdAndTaxYear(
      userId,
      normalizedTaxYear,
    );
  },

  // get single deduction

  async getDeductionById(id, userId) {
    const deduction = await TaxDeductionModel.findById(id);

    if (!deduction) {
      throw new Error("Tax deduction not found.");
    }

    // ownership check

    if (Number(deduction.user_id) !== Number(userId)) {
      throw new Error("You are not authorized to access this deduction.");
    }

    return deduction;
  },

  // update tax deduction

  async updateDeduction(id, userId, deductionData) {
    // find existing

    const existing = await TaxDeductionModel.findById(id);

    if (!existing) {
      throw new Error("Tax deduction not found.");
    }

    // ownership

    if (Number(existing.user_id) !== Number(userId)) {
      throw new Error("You are not authorized to update this deduction.");
    }

    // validate new data

    const validated = await this.validateDeductionData(deductionData);


    await TaxDeductionModel.update(id, {
      tax_year: validated.tax_year,
      deduction_code: validated.deduction_code,
      amount: validated.amount,
      policy_sum_assured: validated.policy_sum_assured,
      description: validated.description,
      deduction_date: validated.deduction_date,
    });

    // return updated data

    return await TaxDeductionModel.findById(id);
  },

  // delete tax deduction

  async deleteDeduction(id, userId) {
    const deduction = await TaxDeductionModel.findById(id);

    if (!deduction) {
      throw new Error("Tax deduction not found.");
    }

    // ownership

    if (Number(deduction.user_id) !== Number(userId)) {
      throw new Error("You are not authorized to delete this deduction.");
    }

    await TaxDeductionModel.delete(id);
  },

  // total deduction

  async getTotalDeduction(userId, taxYear) {
    const normalizedTaxYear = this.validateTaxYear(taxYear);

    const total = await TaxDeductionModel.getTotalByUserAndTaxYear(
      userId,
      normalizedTaxYear,
    );

    return {
      user_id: userId,

      tax_year: normalizedTaxYear,

      total_deduction: Number(total),
    };
  },
};

module.exports = TaxDeductionService;
