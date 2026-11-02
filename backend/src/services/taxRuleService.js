const TaxRuleModel = require("../models/taxRuleModel");
const db = require("../database/query");

const TaxRuleService = {
  // validate tax year

  validateTaxYear(taxYear) {
    if (!taxYear) {
      throw new Error(
        "Tax year is required.",
      );
    }

    const year = String(
      taxYear,
    ).trim();

    if (
      !/^\d{4}-\d{2}$/.test(
        year,
      )
    ) {
      throw new Error(
        "Invalid tax year format. Use YYYY-YY.",
      );
    }

    return year;
  },

  // get active rules

  async getActiveTaxRules(
    taxYear,
  ) {
    const year =
      this.validateTaxYear(
        taxYear,
      );

    return await TaxRuleModel.getActiveRulesByTaxYear(
      year,
    );
  },

  // get all rules
  // admin

  async getAllTaxRules(
    taxYear,
  ) {
    const year =
      this.validateTaxYear(
        taxYear,
      );

    return await TaxRuleModel.getAllRulesByTaxYear(
      year,
    );
  },

  // get available tax years

  async getAvailableTaxYears() {
    return await TaxRuleModel.getAvailableTaxYears();
  },

  // get tax year status

  async getTaxYearStatus(
    taxYear,
  ) {
    const year =
      this.validateTaxYear(
        taxYear,
      );

    return await TaxRuleModel.getTaxYearStatus(
      year,
    );
  },

  // create tax rule
  // number of slabs is not fixed.

  async createTaxRule(data) {
    if (!data) {
      throw new Error(
        "Tax rule data is required.",
      );
    }

    const taxYear =
      this.validateTaxYear(
        data.tax_year,
      );

    const minimumIncome =
      Number(
        data.minimum_income,
      );

    const maximumIncome =
      data.maximum_income ===
        null ||
      data.maximum_income ===
        "" ||
      data.maximum_income ===
        undefined
        ? null
        : Number(
            data.maximum_income,
          );

    const taxRate =
      Number(
        data.tax_rate,
      );

    const fixedAmount =
      data.fixed_amount ===
        undefined ||
      data.fixed_amount ===
        ""
        ? 0
        : Number(
            data.fixed_amount,
          );

    if (
      !Number.isFinite(
        minimumIncome,
      ) ||
      minimumIncome < 0
    ) {
      throw new Error(
        "Minimum income must be 0 or greater.",
      );
    }

    if (
      maximumIncome !==
        null &&
      (
        !Number.isFinite(
          maximumIncome,
        ) ||
        maximumIncome <=
          minimumIncome
      )
    ) {
      throw new Error(
        "Maximum income must be greater than minimum income.",
      );
    }

    if (
      !Number.isFinite(
        taxRate,
      ) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      throw new Error(
        "Tax rate must be between 0 and 100.",
      );
    }

    if (
      !Number.isFinite(
        fixedAmount,
      ) ||
      fixedAmount < 0
    ) {
      throw new Error(
        "Fixed amount must be 0 or greater.",
      );
    }

    if (
      !data.effective_from
    ) {
      throw new Error(
        "Effective from date is required.",
      );
    }

    // get existing year status

    const yearStatus =
      await TaxRuleModel.getTaxYearStatus(
        taxYear,
      );

    // get all existing slabs

    const existingRules =
      await TaxRuleModel.getAllRulesByTaxYear(
        taxYear,
      );

    // check overlapping slabs
    // works for any number of slabs.

    const newMax =
      maximumIncome ===
      null
        ? Infinity
        : maximumIncome;

    const hasOverlap =
      existingRules.some(
        (rule) => {
          const existingMin =
            Number(
              rule.minimum_income,
            );

          const existingMax =
            rule.maximum_income ===
              null ||
            rule.maximum_income ===
              undefined
              ? Infinity
              : Number(
                  rule.maximum_income,
                );

          return (
            minimumIncome <
              existingMax &&
            newMax >
              existingMin
          );
        },
      );

    if (hasOverlap) {
      throw new Error(
        "This tax slab overlaps with an existing slab.",
      );
    }

    // determine status
    let status = data.status || (yearStatus && yearStatus.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");


    return await TaxRuleModel.createTaxRule(
      {
        tax_year:
          taxYear,

        minimum_income:
          minimumIncome,

        maximum_income:
          maximumIncome,

        tax_rate:
          taxRate,

        fixed_amount:
          fixedAmount,

        status,

        effective_from:
          data.effective_from,

        effective_to:
          data.effective_to ||
          null,
      },
    );
  },

  // update single slab

  async updateTaxRule(
    id,
    data,
  ) {
    const ruleId =
      Number(id);

    if (
      !Number.isInteger(
        ruleId,
      ) ||
      ruleId <= 0
    ) {
      throw new Error(
        "Invalid tax rule ID.",
      );
    }

    const taxYear =
      this.validateTaxYear(
        data.tax_year,
      );

    const minimumIncome =
      Number(
        data.minimum_income,
      );

    const maximumIncome =
      data.maximum_income ===
        null ||
      data.maximum_income ===
        "" ||
      data.maximum_income ===
        undefined
        ? null
        : Number(
            data.maximum_income,
          );

    const taxRate =
      Number(
        data.tax_rate,
      );

    const fixedAmount =
      data.fixed_amount ===
        undefined ||
      data.fixed_amount ===
        ""
        ? 0
        : Number(
            data.fixed_amount,
          );

    if (
      !Number.isFinite(
        minimumIncome,
      ) ||
      minimumIncome < 0
    ) {
      throw new Error(
        "Minimum income must be 0 or greater.",
      );
    }

    if (
      maximumIncome !==
        null &&
      (
        !Number.isFinite(
          maximumIncome,
        ) ||
        maximumIncome <=
          minimumIncome
      )
    ) {
      throw new Error(
        "Maximum income must be greater than minimum income.",
      );
    }

    if (
      !Number.isFinite(
        taxRate,
      ) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      throw new Error(
        "Tax rate must be between 0 and 100.",
      );
    }

    if (
      !Number.isFinite(
        fixedAmount,
      ) ||
      fixedAmount < 0
    ) {
      throw new Error(
        "Fixed amount must be 0 or greater.",
      );
    }

    if (
      !data.effective_from
    ) {
      throw new Error(
        "Effective from date is required.",
      );
    }

    // get other slabs

    const existingRules =
      await TaxRuleModel.getRulesByTaxYearExceptId(
        taxYear,
        ruleId,
      );

    // check overlap

    const newMax =
      maximumIncome ===
      null
        ? Infinity
        : maximumIncome;

    const hasOverlap =
      existingRules.some(
        (rule) => {
          const existingMin =
            Number(
              rule.minimum_income,
            );

          const existingMax =
            rule.maximum_income ===
              null ||
            rule.maximum_income ===
              undefined
              ? Infinity
              : Number(
                  rule.maximum_income,
                );

          return (
            minimumIncome <
              existingMax &&
            newMax >
              existingMin
          );
        },
      );

    if (hasOverlap) {
      throw new Error(
        "This tax slab overlaps with another slab.",
      );
    }

    const result =
      await TaxRuleModel.updateTaxRule(
        ruleId,
        {
          tax_year:
            taxYear,

          minimum_income:
            minimumIncome,

          maximum_income:
            maximumIncome,

          tax_rate:
            taxRate,

          fixed_amount:
            fixedAmount,

          effective_from:
            data.effective_from,

          effective_to:
            data.effective_to ||
            null,
        },
      );

    if (
      result.affectedRows ===
      0
    ) {
      throw new Error(
        "Tax rule not found.",
      );
    }

    return result;
  },

  // activate / deactivate whole year

  async updateTaxYearStatus(
    taxYear,
    status,
  ) {
    const year =
      this.validateTaxYear(
        taxYear,
      );

    const normalizedStatus =
      String(
        status || "",
      )
        .trim()
        .toUpperCase();

    if (
      normalizedStatus !==
        "ACTIVE" &&
      normalizedStatus !==
        "INACTIVE"
    ) {
      throw new Error(
        "Status must be ACTIVE or INACTIVE.",
      );
    }

    const yearStatus =
      await TaxRuleModel.getTaxYearStatus(
        year,
      );

    if (!yearStatus) {
      throw new Error(
        "Tax year not found.",
      );
    }

    if (
      normalizedStatus ===
        "ACTIVE"
    ) {
      const rules =
        await TaxRuleModel.getAllRulesByTaxYear(
          year,
        );

      if (
        rules.length === 0
      ) {
        throw new Error(
          "Cannot activate a tax year without any tax slab.",
        );
      }

      // check overlap before activation

      const sortedRules =
        [...rules].sort(
          (a, b) =>
            Number(
              a.minimum_income,
            ) -
            Number(
              b.minimum_income,
            ),
        );

      for (
        let i = 0;
        i <
        sortedRules.length - 1;
        i++
      ) {
        const current =
          sortedRules[i];

        const next =
          sortedRules[i + 1];

        const currentMax =
          current.maximum_income ===
            null ||
          current.maximum_income ===
            undefined
            ? Infinity
            : Number(
                current.maximum_income,
              );

        const nextMin =
          Number(
            next.minimum_income,
          );

        if (
          currentMax >
          nextMin
        ) {
          throw new Error(
            `Tax slabs overlap between ${current.minimum_income} and ${next.minimum_income}.`,
          );
        }
      }
    }

    const result =
      await TaxRuleModel.updateTaxYearStatus(
        year,
        normalizedStatus,
      );

    if (
      result.affectedRows ===
      0
    ) {
      throw new Error(
        "Tax year status could not be updated.",
      );
    }

    return await TaxRuleModel.getTaxYearStatus(
      year,
    );
  },

  // Get available public tax years
  async getPublicTaxYears() {
    const rows = await db.query(
      `
        SELECT DISTINCT tax_year
        FROM tax_rules
        WHERE status = 'ACTIVE'
        ORDER BY tax_year DESC
      `
    );
    return rows.map((r) => r.tax_year);
  },

  // Get full rules overview for a specific tax year from database
  async getPublicYearOverview(taxYear) {
    const year = this.validateTaxYear(taxYear);

    const [slabs, thresholds, salary, minTax, rebates, surcharges] = await Promise.all([
      db.query(
        `SELECT id, minimum_income, maximum_income, tax_rate, fixed_amount
         FROM tax_rules
         WHERE tax_year = ? AND status = 'ACTIVE'
         ORDER BY minimum_income ASC`,
        [year]
      ),
      db.query(
        `SELECT id, category, tax_free_threshold
         FROM tax_thresholds
         WHERE tax_year = ? AND status = 'ACTIVE'
         ORDER BY tax_free_threshold ASC, id ASC`,
        [year]
      ),
      db.query(
        `SELECT calculation_type, exemption_percentage, max_exemption_amount, description
         FROM salary_exemption_rules
         WHERE tax_year = ? AND status = 'ACTIVE'
         ORDER BY id DESC
         LIMIT 1`,
        [year]
      ),
      db.query(
        `SELECT id, rule_type, area_code, area_name, minimum_tax_amount
         FROM minimum_tax_rules
         WHERE tax_year = ? AND status = 'ACTIVE'
         ORDER BY id ASC`,
        [year]
      ),
      db.query(
        `SELECT id, rule_code, rule_name, description, calculation_type, rate, fixed_amount
         FROM tax_rebate_rules
         WHERE tax_year = ? AND status = 'ACTIVE'
         ORDER BY id ASC`,
        [year]
      ),
      db.query(
        `SELECT id, rule_name, minimum_wealth, maximum_wealth, surcharge_rate
         FROM surcharge_rules
         WHERE tax_year = ? AND status = 'ACTIVE'
         ORDER BY minimum_wealth ASC`,
        [year]
      ),
    ]);

    return {
      taxYear: year,
      slabs,
      thresholds,
      salaryExemption: salary[0] || null,
      minimumTax: minTax,
      rebates,
      surcharges,
    };
  },

  // Get full overview for all active tax years in one shot
  async getPublicAllYearsOverview() {
    const years = await this.getPublicTaxYears();
    const overviews = await Promise.all(
      years.map((yr) => this.getPublicYearOverview(yr))
    );

    const overviewByYear = {};
    overviews.forEach((ov) => {
      overviewByYear[ov.taxYear] = ov;
    });

    return {
      years,
      overviews,
      overviewByYear,
    };
  },
  // get rule by id
  async getTaxRuleById(id) {
    const rule = await TaxRuleModel.getRuleById(id);
    if (!rule) {
      throw new Error('Tax rule not found.');
    }
    return rule;
  },

  // toggle rule status
  async toggleRuleStatus(id, status) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new Error('Status must be ACTIVE or INACTIVE.');
    }
    const rule = await TaxRuleModel.getRuleById(id);
    if (!rule) {
      throw new Error('Tax rule not found.');
    }
    await TaxRuleModel.toggleStatus(id, status);
    return { id, status };
  },

  // delete tax rule (individual slab)
  async deleteTaxRule(id) {
    const rule = await TaxRuleModel.getRuleById(id);
    if (!rule) {
      throw new Error('Tax rule not found.');
    }
    await TaxRuleModel.deleteTaxRule(id);
    return { id, action: 'DELETED', message: 'Tax slab deleted successfully.' };
  },
};

module.exports = TaxRuleService;
