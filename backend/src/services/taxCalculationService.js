const { query, getConnection } = require("../database/query");

const TaxCalculationModel = require("../models/taxCalculationModel");

const TaxCalculationDetailModel = require("../models/taxCalculationDetailModel");

const MinimumTaxRuleModel = require("../models/minimumTaxRuleModel");
const { getIncomeYearFromAssessmentYear } = require("../utils/taxYear");

const TaxCalculationService = {
  // helper: validate + parse tax year

  parseTaxYear(taxYear) {
    if (typeof taxYear !== "string" || taxYear.trim() === "") {
      throw new Error("Tax year is required");
    }

    const normalizedTaxYear = taxYear.trim();

    if (!/^\d{4}-\d{2}$/.test(normalizedTaxYear)) {
      throw new Error("Invalid tax year format");
    }

    const [startYearString, endYearString] =
      normalizedTaxYear.split("-");

    const ayStartYear = Number(startYearString);
    const ayEndYear = ayStartYear + 1;
    const expectedEndYearShort = String(ayEndYear).slice(-2);

    if (endYearString !== expectedEndYearShort) {
      throw new Error("Invalid tax year range");
    }

    // Assessment Year (AY) represents the year immediately following the Income Year.
    // Example: AY 2027-28 -> Income Year 2026-27 (Period: July 1, 2026 to June 30, 2027).
    // Example: AY 2026-27 -> Income Year 2025-26 (Period: July 1, 2025 to June 30, 2026).
    const incomeStartYear = ayStartYear - 1;
    const incomeEndYear = ayStartYear;
    const incomeYear = `${incomeStartYear}-${String(incomeEndYear).slice(-2)}`;

    return {
      taxYear: normalizedTaxYear,
      assessmentYear: normalizedTaxYear,
      incomeYear,
      startYear: ayStartYear,
      endYear: ayEndYear,
      ayStartDate: `${ayStartYear}-07-01`,
      ayEndDate: `${ayEndYear}-06-30`,
      incomeStartDate: `${incomeStartYear}-07-01`,
      incomeEndDate: `${incomeEndYear}-06-30`,
    };
  },

  // helper: round money

  roundMoney(value) {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Number(number.toFixed(2));
  },

  // helper: parse date only

  parseDateOnly(value) {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const date = new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
      );

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const dateString = String(value)
      .trim()
      .substring(0, 10);

    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);

    const month = Number(match[2]) - 1;

    const day = Number(match[3]);

    const date = new Date(year, month, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  },

  // helper: calculate age

  calculateAge(dateOfBirth, taxYearEndDate) {
    const birthDate = this.parseDateOnly(dateOfBirth);

    if (!birthDate) {
      return null;
    }

    let age =
      taxYearEndDate.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      taxYearEndDate.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        taxYearEndDate.getDate() < birthDate.getDate()
      )
    ) {
      age--;
    }

    return age;
  },

  // helper: determine taxpayer category

  determineCategory(profile, taxYearEndDate, taxYear = null) {
    const gender = profile.gender
      ? String(profile.gender)
        .trim()
        .toUpperCase()
      : "";

    // war-wounded freedom fighter
    if (Number(profile.is_freedom_fighter) === 1) {
      return "WAR_WOUNDED_FREEDOM_FIGHTER";
    }

    // july warrior (gazetted persons injured in July 2024 uprising, legally enacted from AY 2026-27 onwards)
    if (Number(profile.is_july_warrior) === 1) {
      if (!taxYear || Number(taxYear.split("-")[0]) >= 2026) {
        return "JULY_WARRIOR";
      }
    }

    // physically challenged
    if (
      Number(profile.is_physically_challenged) === 1
    ) {
      return "PHYSICALLY_CHALLENGED";
    }

    // senior citizen (age >= 65)
    const age = this.calculateAge(
      profile.date_of_birth,
      taxYearEndDate,
    );

    if (age !== null && age >= 65) {
      return "SENIOR_CITIZEN";
    }

    // third gender
    if (
      gender === "THIRD_GENDER" ||
      gender === "THIRD GENDER" ||
      gender === "THIRD"
    ) {
      return "THIRD_GENDER";
    }

    // women
    if (
      gender === "FEMALE" ||
      gender === "WOMEN" ||
      gender === "WOMAN"
    ) {
      return "WOMEN";
    }

    // general
    return "GENERAL";
  },

  // helper: get minimum tax from database
  async getMinimumTaxRule(taxYear, profile = {}, options = {}) {
    if (!taxYear) {
      throw new Error("Tax year is required");
    }

    const minimumTaxRule = await MinimumTaxRuleModel.findEffectiveRule(taxYear, profile, options);

    if (!minimumTaxRule) {
      throw new Error(`Minimum tax rule not found for tax year ${taxYear}`);
    }

    const minimumTax = Number(minimumTaxRule.minimum_tax_amount);

    if (!Number.isFinite(minimumTax) || minimumTax < 0) {
      throw new Error(`Invalid minimum tax amount for tax year ${taxYear}`);
    }

    return {
      id: minimumTaxRule.id,
      ruleType: minimumTaxRule.rule_type,
      areaCode: minimumTaxRule.area_code,
      areaName: minimumTaxRule.area_name,
      amount: this.roundMoney(minimumTax),
      taxpayerClassification: minimumTaxRule.taxpayerClassification || null,
      filingHistoryStatus: minimumTaxRule.filingHistoryStatus || null,
    };
  },

  async getMinimumTaxByArea(taxYear, minimumTaxArea, options = {}) {
    return await this.getMinimumTaxRule(taxYear, { minimum_tax_area: minimumTaxArea }, options);
  },

  // calculate tax

  async calculateTax(userId, taxYear, options = {}) {
    // 1. basic validation

    if (!userId) {
      throw new Error("User ID is required");
    }

    // 2. tax year

    const {
      taxYear: normalizedTaxYear,
      assessmentYear,
      incomeYear,
      startYear,
      endYear,
      ayStartDate,
      ayEndDate,
      incomeStartDate,
      incomeEndDate,
    } = this.parseTaxYear(taxYear);

    void startYear;
    void endYear;

    const taxYearEndDate = new Date(
      endYear,
      5,
      30,
    );

    // 3. get taxpayer profile

    const profileRows = await query(
      `
          SELECT
            user_id,
            date_of_birth,
            gender,
            minimum_tax_area,
            is_new_taxpayer,
            filing_history_status,
            filing_history_verified,
            is_physically_challenged,
            disabled_child_dependents,
            is_freedom_fighter,
            is_july_warrior,
            net_wealth,
            has_multiple_motor_vehicles,
            has_large_house_property,
            tds_amount,
            advance_tax_amount
          FROM taxpayer_profiles
          WHERE user_id = ?
          LIMIT 1
        `,
      [userId],
    );

    if (
      !profileRows ||
      profileRows.length === 0
    ) {
      throw new Error("Taxpayer profile not found");
    }

    // Check year-specific tax credits from tax_credits table
    let yearTds = Number(profileRows[0].tds_amount || 0);
    let yearAdvance = Number(profileRows[0].advance_tax_amount || 0);

    const creditRows = await query(
      `SELECT tds_amount, advance_tax_amount FROM tax_credits WHERE user_id = ? AND tax_year = ? LIMIT 1`,
      [userId, normalizedTaxYear]
    );

    if (creditRows && creditRows.length > 0) {
      yearTds = Number(creditRows[0].tds_amount || 0);
      yearAdvance = Number(creditRows[0].advance_tax_amount || 0);
    }

    const profile = {
      ...profileRows[0],
      tds_amount: yearTds,
      advance_tax_amount: yearAdvance,
      ...(options?.profileOverride || {}),
      user_id: profileRows[0].user_id || userId,
    };

    // 4. determine taxpayer category

    const category = this.determineCategory(
      profile,
      taxYearEndDate,
      normalizedTaxYear,
    );

    // 5. get tax-free threshold

    const thresholdRows = await query(
      `
          SELECT
            tax_free_threshold
          FROM tax_thresholds
          WHERE tax_year = ?
            AND category = ?
            AND status = 'ACTIVE'
            AND (effective_from IS NULL OR effective_from <= ?)
            AND (
              effective_to IS NULL
              OR effective_to >= ?
            )
          ORDER BY
            effective_from DESC,
            id DESC
          LIMIT 1
        `,
      [
        normalizedTaxYear,
        category,
        ayEndDate,
        ayStartDate,
      ],
    );

    if (
      !thresholdRows ||
      thresholdRows.length === 0
    ) {
      throw new Error(
        `Tax threshold not found for ${category} in ${normalizedTaxYear}`,
      );
    }

    const baseTaxFreeThreshold =
      this.roundMoney(
        thresholdRows[0].tax_free_threshold,
      );

    if (baseTaxFreeThreshold < 0) {
      throw new Error(
        "Invalid tax-free threshold",
      );
    }

    // 6. disabled child dependent benefit

    const rawDisabledChildDependents =
      Number(
        profile.disabled_child_dependents || 0,
      );

    if (
      !Number.isInteger(
        rawDisabledChildDependents,
      ) ||
      rawDisabledChildDependents < 0
    ) {
      throw new Error(
        "Invalid disabled child dependent count",
      );
    }

    const disabledChildDependents =
      rawDisabledChildDependents;

    const disabledChildAdditionalThreshold =
      this.roundMoney(
        disabledChildDependents * 50000,
      );

    const taxFreeThreshold =
      this.roundMoney(
        baseTaxFreeThreshold +
        disabledChildAdditionalThreshold,
      );

    // 7. get income records & head-by-head breakdown
    const incomeRows = await query(
      `
          SELECT
            id,
            income_type,
            source_name,
            amount,
            income_date,
            description
          FROM income
          WHERE user_id = ?
            AND income_date BETWEEN ?
            AND ?
          ORDER BY id ASC
        `,
      [
        userId,
        incomeStartDate,
        incomeEndDate,
      ],
    );

    let totalIncome = 0;
    let salaryIncome = 0;
    let housePropertyIncome = 0;
    let businessIncome = 0;
    let agricultureIncome = 0;
    let capitalGainIncome = 0;
    let otherIncome = 0;

    // Track Section 40(2) composite tea/rubber apportionments
    let teaRubberApportionedAgri = 0;
    let teaRubberApportionedBiz = 0;

    for (const inc of incomeRows) {
      const amt = this.roundMoney(Number(inc.amount) || 0);
      totalIncome = this.roundMoney(totalIncome + amt);

      const type = String(inc.income_type || "").trim().toUpperCase();
      const desc = String(inc.description || "").toUpperCase();
      const src = String(inc.source_name || "").toUpperCase();

      // Section 40(2) composite income apportionment (Tea/Rubber cultivation & manufacture)
      // Tea: 60% agricultural income, 40% business income (Statutory apportionment rule)
      const isTeaComposite = type === "TEA_ESTATE" || desc.includes("TEA ESTATE") || desc.includes("TEA MANUFACTURE") || src.includes("TEA ESTATE");
      const isRubberComposite = type === "RUBBER_ESTATE" || desc.includes("RUBBER ESTATE") || src.includes("RUBBER ESTATE");

      if (isTeaComposite || isRubberComposite) {
        const agriRate = 0.60;
        const bizRate = 0.40;
        const agriPart = this.roundMoney(amt * agriRate);
        const bizPart = this.roundMoney(amt * bizRate);
        agricultureIncome = this.roundMoney(agricultureIncome + agriPart);
        businessIncome = this.roundMoney(businessIncome + bizPart);
        teaRubberApportionedAgri = this.roundMoney(teaRubberApportionedAgri + agriPart);
        teaRubberApportionedBiz = this.roundMoney(teaRubberApportionedBiz + bizPart);
        continue;
      }

      if (type === "SALARY" || type === "EMPLOYMENT") {
        salaryIncome = this.roundMoney(salaryIncome + amt);
      } else if (type === "HOUSE_RENT" || type === "RENT" || type === "HOUSE_PROPERTY") {
        housePropertyIncome = this.roundMoney(housePropertyIncome + amt);
      } else if (type === "BUSINESS") {
        businessIncome = this.roundMoney(businessIncome + amt);
      } else if (type === "AGRICULTURE") {
        agricultureIncome = this.roundMoney(agricultureIncome + amt);
      } else if (type === "CAPITAL_GAIN" || type === "CAPITAL_GAINS") {
        capitalGainIncome = this.roundMoney(capitalGainIncome + amt);
      } else if (
        type === "DIVIDEND" ||
        type === "OTHER_SOURCES" ||
        type === "OTHER" ||
        type === "PROFESSIONAL_FEES" ||
        type === "PENSION" ||
        type === "FINANCIAL_ASSETS"
      ) {
        otherIncome = this.roundMoney(otherIncome + amt);
      } else {
        otherIncome = this.roundMoney(otherIncome + amt);
      }
    }

    if (totalIncome < 0) {
      throw new Error(
        "Invalid total income",
      );
    }

    // 7b. get statutory salary exemption (Section 32 & 6th Schedule Part B)
    // Rule: MIN(EligibleSalaryReceipts / 3, 500,000 for AY 2026-27)
    const salaryRuleRows = await query(
      `
        SELECT
          calculation_type,
          exemption_percentage,
          max_exemption_amount
        FROM salary_exemption_rules
        WHERE tax_year = ?
          AND status = 'ACTIVE'
        ORDER BY id DESC
        LIMIT 1
      `,
      [normalizedTaxYear],
    );

    let maxSalaryExemption = Number(normalizedTaxYear.split("-")[0]) >= 2025 ? 500000 : 450000;
    let salaryExemption = 0;

    if (salaryIncome > 0) {
      if (salaryRuleRows.length > 0) {
        const activeSalaryRule = salaryRuleRows[0];
        maxSalaryExemption = Number(activeSalaryRule.max_exemption_amount) || maxSalaryExemption;

        let rawExemption = 0;
        if (activeSalaryRule.calculation_type === "PERCENTAGE") {
          const pct = Number(activeSalaryRule.exemption_percentage) || 33.3333333;
          rawExemption = (salaryIncome * pct) / 100;
        } else {
          // ONE_THIRD (Statutory 1/3 of total salary receipts)
          rawExemption = salaryIncome / 3;
        }

        salaryExemption = this.roundMoney(
          Math.min(rawExemption, maxSalaryExemption),
        );
      } else {
        salaryExemption = this.roundMoney(
          Math.min(salaryIncome / 3, maxSalaryExemption),
        );
      }
    }

    // 7c. Section 38 House Property Deductions (Residential 25% vs Commercial 30%)
    let housePropertyDeduction = 0;
    let housePropertyClassification = options?.propertyClassification || null;
    let housePropertyStatus = "NONE";

    if (housePropertyIncome > 0) {
      const hpRules = await query(
        `SELECT exemption_code, calculation_type, exemption_rate, max_exemption_amount
         FROM income_exemption_rules
         WHERE tax_year = ? AND income_type = 'HOUSE_PROPERTY' AND status = 'ACTIVE'`,
        [normalizedTaxYear]
      );

      const residentialRule = hpRules.find(r => r.exemption_code === 'HOUSE_PROPERTY_REPAIR_RESIDENTIAL');
      const commercialRule = hpRules.find(r => r.exemption_code === 'HOUSE_PROPERTY_REPAIR_COMMERCIAL');

      // If not passed explicitly in options, determine from verified records
      if (!housePropertyClassification) {
        const hasResidential = incomeRows.some(
          r => ['HOUSE_RENT', 'RENT', 'HOUSE_PROPERTY'].includes(String(r.income_type).toUpperCase()) &&
               (String(r.source_name).toUpperCase().includes('RESIDENTIAL') || String(r.description).toUpperCase().includes('RESIDENTIAL'))
        );
        const hasCommercial = incomeRows.some(
          r => ['HOUSE_RENT', 'RENT', 'HOUSE_PROPERTY'].includes(String(r.income_type).toUpperCase()) &&
               (String(r.source_name).toUpperCase().includes('COMMERCIAL') || String(r.description).toUpperCase().includes('COMMERCIAL'))
        );

        if (hasResidential && !hasCommercial) {
          housePropertyClassification = 'RESIDENTIAL';
        } else if (hasCommercial && !hasResidential) {
          housePropertyClassification = 'COMMERCIAL';
        } else if (options?.allowUnverifiedPropertyDeduction === false) {
          housePropertyClassification = 'UNVERIFIED';
        } else {
          housePropertyClassification = 'RESIDENTIAL';
        }
      }

      if (housePropertyClassification === 'COMMERCIAL') {
        const rate = commercialRule ? Number(commercialRule.exemption_rate) : 30.00;
        housePropertyDeduction = this.roundMoney(housePropertyIncome * (rate / 100));
        housePropertyStatus = 'VERIFIED_COMMERCIAL';
      } else if (housePropertyClassification === 'RESIDENTIAL') {
        const rate = residentialRule ? Number(residentialRule.exemption_rate) : 25.00;
        housePropertyDeduction = this.roundMoney(housePropertyIncome * (rate / 100));
        housePropertyStatus = 'VERIFIED_RESIDENTIAL';
      } else if (housePropertyClassification === 'UNVERIFIED' || housePropertyClassification === 'BLOCKED') {
        housePropertyDeduction = 0;
        housePropertyStatus = 'BLOCKED_UNVERIFIED_CLASSIFICATION';
      } else {
        housePropertyDeduction = 0;
        housePropertyStatus = 'BLOCKED_UNVERIFIED_CLASSIFICATION';
      }
    }

    // 7d. Section 42 Actual Agricultural Expenses & Section 43 Special 60% Deduction
    let agricultureDeduction = 0;
    let agricultureDeductionStatus = "NONE";

    if (agricultureIncome > 0) {
      // Section 42: actual allowable agricultural expenses
      const agriExpenseRows = await query(
        `SELECT COALESCE(SUM(amount), 0) AS total_agri_expense
         FROM expenses
         WHERE user_id = ?
           AND (expense_category = 'AGRICULTURE' OR expense_type LIKE '%AGRI%')
           AND is_tax_deductible = 1
           AND expense_date BETWEEN ? AND ?`,
        [userId, incomeStartDate, incomeEndDate]
      );
      const actualAgriExpenses = this.roundMoney(
        Number(agriExpenseRows[0]?.total_agri_expense || 0) +
        Number(options?.actualAgriculturalExpenses || 0)
      );

      // Section 43: 60% Special Deduction Eligibility Verification
      // Statutory Conditions:
      // 1. Accounting status must be established as NO_ACCOUNTS (regular books of accounts not maintained)
      // 2. Agricultural produce must be directly cultivated by taxpayer (NOT land lease / orchard lease / cash rent)
      // 3. Must NEVER apply automatically without established conditions
      const agriAccountingStatus = options?.agricultureAccountingStatus || profile.agriculture_accounting_status || null;
      const agriEligibilityEstablished = options?.agricultureEligibilityEstablished || false;
      const isClaimingSection43 = options?.claimSection43SpecialDeduction === true || agriAccountingStatus === 'NO_ACCOUNTS';

      if (isClaimingSection43) {
        if (!agriEligibilityEstablished && !options?.agricultureAccountingStatus) {
          // Eligibility cannot be established -> mark BLOCKED rather than assuming it
          agricultureDeduction = 0;
          agricultureDeductionStatus = 'BLOCKED_UNVERIFIED_ACCOUNTING_ELIGIBILITY';
        } else if (agriAccountingStatus === 'ACCOUNTS_MAINTAINED') {
          // Accounts maintained: Section 43 is legally disallowed; actual expenses under Section 42 apply
          agricultureDeduction = actualAgriExpenses;
          agricultureDeductionStatus = 'SECTION_42_ACTUAL_EXPENSES';
        } else if (agriAccountingStatus === 'NO_ACCOUNTS') {
          // Calculate direct cultivation produce (excluding land / orchard lease)
          let directCultivationIncome = 0;
          for (const inc of incomeRows) {
            if (String(inc.income_type).toUpperCase() === 'AGRICULTURE') {
              const desc = String(inc.description || "").toUpperCase();
              const src = String(inc.source_name || "").toUpperCase();
              const isLease = desc.includes('LEASE') || src.includes('LEASE') || desc.includes('RENT') || src.includes('ORCHARD LEASE');
              if (!isLease) {
                directCultivationIncome = this.roundMoney(directCultivationIncome + Number(inc.amount));
              }
            }
          }

          const agriRuleRows = await query(
            `SELECT exemption_code, calculation_type, exemption_rate, max_exemption_amount
             FROM income_exemption_rules
             WHERE tax_year = ? AND income_type = 'AGRICULTURE' AND status = 'ACTIVE'
             ORDER BY id DESC LIMIT 1`,
            [normalizedTaxYear]
          );
          const agriRate = agriRuleRows.length > 0 ? Number(agriRuleRows[0].exemption_rate) : 60.00;
          agricultureDeduction = this.roundMoney(directCultivationIncome * (agriRate / 100));
          agricultureDeductionStatus = 'SECTION_43_SPECIAL_60_PERCENT';
        }
      } else {
        // Standard Section 42: actual allowable expenses
        agricultureDeduction = actualAgriExpenses;
        agricultureDeductionStatus = actualAgriExpenses > 0 ? 'SECTION_42_ACTUAL_EXPENSES' : 'NO_AGRI_DEDUCTION';
      }
    }

    // 8. get eligible investment (DPS capped per rule, life insurance premium capped at 10% of sum assured)

    const deductionRows = await query(
      `
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN
                    tr.calculation_type = 'LIMITED'
                    AND tr.maximum_amount IS NOT NULL
                  THEN
                    LEAST(
                      COALESCE(
                        dt.total_amount,
                        0
                      ),
                      tr.maximum_amount
                    )

                  WHEN
                    tr.calculation_type = 'ACTUAL'
                  THEN
                    COALESCE(
                      dt.total_amount,
                      0
                    )

                  ELSE
                    COALESCE(
                      dt.total_amount,
                      0
                    )
                END
              ),
              0
            ) AS eligible_investment
          FROM
          (
            SELECT
              td.deduction_code,
              SUM(
                CASE
                  WHEN td.deduction_code = 'LIFE_INSURANCE' AND td.policy_sum_assured IS NOT NULL AND td.policy_sum_assured > 0
                  THEN LEAST(td.amount, td.policy_sum_assured * 0.10)
                  ELSE td.amount
                END
              ) AS total_amount
            FROM tax_deductions td
            WHERE td.user_id = ?
              AND (td.tax_year = ? OR td.tax_year = ?)
              AND td.deduction_date BETWEEN ?
              AND ?
            GROUP BY
              td.deduction_code
          ) AS dt
          INNER JOIN tax_deduction_rules tr
            ON dt.deduction_code =
               tr.deduction_code
            AND tr.tax_year = ?
          WHERE tr.status = 'ACTIVE'
            AND (tr.effective_from IS NULL OR tr.effective_from <= ?)
            AND (
              tr.effective_to IS NULL
              OR tr.effective_to >= ?
            )
        `,
      [
        userId,
        normalizedTaxYear,
        incomeYear,
        incomeStartDate,
        incomeEndDate,
        normalizedTaxYear,
        ayEndDate,
        ayStartDate,
      ],
    );

    const eligibleInvestment =
      this.roundMoney(
        deductionRows[0]?.eligible_investment,
      );

    // 9. get tax-deductible business expense

    const expenseRows = await query(
      `
          SELECT
            COALESCE(
              SUM(amount),
              0
            ) AS total_deductible_expense
          FROM expenses
          WHERE user_id = ?
            AND expense_category = 'BUSINESS'
            AND is_tax_deductible = 1
            AND expense_date BETWEEN ?
            AND ?
        `,
      [
        userId,
        incomeStartDate,
        incomeEndDate,
      ],
    );

    const totalDeductibleExpense =
      this.roundMoney(
        expenseRows[0]
          ?.total_deductible_expense,
      );

    // Total statutory deduction: salary exemption + tax-deductible business expenses + house property repair + agriculture deduction
    // NOTE: Investment instruments (DPS, Life Insurance, Securities, Stocks, etc.) DO NOT reduce gross or taxable income;
    // they are solely for the Section 78 investment tax rebate.
    const totalDeduction =
      this.roundMoney(
        salaryExemption + totalDeductibleExpense + housePropertyDeduction + agricultureDeduction,
      );

    // 10. calculate taxable income

    const taxableIncome =
      this.roundMoney(
        Math.max(
          totalIncome - totalDeduction,
          0,
        ),
      );

    // 11. get active tax rules

    const taxRules = await query(
      `
          SELECT
            id,
            minimum_income,
            maximum_income,
            tax_rate,
            fixed_amount
          FROM tax_rules
          WHERE tax_year = ?
            AND status = 'ACTIVE'
            AND (effective_from IS NULL OR effective_from <= ?)
            AND (
              effective_to IS NULL
              OR effective_to >= ?
            )
          ORDER BY
            minimum_income ASC,
            id ASC
        `,
      [
        normalizedTaxYear,
        ayEndDate,
        ayStartDate,
      ],
    );

    if (
      !taxRules ||
      taxRules.length === 0
    ) {
      throw new Error(
        `No active tax rules found for ${normalizedTaxYear}`,
      );
    }

    // 12. validate tax rules

    let previousMaximum = null;

    for (const rule of taxRules) {
      const minimumIncome = Number(
        rule.minimum_income,
      );

      const maximumIncome =
        rule.maximum_income === null ||
          rule.maximum_income === undefined
          ? null
          : Number(rule.maximum_income);

      const taxRate = Number(
        rule.tax_rate || 0,
      );

      const fixedAmount = Number(
        rule.fixed_amount || 0,
      );

      if (
        !Number.isFinite(
          minimumIncome,
        ) ||
        minimumIncome < 0
      ) {
        throw new Error(
          `Invalid minimum income in tax rule ${rule.id}`,
        );
      }

      if (
        maximumIncome !== null &&
        (
          !Number.isFinite(
            maximumIncome,
          ) ||
          maximumIncome <= minimumIncome
        )
      ) {
        throw new Error(
          `Invalid maximum income in tax rule ${rule.id}`,
        );
      }

      if (
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 100
      ) {
        throw new Error(
          `Invalid tax rate in tax rule ${rule.id}`,
        );
      }

      if (
        !Number.isFinite(fixedAmount) ||
        fixedAmount < 0
      ) {
        throw new Error(
          `Invalid fixed amount in tax rule ${rule.id}`,
        );
      }

      if (
        previousMaximum !== null &&
        minimumIncome < previousMaximum
      ) {
        throw new Error(
          `Tax rules overlap around income ${minimumIncome}`,
        );
      }

      if (maximumIncome !== null) {
        previousMaximum =
          maximumIncome;
      } else {
        previousMaximum =
          Infinity;
      }
    }

    // 13. progressive tax calculation (NBR sequential intervals)

    let grossTax = 0;

    const details = [];

    // Zero-rate slab representing the individual's tax-free threshold
    const zeroRule = taxRules.find((rule) => Number(rule.tax_rate || 0) === 0);
    const zeroTaxableAmount = this.roundMoney(Math.min(taxableIncome, taxFreeThreshold));
    details.push({
      taxRuleId: zeroRule ? zeroRule.id : null,
      slabOrder: 1,
      minimumIncome: 0,
      maximumIncome: taxFreeThreshold,
      taxRate: 0,
      taxableAmount: zeroTaxableAmount,
      calculatedTax: 0,
    });

    if (taxableIncome > taxFreeThreshold) {
      let currentPointer = taxFreeThreshold;

      for (const rule of taxRules) {
        const taxRate = Number(rule.tax_rate || 0);

        // Skip 0% rules (already handled in base slab)
        if (taxRate <= 0) {
          continue;
        }

        if (taxableIncome <= currentPointer) {
          break;
        }

        const minIncome = Number(rule.minimum_income || 0);
        const maxIncome =
          rule.maximum_income === null || rule.maximum_income === undefined
            ? null
            : Number(rule.maximum_income);

        // Each progressive slab interval span (পরবর্তী ধাপসমূহ)
        const slabSpan =
          maxIncome !== null ? Math.max(0, maxIncome - minIncome) : null;
        const slabStart = currentPointer;
        const slabEnd =
          slabSpan !== null ? currentPointer + slabSpan : null;

        const taxableAmount =
          slabEnd !== null
            ? this.roundMoney(Math.min(taxableIncome, slabEnd) - slabStart)
            : this.roundMoney(taxableIncome - slabStart);

        if (taxableAmount <= 0) {
          continue;
        }

        const calculatedTax = this.roundMoney(
          taxableAmount * (taxRate / 100),
        );

        grossTax = this.roundMoney(grossTax + calculatedTax);

        details.push({
          taxRuleId: rule.id,
          slabOrder: details.length + 1,
          minimumIncome: slabStart + 1,
          maximumIncome: slabEnd,
          taxRate,
          taxableAmount,
          calculatedTax,
        });

        currentPointer = slabEnd !== null ? slabEnd : taxableIncome;

        if (taxableIncome <= currentPointer) {
          break;
        }
      }
    }

    grossTax =
      this.roundMoney(
        grossTax,
      );

    // 14. get active tax rebate rules

    const rebateRuleRows =
      await query(
        `
          SELECT
            id,
            rule_code,
            rule_name,
            calculation_type,
            basis_type,
            rate,
            fixed_amount
          FROM tax_rebate_rules
          WHERE tax_year = ?
            AND status = 'ACTIVE'
            AND (effective_from IS NULL OR effective_from <= ?)
            AND (
              effective_to IS NULL
              OR effective_to >= ?
            )
          ORDER BY
            id ASC
        `,
        [
          normalizedTaxYear,
          ayEndDate,
          ayStartDate,
        ],
      );

    if (
      !rebateRuleRows ||
      rebateRuleRows.length === 0
    ) {
      throw new Error(
        `No active tax rebate rules found for ${normalizedTaxYear}`,
      );
    }

    // 15. validate rebate rules

    const rebateRules = {};

    for (
      const rule of rebateRuleRows
    ) {
      const ruleCode =
        String(
          rule.rule_code || "",
        )
          .trim()
          .toUpperCase();

      if (!ruleCode) {
        throw new Error(
          `Invalid tax rebate rule code in rule ${rule.id}`,
        );
      }

      const calculationType =
        String(
          rule.calculation_type ||
          "",
        )
          .trim()
          .toUpperCase();

      const basisType =
        String(
          rule.basis_type || "",
        )
          .trim()
          .toUpperCase();

      const rate =
        rule.rate === null ||
          rule.rate === undefined
          ? null
          : Number(rule.rate);

      const fixedAmount =
        rule.fixed_amount === null ||
          rule.fixed_amount === undefined
          ? null
          : Number(
            rule.fixed_amount,
          );

      if (
        ![
          "PERCENTAGE",
          "FIXED",
          "LIMIT",
        ].includes(
          calculationType,
        )
      ) {
        throw new Error(
          `Invalid rebate calculation type in rule ${rule.id}: ${calculationType}`,
        );
      }

      if (
        rate !== null &&
        (
          !Number.isFinite(
            rate,
          ) ||
          rate < 0 ||
          rate > 100
        )
      ) {
        throw new Error(
          `Invalid rebate rate in rule ${rule.id}`,
        );
      }

      if (
        fixedAmount !== null &&
        (
          !Number.isFinite(
            fixedAmount,
          ) ||
          fixedAmount < 0
        )
      ) {
        throw new Error(
          `Invalid fixed amount in rebate rule ${rule.id}`,
        );
      }

      if (
        rebateRules[ruleCode]
      ) {
        throw new Error(
          `Duplicate active tax rebate rule: ${ruleCode}`,
        );
      }

      rebateRules[ruleCode] = {
        id: rule.id,

        ruleCode,

        ruleName:
          rule.rule_name,

        calculationType,

        basisType,

        rate,

        fixedAmount,
      };
    }

    // 16. required rebate rules

    const investmentIncomeRule =
      rebateRules
        .INVESTMENT_INCOME_LIMIT;

    const investmentAbsoluteRule =
      rebateRules
        .INVESTMENT_ABSOLUTE_LIMIT;

    const rebateRateRule =
      rebateRules
        .REBATE_RATE;

    if (
      !investmentIncomeRule
    ) {
      throw new Error(
        `Tax rebate rule INVESTMENT_INCOME_LIMIT not found for ${normalizedTaxYear}`,
      );
    }

    if (
      !investmentAbsoluteRule
    ) {
      throw new Error(
        `Tax rebate rule INVESTMENT_ABSOLUTE_LIMIT not found for ${normalizedTaxYear}`,
      );
    }

    if (
      !rebateRateRule
    ) {
      throw new Error(
        `Tax rebate rule REBATE_RATE not found for ${normalizedTaxYear}`,
      );
    }

    // 17. validate required rebate configuration

    if (
      investmentIncomeRule.calculationType !==
      "PERCENTAGE" ||
      investmentIncomeRule.basisType !==
      "TAXABLE_INCOME" ||
      investmentIncomeRule.rate ===
      null
    ) {
      throw new Error(
        "Invalid INVESTMENT_INCOME_LIMIT rebate rule configuration",
      );
    }

    if (
      investmentAbsoluteRule.calculationType !==
      "LIMIT" ||
      investmentAbsoluteRule.basisType !==
      "CONSTANT" ||
      investmentAbsoluteRule.fixedAmount ===
      null
    ) {
      throw new Error(
        "Invalid INVESTMENT_ABSOLUTE_LIMIT rebate rule configuration",
      );
    }

    if (
      rebateRateRule.calculationType !==
      "PERCENTAGE" ||
      rebateRateRule.basisType !==
      "ALLOWABLE_INVESTMENT" ||
      rebateRateRule.rate ===
      null
    ) {
      throw new Error(
        "Invalid REBATE_RATE rebate rule configuration",
      );
    }

    // 18. calculate investment rebate limits

    const incomeBasedRebateLimit =
      this.roundMoney(
        taxableIncome *
        (
          investmentIncomeRule.rate /
          100
        ),
      );

    const investmentBasedRebateLimit =
      this.roundMoney(
        eligibleInvestment *
        (
          rebateRateRule.rate /
          100
        ),
      );

    const absoluteLimit =
      this.roundMoney(
        investmentAbsoluteRule.fixedAmount,
      );

    const investmentMaximum = absoluteLimit;
    const investmentLimitByIncome = incomeBasedRebateLimit;
    const rebateRate = rebateRateRule.rate / 100;

    // allowable investment preserved for backward compatibility
    const allowableInvestment =
      this.roundMoney(
        Math.min(
          eligibleInvestment,
          investmentMaximum,
        ),
      );

    // 19. investment tax rebate

    const calculatedRebate =
      this.roundMoney(
        Math.min(
          incomeBasedRebateLimit,
          investmentBasedRebateLimit,
          absoluteLimit,
        ),
      );

    const taxRebate =
      this.roundMoney(
        Math.min(
          calculatedRebate,
          grossTax,
        ),
      );

    // 21. tax after rebate (regular net tax)

    const taxAfterRebate =
      this.roundMoney(
        Math.max(
          grossTax -
          taxRebate,
          0,
        ),
      );

    const netTax = taxAfterRebate;

    // 22. determine minimum tax eligibility (Steps 5, 6, 7, 8, 9)

    let minimumTaxApplicable =
      taxableIncome >
      taxFreeThreshold;

    let minimumTaxRule = null;
    let minimumTax = 0;
    let minimumTaxArea = null;
    let minimumTaxAreaName = null;
    let minimumTaxRuleType = null;
    let taxpayerClassification = null;
    let filingHistoryStatus = null;
    let minimumTaxRuleId = null;
    let minimumTaxApplied = false;
    let taxLiability = 0;

    if (minimumTaxApplicable) {
      // Step 7: Fetch the legally applicable active rule
      minimumTaxRule =
        await this.getMinimumTaxRule(
          normalizedTaxYear,
          profile,
          {
            effectiveDate: options.effectiveDate || ayStartDate,
            taxYearEndDate,
            ...options,
          }
        );

      minimumTax =
        minimumTaxRule.amount;

      minimumTaxArea =
        minimumTaxRule.areaCode;

      minimumTaxAreaName =
        minimumTaxRule.areaName;

      minimumTaxRuleType =
        minimumTaxRule.ruleType;

      taxpayerClassification =
        minimumTaxRule.taxpayerClassification || null;

      filingHistoryStatus =
        minimumTaxRule.filingHistoryStatus || null;

      minimumTaxRuleId =
        minimumTaxRule.id;

      // Step 8 & 9: Apply only the applicable minimum tax & Prevent double application
      minimumTaxApplied =
        taxAfterRebate <
        minimumTax;

      taxLiability =
        this.roundMoney(
          Math.max(
            taxAfterRebate,
            minimumTax,
          )
        );
    } else {
      // Taxable income <= threshold: Tax Free! Minimum tax does NOT apply.
      minimumTaxApplicable = false;
      minimumTax = 0;
      minimumTaxApplied = false;
      taxLiability = 0;
    }

    // 23b. calculate wealth surcharge (Income Tax Act 2023, Section 73 & Finance Acts)

    const netWealth = this.roundMoney(profile.net_wealth || 0);
    const hasMultipleMotorVehicles = Number(profile.has_multiple_motor_vehicles || 0) === 1;
    const hasLargeHouseProperty = Number(profile.has_large_house_property || 0) === 1;

    // fetch wealth surcharge rules for the tax year
    const surchargeRuleRows = await query(
      `
        SELECT
          id,
          rule_name,
          minimum_wealth,
          maximum_wealth,
          surcharge_rate
        FROM surcharge_rules
        WHERE tax_year = ?
          AND status = 'ACTIVE'
          AND ? >= minimum_wealth
          AND (? <= maximum_wealth OR maximum_wealth IS NULL)
        ORDER BY minimum_wealth DESC
        LIMIT 1
      `,
      [normalizedTaxYear, netWealth, netWealth],
    );

    let bracketSurchargeRate = 0;
    if (surchargeRuleRows && surchargeRuleRows.length > 0) {
      bracketSurchargeRate = Number(surchargeRuleRows[0].surcharge_rate || 0);
    }

    let surchargeRate = bracketSurchargeRate;
    let surchargeTriggerApplied = false;

    // Special triggers: multiple motor vehicles OR City Corp residential property > 8,000 sq ft
    // triggers minimum 10% surcharge
    if (hasMultipleMotorVehicles || hasLargeHouseProperty) {
      if (surchargeRate < 10) {
        surchargeRate = 10;
        surchargeTriggerApplied = true;
      }
    }

    // Statutory surcharge base is regular tax liability
    const surchargeBase = taxLiability;
    const surchargeAmount = this.roundMoney(
      surchargeBase * (surchargeRate / 100),
    );

    const totalTaxPayable = this.roundMoney(
      taxLiability + surchargeAmount,
    );

    // 23c. apply tax credits (TDS and Advance Tax)
    const tdsAmount = this.roundMoney(profile.tds_amount || 0);
    const advanceTaxAmount = this.roundMoney(profile.advance_tax_amount || 0);
    const totalTaxCredits = this.roundMoney(tdsAmount + advanceTaxAmount);

    const finalPayable = Math.max(
      0,
      this.roundMoney(totalTaxPayable - totalTaxCredits)
    );
    const refundAmount = Math.max(
      0,
      this.roundMoney(totalTaxCredits - totalTaxPayable)
    );

    // 24. create tax calculation + details

    let calculationId = null;

    if (options?.persist !== false) {
      const connection =
        await getConnection();

      try {
        await connection.beginTransaction();

      // insert tax calculation with full audit trail

      const [calculationResult] =
        await connection.execute(
          `
            INSERT INTO tax_calculations (
              user_id,
              tax_year,
              category,
              total_income,
              total_deduction,
              taxable_income,
              eligible_investment,
              gross_tax,
              tax_rebate,
              tax_liability,
              salary_income,
              salary_exemption,
              house_property_income,
              business_income,
              capital_gain_income,
              agriculture_income,
              other_income,
              net_tax,
              minimum_tax,
              minimum_tax_rule_id,
              net_wealth,
              surcharge_rate,
              surcharge_amount,
              total_tax_payable,
              tds_amount,
              advance_tax_amount,
              final_payable,
              refund_amount,
              filing_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            userId,
            normalizedTaxYear,
            category,
            totalIncome,
            totalDeduction,
            taxableIncome,
            eligibleInvestment,
            grossTax,
            taxRebate,
            taxLiability,
            salaryIncome,
            salaryExemption,
            housePropertyIncome,
            businessIncome,
            capitalGainIncome,
            agricultureIncome,
            otherIncome,
            netTax,
            minimumTax,
            minimumTaxRuleId,
            netWealth,
            surchargeRate,
            surchargeAmount,
            totalTaxPayable,
            tdsAmount,
            advanceTaxAmount,
            finalPayable,
            refundAmount,
            options?.filingStatus || "DRAFT",
          ],
        );

      calculationId =
        calculationResult.insertId;

      if (!calculationId) {
        throw new Error(
          "Failed to create tax calculation",
        );
      }

      // insert tax calculation details

      for (
        const detail of details
      ) {
        await connection.execute(
          `
            INSERT INTO tax_calculation_details (
              tax_calculation_id,
              tax_rule_id,
              slab_order,
              minimum_income,
              maximum_income,
              tax_rate,
              taxable_amount,
              calculated_tax
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            calculationId,
            detail.taxRuleId,
            detail.slabOrder,
            detail.minimumIncome,
            detail.maximumIncome,
            detail.taxRate,
            detail.taxableAmount,
            detail.calculatedTax,
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch (
      rollbackError
      ) {
        console.error(
          "Tax calculation rollback error:",
          rollbackError,
        );
      }

      throw error;
    } finally {
      connection.release();
    }
  }

    // 25. return result

    return {
      id: calculationId,
      calculationId,

      userId,

      taxYear:
        normalizedTaxYear,
      tax_year:
        normalizedTaxYear,
      assessmentYear:
        normalizedTaxYear,
      assessment_year:
        normalizedTaxYear,
      incomeYear:
        incomeYear,
      income_year:
        incomeYear,

      category,

      totalIncome,
      total_income: totalIncome,

      salaryIncome,
      salary_income: salaryIncome,

      salaryExemption,
      salary_exemption: salaryExemption,

      housePropertyIncome,
      house_property_income: housePropertyIncome,

      housePropertyDeduction,
      house_property_deduction: housePropertyDeduction,

      housePropertyStatus,
      house_property_status: housePropertyStatus,

      businessIncome,
      business_income: businessIncome,

      agricultureIncome,
      agriculture_income: agricultureIncome,

      agricultureDeduction,
      agriculture_deduction: agricultureDeduction,

      agricultureDeductionStatus,
      agriculture_deduction_status: agricultureDeductionStatus,

      capitalGainIncome,
      capital_gain_income: capitalGainIncome,

      otherIncome,
      other_income: otherIncome,

      totalDeductibleExpense,
      total_deductible_expense: totalDeductibleExpense,

      totalDeduction,
      total_deduction: totalDeduction,

      taxableIncome,
      taxable_income: taxableIncome,

      disabledChildDependents,

      disabledChildAdditionalThreshold,

      taxFreeThreshold,
      tax_free_threshold: taxFreeThreshold,

      eligibleInvestment,
      eligible_investment: eligibleInvestment,

      incomeBasedRebateLimit,
      income_based_rebate_limit: incomeBasedRebateLimit,

      investmentBasedRebateLimit,
      investment_based_rebate_limit: investmentBasedRebateLimit,

      calculatedRebate,
      calculated_rebate: calculatedRebate,

      allowableInvestment,
      allowable_investment: allowableInvestment,

      investmentLimitByIncome,
      investment_limit_by_income: investmentLimitByIncome,

      investmentMaximum,
      investment_maximum: investmentMaximum,

      grossTax,
      gross_tax: grossTax,

      taxRebate,
      tax_rebate: taxRebate,

      rebateRate: rebateRateRule.rate,
      rebate_rate: rebateRateRule.rate,

      rebateRuleId: rebateRateRule.id,
      rebateRuleCode: rebateRateRule.ruleCode,

      netTax,
      net_tax: netTax,

      taxAfterRebate,
      tax_after_rebate: taxAfterRebate,

      minimumTax,
      minimum_tax: minimumTax,

      minimumTaxRuleId,
      minimum_tax_rule_id: minimumTaxRuleId,
      selectedRuleId: minimumTaxRuleId,

      minimumTaxRule,

      minimumTaxArea,
      minimum_tax_area: minimumTaxArea,

      minimumTaxAreaName,
      minimum_tax_area_name: minimumTaxAreaName,

      minimumTaxRuleType,
      minimum_tax_rule_type: minimumTaxRuleType,

      taxpayerClassification,
      filingHistoryStatus,

      isNewTaxpayer: taxpayerClassification === "NEW_TAXPAYER" || Number(profile.is_new_taxpayer || 0) === 1,
      is_new_taxpayer: taxpayerClassification === "NEW_TAXPAYER" || Number(profile.is_new_taxpayer || 0) === 1 ? 1 : 0,

      minimumTaxApplicable,
      minimum_tax_applicable: minimumTaxApplicable,

      minimumTaxApplied,
      minimum_tax_applied: minimumTaxApplied,

      taxLiability,
      tax_liability: taxLiability,

      netWealth,
      net_wealth: netWealth,

      hasMultipleMotorVehicles,
      has_multiple_motor_vehicles: hasMultipleMotorVehicles ? 1 : 0,

      hasLargeHouseProperty,
      has_large_house_property: hasLargeHouseProperty ? 1 : 0,

      surchargeRate,
      surcharge_rate: surchargeRate,

      surchargeAmount,
      surcharge_amount: surchargeAmount,

      surchargeTriggerApplied,
      surcharge_trigger_applied: surchargeTriggerApplied,

      totalTaxPayable,
      total_tax_payable: totalTaxPayable,

      tdsAmount,
      tds_amount: tdsAmount,

      advanceTaxAmount,
      advance_tax_amount: advanceTaxAmount,

      totalTaxCredits,
      total_tax_credits: totalTaxCredits,

      finalPayable,
      final_payable: finalPayable,
      refundAmount,
      refund_amount: refundAmount,

      details,
    };
  },

  // helper: enrich calculation record with derived metrics

  async enrichCalculation(calculation, details = null) {
    if (!calculation) {
      return null;
    }

    const userId = calculation.user_id || calculation.userId;
    const taxYear = calculation.tax_year || calculation.taxYear;
    const category = calculation.category || "GENERAL";
    const totalIncome = Number(calculation.total_income ?? calculation.totalIncome ?? 0);
    const totalDeduction = Number(calculation.total_deduction ?? calculation.totalDeduction ?? 0);
    const taxableIncome = Number(calculation.taxable_income ?? calculation.taxableIncome ?? 0);
    const eligibleInvestment = Number(calculation.eligible_investment ?? calculation.eligibleInvestment ?? 0);
    const grossTax = Number(calculation.gross_tax ?? calculation.grossTax ?? 0);
    let taxRebate = Number(calculation.tax_rebate ?? calculation.taxRebate ?? 0);
    let taxLiability = Number(calculation.tax_liability ?? calculation.taxLiability ?? 0);

    let disabledChildDependents = 0;
    let disabledChildAdditionalThreshold = 0;
    let minimumTaxArea = null;
    let isNewTaxpayer = 0;
    let userProfile = {};

    if (userId) {
      const profileRows = await query(
        `SELECT minimum_tax_area, is_new_taxpayer, filing_history_status, filing_history_verified, disabled_child_dependents, net_wealth, has_multiple_motor_vehicles, has_large_house_property, tds_amount, advance_tax_amount FROM taxpayer_profiles WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (profileRows && profileRows.length > 0) {
        userProfile = { ...profileRows[0], user_id: userId };
        minimumTaxArea = profileRows[0].minimum_tax_area || null;
        isNewTaxpayer = Number(profileRows[0].is_new_taxpayer || 0);
        disabledChildDependents = Number(profileRows[0].disabled_child_dependents || 0);
        disabledChildAdditionalThreshold = this.roundMoney(disabledChildDependents * 50000);

        if (taxYear) {
          const creditRows = await query(
            `SELECT tds_amount, advance_tax_amount FROM tax_credits WHERE user_id = ? AND tax_year = ? LIMIT 1`,
            [userId, taxYear]
          );
          if (creditRows && creditRows.length > 0) {
            userProfile.tds_amount = creditRows[0].tds_amount;
            userProfile.advance_tax_amount = creditRows[0].advance_tax_amount;
          }
        }
      }
    }

    let baseTaxFreeThreshold = 0;
    if (taxYear && category) {
      const thresholdRows = await query(
        `SELECT tax_free_threshold FROM tax_thresholds WHERE tax_year = ? AND category = ? AND status = 'ACTIVE' LIMIT 1`,
        [taxYear, category]
      );
      if (thresholdRows && thresholdRows.length > 0) {
        baseTaxFreeThreshold = this.roundMoney(thresholdRows[0].tax_free_threshold);
      }
    }
    const taxFreeThreshold = this.roundMoney(baseTaxFreeThreshold + disabledChildAdditionalThreshold);

    let investmentLimitByIncome = 0;
    let investmentMaximum = 0;
    let rebateRate = 0;
    let allowableInvestment = 0;
    let incomeBasedRebateLimit = 0;
    let investmentBasedRebateLimit = 0;
    let calculatedRebate = 0;

    if (taxYear) {
      const rebateRules = await query(
        `
          SELECT rule_code, calculation_type, basis_type, rate, fixed_amount
          FROM tax_rebate_rules
          WHERE tax_year = ? AND status = 'ACTIVE'
        `,
        [taxYear]
      );

      const rulesMap = {};
      (rebateRules || []).forEach((rule) => {
        rulesMap[rule.rule_code] = rule;
      });

      const incomeRule = rulesMap.INVESTMENT_INCOME_LIMIT;
      const maxRule = rulesMap.INVESTMENT_ABSOLUTE_LIMIT;
      const rateRule = rulesMap.REBATE_RATE;

      if (incomeRule && incomeRule.rate !== null && incomeRule.rate !== undefined) {
        incomeBasedRebateLimit = this.roundMoney(taxableIncome * (Number(incomeRule.rate) / 100));
        investmentLimitByIncome = incomeBasedRebateLimit;
      }

      if (maxRule && maxRule.fixed_amount !== null && maxRule.fixed_amount !== undefined) {
        investmentMaximum = this.roundMoney(Number(maxRule.fixed_amount));
      }

      if (rateRule && rateRule.rate !== null && rateRule.rate !== undefined) {
        rebateRate = Number(rateRule.rate);
        investmentBasedRebateLimit = this.roundMoney(eligibleInvestment * (rebateRate / 100));
      }

      allowableInvestment = this.roundMoney(
        Math.min(eligibleInvestment, investmentMaximum)
      );

      if (incomeRule && maxRule && rateRule) {
        calculatedRebate = this.roundMoney(
          Math.min(incomeBasedRebateLimit, investmentBasedRebateLimit, investmentMaximum)
        );
        taxRebate = this.roundMoney(Math.min(calculatedRebate, grossTax));
      }
    }

    const taxAfterRebate = this.roundMoney(Math.max(0, grossTax - taxRebate));

    let minimumTax = 0;
    let minimumTaxAreaCode = minimumTaxArea || "N/A";
    let minimumTaxAreaName = "N/A";
    let minimumTaxRuleType = "AREA_BASED";
    let minimumTaxApplicable = false;
    let minimumTaxApplied = false;

    if (taxYear) {
      try {
        const minRule = await MinimumTaxRuleModel.findEffectiveRule(taxYear, userProfile);
        if (minRule) {
          minimumTax = this.roundMoney(minRule.minimum_tax_amount);
          minimumTaxAreaCode = minRule.area_code;
          minimumTaxAreaName = minRule.area_name;
          minimumTaxRuleType = minRule.rule_type;
          minimumTaxApplicable = taxableIncome > taxFreeThreshold;
          minimumTaxApplied = minimumTaxApplicable && (taxAfterRebate < minimumTax);
        }
      } catch (err) {
        console.warn("Could not determine effective minimum tax rule in enrichCalculation:", err.message);
      }
    }

    taxLiability = this.roundMoney(minimumTaxApplicable ? Math.max(taxAfterRebate, minimumTax) : 0);

    const salaryIncome = Number(calculation.salary_income ?? calculation.salaryIncome ?? 0);
    const salaryExemption = Number(calculation.salary_exemption ?? calculation.salaryExemption ?? 0);
    const housePropertyIncome = Number(calculation.house_property_income ?? calculation.housePropertyIncome ?? 0);
    const businessIncome = Number(calculation.business_income ?? calculation.businessIncome ?? 0);
    const capitalGainIncome = Number(calculation.capital_gain_income ?? calculation.capitalGainIncome ?? 0);
    const agricultureIncome = Number(calculation.agriculture_income ?? calculation.agricultureIncome ?? 0);
    const otherIncome = Number(calculation.other_income ?? calculation.otherIncome ?? 0);

    let housePropertyDeduction = Number(calculation.house_property_deduction ?? calculation.housePropertyDeduction ?? 0);
    if (housePropertyDeduction === 0 && housePropertyIncome > 0) {
      const statutoryHpAllowance = this.roundMoney(housePropertyIncome * 0.25);
      if (totalDeduction >= salaryExemption + statutoryHpAllowance) {
        housePropertyDeduction = statutoryHpAllowance;
      }
    }

    const agricultureDeduction = Number(calculation.agriculture_deduction ?? calculation.agricultureDeduction ?? 0);

    let totalDeductibleExpense = Number(
      calculation.total_deductible_expense ??
      calculation.totalDeductibleExpense ??
      Math.max(0, totalDeduction - salaryExemption - housePropertyDeduction - agricultureDeduction)
    );

    if (
      housePropertyDeduction > 0 &&
      Math.abs(totalDeductibleExpense + salaryExemption - totalDeduction) < 0.01
    ) {
      totalDeductibleExpense = Math.max(0, totalDeductibleExpense - housePropertyDeduction);
    }
    const netTax = Number(calculation.net_tax ?? calculation.netTax ?? taxAfterRebate);
    const netWealth = Number(calculation.net_wealth ?? calculation.netWealth ?? userProfile.net_wealth ?? 0);
    const hasMultipleMotorVehicles = Number(calculation.has_multiple_motor_vehicles ?? calculation.hasMultipleMotorVehicles ?? userProfile.has_multiple_motor_vehicles ?? 0);
    const hasLargeHouseProperty = Number(calculation.has_large_house_property ?? calculation.hasLargeHouseProperty ?? userProfile.has_large_house_property ?? 0);
    const surchargeRate = Number(calculation.surcharge_rate ?? calculation.surchargeRate ?? 0);
    const surchargeAmount = Number(calculation.surcharge_amount ?? calculation.surchargeAmount ?? this.roundMoney(taxLiability * (surchargeRate / 100)));
    const totalTaxPayable = Number(calculation.total_tax_payable ?? calculation.totalTaxPayable ?? this.roundMoney(taxLiability + surchargeAmount));
    const tdsAmount = Number(calculation.tds_amount ?? calculation.tdsAmount ?? userProfile.tds_amount ?? 0);
    const advanceTaxAmount = Number(calculation.advance_tax_amount ?? calculation.advanceTaxAmount ?? userProfile.advance_tax_amount ?? 0);
    const totalTaxCredits = this.roundMoney(tdsAmount + advanceTaxAmount);
    const finalPayable = Math.max(0, Number(calculation.final_payable ?? calculation.finalPayable ?? this.roundMoney(totalTaxPayable - totalTaxCredits)));
    const refundAmount = Math.max(0, Number(calculation.refund_amount ?? calculation.refundAmount ?? this.roundMoney(totalTaxCredits - totalTaxPayable)));

    const incomeYear = getIncomeYearFromAssessmentYear(taxYear);

    return {
      ...calculation,
      taxYear,
      tax_year: taxYear,
      assessmentYear: taxYear,
      assessment_year: taxYear,
      incomeYear,
      income_year: incomeYear,
      category,
      totalIncome,
      totalDeduction,
      taxableIncome,
      eligibleInvestment,
      grossTax,
      calculatedRebate,
      taxRebate,
      taxLiability,

      salaryIncome,
      salaryExemption,
      housePropertyIncome,
      housePropertyDeduction,
      businessIncome,
      agricultureIncome,
      agricultureDeduction,
      capitalGainIncome,
      otherIncome,
      totalDeductibleExpense,
      total_deductible_expense: totalDeductibleExpense,
      house_property_income: housePropertyIncome,
      house_property_deduction: housePropertyDeduction,
      business_income: businessIncome,
      agriculture_income: agricultureIncome,
      agriculture_deduction: agricultureDeduction,
      capital_gain_income: capitalGainIncome,
      other_income: otherIncome,
      netTax,
      netWealth,
      hasMultipleMotorVehicles: hasMultipleMotorVehicles === 1,
      hasLargeHouseProperty: hasLargeHouseProperty === 1,
      surchargeRate,
      surchargeAmount,
      totalTaxPayable,
      tdsAmount,
      advanceTaxAmount,
      totalTaxCredits,
      finalPayable,

      disabledChildDependents,
      disabledChildAdditionalThreshold,
      taxFreeThreshold,

      incomeBasedRebateLimit,
      investmentBasedRebateLimit,
      allowableInvestment,
      investmentLimitByIncome,
      investmentMaximum,
      rebateRate,
      taxAfterRebate,

      minimumTaxArea: minimumTaxAreaCode,
      minimumTaxAreaName,
      minimumTaxRuleType,
      minimumTax,
      minimumTaxApplicable,
      minimumTaxApplied,
      isNewTaxpayer: isNewTaxpayer === 1,

      // snake_case aliases for api backwards compatibility
      salary_income: salaryIncome,
      salary_exemption: salaryExemption,
      net_tax: netTax,
      net_wealth: netWealth,
      has_multiple_motor_vehicles: hasMultipleMotorVehicles,
      has_large_house_property: hasLargeHouseProperty,
      surcharge_rate: surchargeRate,
      surcharge_amount: surchargeAmount,
      total_tax_payable: totalTaxPayable,
      tds_amount: tdsAmount,
      advance_tax_amount: advanceTaxAmount,
      total_tax_credits: totalTaxCredits,
      final_payable: finalPayable,
      refund_amount: refundAmount,

      disabled_child_dependents: disabledChildDependents,
      disabled_child_additional_threshold: disabledChildAdditionalThreshold,
      tax_free_threshold: taxFreeThreshold,
      income_based_rebate_limit: incomeBasedRebateLimit,
      investment_based_rebate_limit: investmentBasedRebateLimit,
      calculated_rebate: calculatedRebate,
      tax_rebate: taxRebate,
      tax_liability: taxLiability,
      allowable_investment: allowableInvestment,
      investment_limit_by_income: investmentLimitByIncome,
      investment_maximum: investmentMaximum,
      rebate_rate: rebateRate,
      tax_after_rebate: taxAfterRebate,
      minimum_tax_area: minimumTaxAreaCode,
      minimum_tax_area_name: minimumTaxAreaName,
      minimum_tax_rule_type: minimumTaxRuleType,
      minimum_tax: minimumTax,
      minimum_tax_applicable: minimumTaxApplicable,
      minimum_tax_applied: minimumTaxApplied,
      is_new_taxpayer: isNewTaxpayer,

      ...(details ? { details } : {}),
    };
  },

  async enrichCalculations(calculations) {
    if (!Array.isArray(calculations)) return [];
    return await Promise.all(
      calculations.map((calc) => this.enrichCalculation(calc))
    );
  },

  // get all tax calculations

  async getCalculations(userId) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const calculations = await TaxCalculationModel.getCalculationsByUserId(userId);
    return await this.enrichCalculations(calculations);
  },

  // Synthesize progressive tax slabs on the fly when detailed rows are absent
  // Strict Historical Integrity:
  // 1. Use persisted slab details from linked tax return snapshot when available
  // 2. Reconstruct missing slabs ONLY from saved calculation's own values and rules for its tax_year
  // 3. NEVER use current taxpayer_profiles or unrelated current tax rules
  // 4. Clearly flag synthesized records as is_synthesized: true
  async synthesizeCalculationSlabs(calculation) {
    if (!calculation) return [];

    // 1. Check if linked return snapshot already has persisted slab details in tax_return_details
    const calcId = calculation.id || calculation.tax_calculation_id;
    if (calcId) {
      const linkedReturnRows = await query(
        `SELECT trd.id, trd.description, trd.amount, trd.metadata
         FROM tax_return_details trd
         JOIN tax_returns tr ON tr.id = trd.tax_return_id
         WHERE tr.tax_calculation_id = ?
           AND trd.section = 'TAX_CALCULATION'
           AND trd.income_type = 'SLAB'
         ORDER BY trd.id ASC`,
        [calcId]
      );

      if (linkedReturnRows && linkedReturnRows.length > 0) {
        return linkedReturnRows.map((row, idx) => {
          let meta = {};
          if (row.metadata) {
            meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          }
          const slabOrder = meta.slab_order || meta.slabOrder || idx + 1;
          const minInc = meta.minimum_income ?? meta.minimumIncome ?? 0;
          const maxInc = meta.maximum_income ?? meta.maximumIncome ?? null;
          return {
            id: row.id,
            slab_order: slabOrder,
            slabOrder,
            minimum_income: minInc,
            minimumIncome: minInc,
            maximum_income: maxInc,
            maximumIncome: maxInc,
            tax_rate: meta.tax_rate ?? meta.taxRate ?? 0,
            taxRate: meta.tax_rate ?? meta.taxRate ?? 0,
            taxable_amount: meta.taxable_amount ?? meta.taxableAmount ?? 0,
            taxableAmount: meta.taxable_amount ?? meta.taxableAmount ?? 0,
            calculated_tax: Number(row.amount || 0),
            calculatedTax: Number(row.amount || 0),
            description: row.description,
            source: 'PERSISTED_RETURN_SNAPSHOT',
            is_synthesized: false,
            isSynthesized: false,
          };
        });
      }
    }

    // 2. Reconstruct ONLY from the saved calculation's own values and historical rules for its tax_year
    // NEVER query current taxpayer_profiles or unrelated current tax rules
    const taxYear = calculation.tax_year || calculation.taxYear;
    const taxableIncome = Number(calculation.taxable_income ?? calculation.taxableIncome ?? 0);
    const category = calculation.category || "GENERAL";

    let taxFreeThreshold = 375000;
    if (taxYear && category) {
      const thresholdRows = await query(
        `SELECT tax_free_threshold FROM tax_thresholds WHERE tax_year = ? AND category = ? AND status = 'ACTIVE' LIMIT 1`,
        [taxYear, category]
      );
      if (thresholdRows && thresholdRows.length > 0) {
        taxFreeThreshold = this.roundMoney(thresholdRows[0].tax_free_threshold);
      }
    }

    const taxRules = await query(
      `SELECT id, minimum_income, maximum_income, tax_rate, fixed_amount
       FROM tax_rules
       WHERE tax_year = ? AND status = 'ACTIVE'
       ORDER BY minimum_income ASC, id ASC`,
      [taxYear]
    );

    if (!taxRules || taxRules.length === 0) return [];

    const slabs = [];
    const zeroRule = taxRules.find((rule) => Number(rule.tax_rate || 0) === 0);
    const zeroTaxableAmount = this.roundMoney(Math.min(taxableIncome, taxFreeThreshold));

    slabs.push({
      tax_rule_id: zeroRule ? zeroRule.id : null,
      taxRuleId: zeroRule ? zeroRule.id : null,
      slab_order: 1,
      slabOrder: 1,
      minimum_income: 0,
      minimumIncome: 0,
      maximum_income: taxFreeThreshold,
      maximumIncome: taxFreeThreshold,
      tax_rate: 0,
      taxRate: 0,
      taxable_amount: zeroTaxableAmount,
      taxableAmount: zeroTaxableAmount,
      calculated_tax: 0,
      calculatedTax: 0,
      source: 'SYNTHESIZED_HISTORICAL_RULES',
      is_synthesized: true,
      isSynthesized: true,
    });

    if (taxableIncome > taxFreeThreshold) {
      let currentPointer = taxFreeThreshold;

      for (const rule of taxRules) {
        const taxRate = Number(rule.tax_rate || 0);
        if (taxRate <= 0) continue;
        if (taxableIncome <= currentPointer) break;

        const minIncome = Number(rule.minimum_income || 0);
        const maxIncome =
          rule.maximum_income === null || rule.maximum_income === undefined
            ? null
            : Number(rule.maximum_income);

        const slabSpan = maxIncome !== null ? Math.max(0, maxIncome - minIncome) : null;
        const slabStart = currentPointer;
        const slabEnd = slabSpan !== null ? currentPointer + slabSpan : null;

        const taxableAmount =
          slabEnd !== null
            ? this.roundMoney(Math.min(taxableIncome, slabEnd) - slabStart)
            : this.roundMoney(taxableIncome - slabStart);

        if (taxableAmount <= 0) continue;

        const calculatedTax = this.roundMoney(taxableAmount * (taxRate / 100));

        slabs.push({
          tax_rule_id: rule.id,
          taxRuleId: rule.id,
          slab_order: slabs.length + 1,
          slabOrder: slabs.length + 1,
          minimum_income: slabStart + 1,
          minimumIncome: slabStart + 1,
          maximum_income: slabEnd,
          maximumIncome: slabEnd,
          tax_rate: taxRate,
          taxRate: taxRate,
          taxable_amount: taxableAmount,
          taxableAmount: taxableAmount,
          calculated_tax: calculatedTax,
          calculatedTax: calculatedTax,
          source: 'SYNTHESIZED_HISTORICAL_RULES',
          is_synthesized: true,
          isSynthesized: true,
        });

        currentPointer = slabEnd !== null ? slabEnd : taxableIncome;
        if (taxableIncome <= currentPointer) break;
      }
    }

    return slabs;
  },

  // get single tax calculation with details

  async getCalculationById(id, userId) {
    if (!id) {
      throw new Error("Calculation ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    const calculation = await TaxCalculationModel.getCalculationById(id, userId);
    if (!calculation) {
      return null;
    }

    let details = await TaxCalculationDetailModel.getDetailsByCalculationId(id);
    if (!details || details.length === 0) {
      details = await this.synthesizeCalculationSlabs(calculation);
    }
    return await this.enrichCalculation(calculation, details);
  },

  // delete tax calculation
  async deleteCalculation(id, userId) {
    if (!id) {
      throw new Error("Calculation ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    const calculation = await TaxCalculationModel.getCalculationById(id, userId);
    if (!calculation) {
      return false;
    }

    await TaxCalculationModel.deleteCalculation(id, userId);
    return true;
  },
};

// export

module.exports = TaxCalculationService;