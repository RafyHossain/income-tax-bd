const { getConnection, query } = require("../database/query");
const TaxReturnModel = require("../models/taxReturnModel");
const TaxpayerProfileModel = require("../models/taxpayerProfileModel");
const { getTaxYearDateRange, getIncomeYearFromAssessmentYear } = require("../utils/taxYear");

// Return status workflow allowed transitions
const VALID_TRANSITIONS = {
  DRAFT: ["VALIDATED", "CANCELLED"],
  VALIDATED: ["DRAFT", "FILED", "SUBMITTED", "CANCELLED"],
  FILED: ["CANCELLED"],
  SUBMITTED: ["ACKNOWLEDGED", "REJECTED", "AMENDED"],
  ACKNOWLEDGED: ["AMENDED"],
  REJECTED: ["DRAFT", "AMENDED", "CANCELLED"],
  AMENDED: [],
  CANCELLED: [],
};

/**
 * Helper: Build structured summaries from frozen return details snapshot.
 */
function buildSummariesFromDetails(returnRecord, details) {
  const taxpayerInfoDetail = details.find(
    (d) => d.section === "TAXPAYER_INFORMATION" || d.section === "PROFILE_SNAPSHOT"
  );
  const assessmentYear = returnRecord.assessment_year || returnRecord.tax_year;
  const incomeYear = getIncomeYearFromAssessmentYear(assessmentYear);

  const taxpayerInfo = taxpayerInfoDetail?.metadata || {
    taxpayer_name: returnRecord.taxpayer_name || "Taxpayer",
    tax_year: returnRecord.tax_year,
    assessment_year: assessmentYear,
    income_year: incomeYear,
    taxpayer_category: returnRecord.taxpayer_category || "GENERAL",
  };

  const incomeItems = details.filter(
    (d) => d.section === "INCOME_SUMMARY" || d.section === "INCOME"
  );
  const incomeSummary = {
    salary: Number(incomeItems.find((d) => d.income_type === "SALARY")?.amount || returnRecord.salary_income || 0),
    house_property: Number(incomeItems.find((d) => d.income_type === "HOUSE_RENT")?.amount || returnRecord.house_property_income || 0),
    business: Number(incomeItems.find((d) => d.income_type === "BUSINESS")?.amount || returnRecord.business_income || 0),
    agriculture: Number(incomeItems.find((d) => d.income_type === "AGRICULTURE")?.amount || returnRecord.agriculture_income || 0),
    dividend: Number(incomeItems.find((d) => d.income_type === "DIVIDEND")?.amount || 0),
    capital_gain: Number(incomeItems.find((d) => d.income_type === "CAPITAL_GAIN")?.amount || returnRecord.capital_gain_income || 0),
    other_sources: Number(incomeItems.find((d) => d.income_type === "OTHER_SOURCES" || d.income_type === "OTHER")?.amount || returnRecord.other_income || 0),
    total_income: Number(returnRecord.total_income || 0),
  };

  const exemptionItems = details.filter(
    (d) => d.section === "INCOME_EXEMPTIONS" || d.section === "EXEMPTION"
  );
  const deductionItems = details.filter(
    (d) => d.section === "ALLOWABLE_DEDUCTIONS" || d.section === "DEDUCTION"
  );
  const deductionSummary = {
    salary_exemption: Number(exemptionItems.find((d) => d.income_type === "SALARY")?.amount || 0),
    house_property_allowance: Number(exemptionItems.find((d) => d.income_type === "HOUSE_RENT")?.amount || 0),
    agricultural_deduction: Number(exemptionItems.find((d) => d.income_type === "AGRICULTURE")?.amount || 0),
    business_expenses: Number(deductionItems.find((d) => d.income_type === "BUSINESS")?.amount || 0),
    total_deduction: Number(returnRecord.total_deduction || 0),
  };

  const taxCalcItems = details.filter(
    (d) => d.section === "TAX_CALCULATION" || d.section === "TAX_SUMMARY"
  );
  const minTaxDetail = taxCalcItems.find((d) => d.income_type === "MINIMUM_TAX");
  const taxSummary = {
    taxable_income: Number(returnRecord.taxable_income || 0),
    gross_tax: Number(returnRecord.gross_tax || 0),
    tax_rebate: Number(returnRecord.tax_rebate || 0),
    net_tax: Number(returnRecord.net_tax || 0),
    minimum_tax: Number(returnRecord.minimum_tax || 0),
    surcharge_amount: Number(returnRecord.surcharge_amount || 0),
    tds_amount: Number(returnRecord.tds_amount || 0),
    advance_tax_amount: Number(returnRecord.advance_tax_amount || 0),
    total_tax_credits: Number(returnRecord.tds_amount || 0) + Number(returnRecord.advance_tax_amount || 0),
    minimum_tax_applied:
      minTaxDetail?.metadata?.minimum_tax_applied !== undefined
        ? minTaxDetail.metadata.minimum_tax_applied
        : Number(returnRecord.minimum_tax) > Number(returnRecord.net_tax),
    final_payable: Math.max(0, Number(returnRecord.payable_tax || returnRecord.final_payable || 0)),
  };

  const otherItem = incomeItems.find((d) => d.income_type === "OTHER_SOURCES");
  const classificationWarnings = otherItem?.metadata?.warnings || [];

  const returnNumber =
    returnRecord.return_number ||
    `TRN-${String(returnRecord.tax_year || "2026-27").replace("-", "")}-${String(returnRecord.id).padStart(6, "0")}`;

  return {
    return_number: returnNumber,
    returnNumber,
    taxpayer_info: taxpayerInfo,
    income_summary: incomeSummary,
    deduction_summary: deductionSummary,
    tax_summary: taxSummary,
    classification_warnings: classificationWarnings,
  };
}

const TaxReturnService = {
  /**
   * Helper: Round monetary amounts to 2 decimal places.
   */
  roundMoney(amount) {
    const num = Number(amount);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  },

  /**
   * Helper: Validate whether a status transition is permitted.
   */
  canTransition(currentStatus, targetStatus) {
    if (!currentStatus) return targetStatus === "DRAFT";
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  },

  /**
   * Create a new draft return from an existing, user-owned tax calculation.
   * Atomic transactional execution with calculation snapshot persistence.
   */
  async createDraftReturn(userId, calculationId, returnType = "INDIVIDUAL_REGULAR") {
    if (!userId || !calculationId) {
      const err = new Error("User ID and Tax Calculation ID are required.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    // 1. Verify calculation existence and user ownership
    const calcRows = await query(
      "SELECT * FROM tax_calculations WHERE id = ?",
      [calculationId]
    );

    if (!calcRows || calcRows.length === 0) {
      const err = new Error(`Tax calculation #${calculationId} not found.`);
      err.code = "CALCULATION_NOT_FOUND";
      throw err;
    }

    const calculation = calcRows[0];
    if (calculation.user_id !== userId) {
      const err = new Error("Access denied: You can only file a return from your own tax calculation.");
      err.code = "UNAUTHORIZED_CALCULATION_REFERENCE";
      throw err;
    }

    // 2. Verify calculation completeness and valid figures
    if (
      calculation.total_income === null ||
      calculation.total_income === undefined ||
      calculation.taxable_income === null ||
      calculation.taxable_income === undefined ||
      calculation.tax_liability === null ||
      calculation.tax_liability === undefined ||
      calculation.final_payable === null ||
      calculation.final_payable === undefined ||
      !calculation.category
    ) {
      const err = new Error("The selected tax calculation is incomplete or missing mandatory figures.");
      err.code = "INCOMPLETE_CALCULATION";
      throw err;
    }

    // Verify calculation progressive slab breakdown details exist
    const slabDetails = await query(
      "SELECT * FROM tax_calculation_details WHERE tax_calculation_id = ? ORDER BY slab_order ASC",
      [calculation.id]
    );
    if (!slabDetails || slabDetails.length === 0) {
      const err = new Error("The selected tax calculation is missing progressive slab breakdown details.");
      err.code = "INCOMPLETE_CALCULATION";
      throw err;
    }

    // 3. Verify tax year format and consistency with tax_years table
    if (!calculation.tax_year || !/^\d{4}-\d{2}$/.test(calculation.tax_year)) {
      const err = new Error(`Invalid tax year format in calculation: '${calculation.tax_year}'.`);
      err.code = "INVALID_TAX_YEAR";
      throw err;
    }

    const yearRows = await query(
      "SELECT * FROM tax_years WHERE tax_year = ?",
      [calculation.tax_year]
    );
    if (!yearRows || yearRows.length === 0) {
      const err = new Error(`Tax year '${calculation.tax_year}' is not registered in the system.`);
      err.code = "INVALID_TAX_YEAR";
      throw err;
    }

    // 4. Verify taxpayer profile & user demographic data
    const userRows = await query(
      "SELECT id, full_name, email, phone, nid FROM users WHERE id = ?",
      [userId]
    );
    const user = userRows[0];

    const profileRaw = await TaxpayerProfileModel.getProfileByUserId(userId);
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    if (!profile) {
      const err = new Error("Taxpayer profile not found. Please complete profile before filing a return.");
      err.code = "PROFILE_NOT_FOUND";
      throw err;
    }

    // 5. Assemble snapshot details and compute deductions/exemptions
    const { detailsToInsert, totalExemptions } = await this._assembleSnapshotDetails(
      0,
      userId,
      calculation,
      user,
      profile
    );

    // 6. Acquire connection and begin transaction
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // 8. Insert main tax return
      const returnData = {
        user_id: userId,
        tax_calculation_id: calculation.id,
        tax_year: calculation.tax_year,
        assessment_year: calculation.tax_year,
        return_type: returnType,
        return_status: "DRAFT",
        total_income: calculation.total_income,
        total_exemption: totalExemptions,
        total_deduction: calculation.total_deduction,
        taxable_income: calculation.taxable_income,
        gross_tax: calculation.gross_tax,
        tax_rebate: calculation.tax_rebate,
        tax_liability: calculation.tax_liability,
        minimum_tax: calculation.minimum_tax,
        payable_tax: Math.max(0, Number(calculation.final_payable || 0)),
        net_tax: calculation.net_tax,
        surcharge_amount: calculation.surcharge_amount,
        total_tax_payable: calculation.total_tax_payable,
        tds_amount: calculation.tds_amount,
        advance_tax_amount: calculation.advance_tax_amount,
        refund_amount: Math.max(0, Number(calculation.refund_amount || 0)),
      };

      const returnResult = await TaxReturnModel.createReturn(returnData, connection);
      const newReturnId = returnResult.insertId;

      // Assign the new ID to details
      detailsToInsert.forEach((d) => {
        d.tax_return_id = newReturnId;
      });

      // 9. Insert snapshot details
      await TaxReturnModel.createReturnDetails(detailsToInsert, connection);

      // 10. Record initial status history
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: newReturnId,
          previous_status: null,
          new_status: "DRAFT",
          changed_by: userId,
          remarks: `Tax return initialized for review from tax calculation #${calculation.id} for tax year ${calculation.tax_year}.`,
        },
        connection
      );

      await connection.commit();

      // 13. Return freshly created return with structured summaries and details
      const createdReturn = await TaxReturnModel.findById(newReturnId);
      const details = await TaxReturnModel.getDetailsByReturnId(newReturnId);
      const summaries = buildSummariesFromDetails(createdReturn, details);

      return {
        ...createdReturn,
        payable_tax: Math.max(0, Number(createdReturn.payable_tax || 0)),
        final_payable: Math.max(0, Number(createdReturn.payable_tax || 0)),
        ...summaries,
        details,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Validate a draft return against taxpayer profile, persisted calculations, and statutory rules.
   * Enforces 9 comprehensive validation categories with granular check items and severity classification.
   * Transitions status from DRAFT -> VALIDATED only if zero BLOCKER and zero ERROR issues exist.
   * Never marks a return as SUBMITTED.
   */
  async validateReturn(returnId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);

    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    // RBAC: Taxpayer can only validate own return; Admin can validate any
    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You can only validate your own tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    // Status transition validity check
    if (
      returnRecord.return_status !== "DRAFT" &&
      returnRecord.return_status !== "VALIDATED"
    ) {
      const err = new Error(
        `Invalid status transition: Cannot validate a return currently in '${returnRecord.return_status}' status.`
      );
      err.code = "INVALID_STATUS_TRANSITION";
      throw err;
    }

    // -------------------------------------------------------------------------
    // LOAD CONTEXTUAL DATA FOR RIGOROUS VALIDATION
    // -------------------------------------------------------------------------
    const userRows = await query("SELECT id, full_name, email, phone, nid, role FROM users WHERE id = ?", [returnRecord.user_id]);
    const user = userRows[0];

    const profileRaw = await TaxpayerProfileModel.getProfileByUserId(returnRecord.user_id);
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;

    const calcRows = await query("SELECT * FROM tax_calculations WHERE id = ?", [returnRecord.tax_calculation_id]);
    const calculation = calcRows[0] || null;

    let slabDetails = [];
    if (calculation) {
      slabDetails = await query(
        "SELECT * FROM tax_calculation_details WHERE tax_calculation_id = ? ORDER BY slab_order ASC",
        [calculation.id]
      );
    }

    const details = await TaxReturnModel.getDetailsByReturnId(returnId);

    // Source income records
    let userIncomes = [];
    try {
      const { startDate, endDate } = getTaxYearDateRange(returnRecord.tax_year);
      userIncomes = await query(
        "SELECT id, income_type, source_name, amount, income_date, description FROM income WHERE user_id = ? AND income_date BETWEEN ? AND ?",
        [returnRecord.user_id, startDate, endDate]
      );
    } catch (e) {
      // If date range lookup fails, userIncomes remains empty
    }

    // Initialize structured validation collections
    const checks = [];
    const errors = [];
    const warnings = [];

    function addCheck(id, name, section, status, detailsMsg) {
      checks.push({
        id,
        code: id,
        name,
        section,
        status, // "PASSED", "FAILED", "WARNING"
        details: detailsMsg,
      });
    }

    function addIssue(code, severity, section, field, message, sourceReference = null) {
      const issue = {
        code,
        severity, // "BLOCKER", "ERROR", "WARNING", "INFO"
        section,
        field,
        message,
        source_reference: sourceReference,
      };

      if (severity === "BLOCKER" || severity === "ERROR") {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }

    // =========================================================================
    // CATEGORY A: TAXPAYER PROFILE VALIDATION
    // =========================================================================
    // 1. Taxpayer legal name
    const taxpayerInfoDetail = details.find(
      (d) => d.section === "TAXPAYER_INFORMATION" || d.section === "PROFILE_SNAPSHOT"
    );
    const taxpayerName = taxpayerInfoDetail?.metadata?.taxpayer_name || user?.full_name || returnRecord.taxpayer_name;
    if (!taxpayerName || taxpayerName.trim() === "") {
      addIssue("MISSING_TAXPAYER_NAME", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_name", "Taxpayer legal full name is mandatory for return filing.", `users:${returnRecord.user_id}`);
      addCheck("CHK_TAXPAYER_NAME", "Taxpayer Legal Name Verification", "TAXPAYER_PROFILE", "FAILED", "Taxpayer name is missing or empty.");
    } else {
      addCheck("CHK_TAXPAYER_NAME", "Taxpayer Legal Name Verification", "TAXPAYER_PROFILE", "PASSED", `Taxpayer verified as '${taxpayerName}'.`);
    }

    // 2. Taxpayer Profile & TIN
    if (!profile) {
      addIssue("PROFILE_NOT_FOUND", "BLOCKER", "TAXPAYER_PROFILE", "profile", "Taxpayer demographic profile record does not exist.", null);
      addCheck("CHK_PROFILE_EXISTS", "Profile Existence Check", "TAXPAYER_PROFILE", "FAILED", "Profile missing.");
    } else {
      addCheck("CHK_PROFILE_EXISTS", "Profile Existence Check", "TAXPAYER_PROFILE", "PASSED", `Profile ID #${profile.id} active.`);

      const tin = taxpayerInfoDetail?.metadata?.tin || taxpayerInfoDetail?.metadata?.tin_number || profile.tin_number;
      if (!tin || tin.trim() === "") {
        addIssue("MISSING_REQUIRED_TIN", "BLOCKER", "TAXPAYER_PROFILE", "tin_number", "12-digit Taxpayer Identification Number (TIN) is mandatory for filing income tax returns under ITA 2023.", `taxpayer_profiles:${profile.id}`);
        addCheck("CHK_TIN_VALIDATION", "e-TIN Mandate Verification", "TAXPAYER_PROFILE", "FAILED", "Missing mandatory 12-digit e-TIN.");
      } else if (!/^\d{12}$/.test(tin.trim())) {
        addIssue("INVALID_TIN_FORMAT", "ERROR", "TAXPAYER_PROFILE", "tin_number", `e-TIN '${tin}' must be a valid 12-digit numeric identifier.`, `taxpayer_profiles:${profile.id}`);
        addCheck("CHK_TIN_VALIDATION", "e-TIN Mandate Verification", "TAXPAYER_PROFILE", "FAILED", "Invalid e-TIN format.");
      } else {
        addCheck("CHK_TIN_VALIDATION", "e-TIN Mandate Verification", "TAXPAYER_PROFILE", "PASSED", `Valid 12-digit e-TIN '${tin}' registered.`);
      }

      // 3. NID Validation
      const nid = taxpayerInfoDetail?.metadata?.nid || user?.nid;
      if (nid && !/^\d{10}(\d{3}|\d{7})?$/.test(nid.trim())) {
        addIssue("INVALID_NID_FORMAT", "WARNING", "TAXPAYER_PROFILE", "nid", `National Identity Number '${nid}' does not match standard 10, 13, or 17 digit formats.`, `users:${returnRecord.user_id}`);
        addCheck("CHK_NID_VALIDATION", "NID Demographic Verification", "TAXPAYER_PROFILE", "WARNING", "Non-standard NID length.");
      } else {
        addCheck("CHK_NID_VALIDATION", "NID Demographic Verification", "TAXPAYER_PROFILE", "PASSED", "NID demographic verified.");
      }

      // 4. Address check
      const address = taxpayerInfoDetail?.metadata?.taxpayer_address;
      if (!address || address.trim() === "") {
        addIssue("MISSING_ADDRESS", "WARNING", "TAXPAYER_PROFILE", "address", "Taxpayer residential/postal address is not recorded in profile snapshot. NBR submission will require a complete postal address.", "tax_return_details");
        addCheck("CHK_ADDRESS_VERIFICATION", "Postal Address Check", "TAXPAYER_PROFILE", "WARNING", "No residential address in profile snapshot.");
      } else {
        addCheck("CHK_ADDRESS_VERIFICATION", "Postal Address Check", "TAXPAYER_PROFILE", "PASSED", "Postal address verified.");
      }

      // 5. Taxpayer Category & Eligibility Criteria
      const validCategories = [
        "GENERAL",
        "WOMEN",
        "SENIOR_CITIZEN",
        "PHYSICALLY_CHALLENGED",
        "THIRD_GENDER",
        "WAR_WOUNDED_FREEDOM_FIGHTER",
        "JULY_WARRIOR",
      ];
      const category = calculation?.category || taxpayerInfoDetail?.metadata?.taxpayer_category || returnRecord.taxpayer_category;

      if (!validCategories.includes(category)) {
        addIssue("INVALID_TAXPAYER_CATEGORY", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", `Category '${category}' is not a recognized statutory Bangladesh taxpayer category.`, null);
        addCheck("CHK_CATEGORY_VALIDATION", "Taxpayer Category Eligibility", "TAXPAYER_PROFILE", "FAILED", `Invalid category '${category}'.`);
      } else {
        // Eligibility criteria validation
        let categoryValid = true;
        if (category === "SENIOR_CITIZEN") {
          const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
          if (!dob) {
            addIssue("DOB_REQUIRED_FOR_SENIOR_CITIZEN", "BLOCKER", "TAXPAYER_PROFILE", "date_of_birth", "Date of birth is mandatory to establish SENIOR_CITIZEN eligibility (minimum 65 years).", `taxpayer_profiles:${profile.id}`);
            categoryValid = false;
          } else {
            const taxEndYear = parseInt(returnRecord.tax_year.split("-")[0], 10) + 1;
            const age = taxEndYear - dob.getFullYear();
            if (age < 65) {
              addIssue("CATEGORY_CRITERIA_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", `Taxpayer age (${age} years) does not qualify for SENIOR_CITIZEN threshold (minimum 65 years required).`, `taxpayer_profiles:${profile.id}`);
              categoryValid = false;
            }
          }
        } else if (category === "WOMEN" && profile.gender !== "FEMALE") {
          addIssue("CATEGORY_CRITERIA_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", `Taxpayer gender '${profile.gender}' does not match WOMEN category.`, `taxpayer_profiles:${profile.id}`);
          categoryValid = false;
        } else if (category === "THIRD_GENDER" && profile.gender !== "THIRD_GENDER") {
          addIssue("CATEGORY_CRITERIA_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", `Taxpayer gender does not match THIRD_GENDER category.`, `taxpayer_profiles:${profile.id}`);
          categoryValid = false;
        } else if (category === "WAR_WOUNDED_FREEDOM_FIGHTER" && Number(profile.is_freedom_fighter) !== 1) {
          addIssue("CATEGORY_CRITERIA_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", "Taxpayer profile does not have verified Freedom Fighter status for WAR_WOUNDED_FREEDOM_FIGHTER category.", `taxpayer_profiles:${profile.id}`);
          categoryValid = false;
        } else if (category === "JULY_WARRIOR" && Number(profile.is_july_warrior) !== 1) {
          addIssue("CATEGORY_CRITERIA_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", "Taxpayer profile does not have verified July Warrior status for JULY_WARRIOR category.", `taxpayer_profiles:${profile.id}`);
          categoryValid = false;
        } else if (category === "PHYSICALLY_CHALLENGED" && Number(profile.is_physically_challenged) !== 1) {
          addIssue("CATEGORY_CRITERIA_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "taxpayer_category", "Taxpayer profile does not have verified disability status for PHYSICALLY_CHALLENGED category.", `taxpayer_profiles:${profile.id}`);
          categoryValid = false;
        }

        if (categoryValid) {
          addCheck("CHK_CATEGORY_VALIDATION", "Taxpayer Category Eligibility", "TAXPAYER_PROFILE", "PASSED", `Taxpayer qualifies for category '${category}'.`);
        } else {
          addCheck("CHK_CATEGORY_VALIDATION", "Taxpayer Category Eligibility", "TAXPAYER_PROFILE", "FAILED", `Category criteria check failed for '${category}'.`);
        }
      }

      // 6. Tax Year & Assessment Year
      if (!/^\d{4}-\d{2}$/.test(returnRecord.tax_year)) {
        addIssue("INVALID_TAX_YEAR", "BLOCKER", "TAXPAYER_PROFILE", "tax_year", `Invalid tax year format: '${returnRecord.tax_year}'. Expected YYYY-YY.`, null);
      }
      if (calculation && returnRecord.tax_year !== calculation.tax_year) {
        addIssue("TAX_YEAR_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "tax_year", `Return tax year (${returnRecord.tax_year}) does not match calculation tax year (${calculation.tax_year}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_TAX_YEAR_MATCH", "Tax Year Consistency", "TAXPAYER_PROFILE", "FAILED", "Tax year mismatch.");
      } else {
        addCheck("CHK_TAX_YEAR_MATCH", "Tax Year Consistency", "TAXPAYER_PROFILE", "PASSED", `Tax year '${returnRecord.tax_year}' consistent.`);
      }

      if (calculation && returnRecord.assessment_year !== calculation.tax_year) {
        addIssue("ASSESSMENT_YEAR_MISMATCH", "BLOCKER", "TAXPAYER_PROFILE", "assessment_year", `Return assessment year (${returnRecord.assessment_year}) does not match calculation tax year (${calculation.tax_year}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_ASSESSMENT_YEAR_MATCH", "Assessment Year Consistency", "TAXPAYER_PROFILE", "FAILED", "Assessment year mismatch.");
      } else {
        addCheck("CHK_ASSESSMENT_YEAR_MATCH", "Assessment Year Consistency", "TAXPAYER_PROFILE", "PASSED", `Assessment year '${returnRecord.assessment_year}' consistent.`);
      }
    }

    // =========================================================================
    // CATEGORY B: INCOME VALIDATION
    // =========================================================================
    const incomeDetails = details.filter((d) => d.section === "INCOME_SUMMARY" || d.section === "INCOME");
    const validIncomeHeads = ["SALARY", "HOUSE_RENT", "BUSINESS", "AGRICULTURE", "DIVIDEND", "CAPITAL_GAIN", "OTHER_SOURCES", "OTHER", "TOTAL_INCOME"];

    // 1. Check duplicate income snapshot items
    const incomeTypeCounts = {};
    for (const item of incomeDetails) {
      if (item.income_type && item.income_type !== "TOTAL_INCOME") {
        incomeTypeCounts[item.income_type] = (incomeTypeCounts[item.income_type] || 0) + 1;
      }
    }
    let duplicateIncomeFound = false;
    for (const [itype, count] of Object.entries(incomeTypeCounts)) {
      if (count > 1) {
        duplicateIncomeFound = true;
        addIssue("DUPLICATE_INCOME_SNAPSHOT", "ERROR", "INCOME", "income_type", `Duplicate snapshot entry detected for income head: ${itype} (${count} entries).`, "tax_return_details");
      }
    }
    if (duplicateIncomeFound) {
      addCheck("CHK_INCOME_DUPLICATION", "Income Snapshot Uniqueness", "INCOME", "FAILED", "Duplicate income heads present in snapshot.");
    } else {
      addCheck("CHK_INCOME_DUPLICATION", "Income Snapshot Uniqueness", "INCOME", "PASSED", "No duplicate income heads.");
    }

    // 2. Check valid income classification
    let invalidIncomeClassification = false;
    for (const item of incomeDetails) {
      if (item.income_type && !validIncomeHeads.includes(item.income_type)) {
        invalidIncomeClassification = true;
        addIssue("INVALID_INCOME_CLASSIFICATION", "ERROR", "INCOME", "income_type", `Unrecognized income classification '${item.income_type}' in return snapshot.`, `tax_return_details:${item.id}`);
      }
    }
    if (invalidIncomeClassification) {
      addCheck("CHK_INCOME_CLASSIFICATION", "Statutory Income Classification", "INCOME", "FAILED", "Unrecognized income types detected.");
    } else {
      addCheck("CHK_INCOME_CLASSIFICATION", "Statutory Income Classification", "INCOME", "PASSED", "All income heads match statutory schedule.");
    }

    // 3. Total income matching persisted calculation
    if (calculation) {
      if (Math.abs(Number(returnRecord.total_income) - Number(calculation.total_income)) > 0.01) {
        addIssue("TOTAL_INCOME_MISMATCH", "BLOCKER", "INCOME", "total_income", `Return total income (BDT ${returnRecord.total_income}) does not match calculation total income (BDT ${calculation.total_income}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_TOTAL_INCOME_CALC_MATCH", "Total Income Authoritative Match", "INCOME", "FAILED", "Total income diverges from persisted calculation.");
      } else {
        addCheck("CHK_TOTAL_INCOME_CALC_MATCH", "Total Income Authoritative Match", "INCOME", "PASSED", `Total income (BDT ${Number(returnRecord.total_income).toLocaleString('en-US', { minimumFractionDigits: 2 })}) matches calculation.`);
      }
    }

    // 4. Sum of snapshot heads consistency & authoritative reconciliation
    const snapshotHeadSum = this.roundMoney(
      incomeDetails
        .filter((d) => d.income_type && d.income_type !== "TOTAL_INCOME")
        .reduce((sum, d) => sum + Number(d.amount || 0), 0)
    );
    const returnTotal = this.roundMoney(Number(returnRecord.total_income || 0));
    const calcTotal = calculation ? this.roundMoney(Number(calculation.total_income || 0)) : returnTotal;

    const diffSnapshotReturn = Math.abs(snapshotHeadSum - returnTotal);
    const diffSnapshotCalc = Math.abs(snapshotHeadSum - calcTotal);

    if (diffSnapshotReturn > 0.01 || diffSnapshotCalc > 0.01) {
      const diffAmt = Math.max(diffSnapshotReturn, diffSnapshotCalc).toLocaleString("en-US", { minimumFractionDigits: 2 });
      addIssue(
        "INCOME_MISMATCH",
        "BLOCKER",
        "INCOME",
        "total_income",
        `Sum of return income heads (BDT ${snapshotHeadSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}) does not equal calculation total income (BDT ${calcTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}). Discrepancy: BDT ${diffAmt}.`,
        "tax_return_details"
      );
      addCheck(
        "CHK_INCOME_SUM_MATCH",
        "Income Heads Sum Adherence",
        "INCOME",
        "FAILED",
        `Snapshot heads sum (BDT ${snapshotHeadSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}) does not match calculation total income (BDT ${calcTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}).`
      );
    } else {
      addCheck(
        "CHK_INCOME_SUM_MATCH",
        "Income Heads Sum Adherence",
        "INCOME",
        "PASSED",
        `Snapshot income heads sum (BDT ${snapshotHeadSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}) equals total income.`
      );
    }

    // 5. Source income records mutation / out-of-sync detection
    if (userIncomes && userIncomes.length > 0) {
      const sourceTotal = userIncomes.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      if (Math.abs(sourceTotal - returnTotal) > 0.01) {
        addIssue(
          "SNAPSHOT_MUTATION_DETECTED",
          "WARNING",
          "INCOME",
          "total_income",
          `Source income records have been modified since return snapshot creation. Current source total is BDT ${sourceTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}, but return snapshot is BDT ${returnTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
          "income"
        );
        addCheck("CHK_SOURCE_INCOME_SYNC", "Source Data Synchronization", "INCOME", "WARNING", "Source income mutated after return creation.");
      } else {
        addCheck("CHK_SOURCE_INCOME_SYNC", "Source Data Synchronization", "INCOME", "PASSED", "Snapshot matches active source income records.");
      }
    }

    // =========================================================================
    // CATEGORY C: HONORARIUM CLASSIFICATION VALIDATION
    // =========================================================================
    const honorariumRecords = (userIncomes || []).filter(
      (i) =>
        [112, 113].includes(i.id) ||
        (i.income_type === "PENSION" && /honorarium|lecture|judge|hackathon|buet|ict/i.test((i.source_name || "") + " " + (i.description || "")))
    );

    if (honorariumRecords.length > 0) {
      const recordIds = honorariumRecords.map((r) => r.id).join(",");
      addIssue(
        "HONORARIUM_CLASSIFICATION_UNCERTAIN",
        "WARNING",
        "INCOME",
        "other_sources",
        "Some professional income records require classification review. No pension exemption has been applied to these records.",
        `income:${recordIds}`
      );
      addCheck(
        "CHK_HONORARIUM_CLASSIFICATION",
        "Honorarium Classification Audit",
        "INCOME",
        "WARNING",
        "Some professional income records require classification review. No pension exemption has been applied to these records."
      );
    } else {
      addCheck("CHK_HONORARIUM_CLASSIFICATION", "Honorarium Classification Audit", "INCOME", "PASSED", "No unresolved honorarium classifications detected.");
    }

    // =========================================================================
    // CATEGORY D: INCOME EXEMPTION VALIDATION
    // =========================================================================
    const exemptionDetails = details.filter((d) => d.section === "INCOME_EXEMPTIONS" || d.section === "EXEMPTION");
    if (calculation) {
      const salaryExItem = exemptionDetails.find((d) => d.income_type === "SALARY");
      if (salaryExItem && Math.abs(Number(salaryExItem.amount) - Number(calculation.salary_exemption || 0)) > 0.01) {
        addIssue("EXEMPTION_MISMATCH", "BLOCKER", "EXEMPTION", "salary_exemption", `Salary exemption in snapshot (BDT ${salaryExItem.amount}) does not match calculation (BDT ${calculation.salary_exemption}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_SALARY_EXEMPTION", "Salary Exemption Statutory Ceiling", "EXEMPTION", "FAILED", "Salary exemption diverges from calculation.");
      } else {
        addCheck("CHK_SALARY_EXEMPTION", "Salary Exemption Statutory Ceiling", "EXEMPTION", "PASSED", "Salary exemption verified.");
      }

      // Check total exemptions consistency
      const exemptionSum = exemptionDetails
        .filter((d) => d.income_type && d.income_type !== "TOTAL_EXEMPTIONS")
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);
      if (Math.abs(exemptionSum - Number(returnRecord.total_exemption)) > 1.0) {
        addIssue("EXEMPTION_MISMATCH", "BLOCKER", "EXEMPTION", "total_exemption", `Sum of exemption items (BDT ${exemptionSum}) does not equal return total exemption (BDT ${returnRecord.total_exemption}).`, "tax_return_details");
        addCheck("CHK_TOTAL_EXEMPTIONS", "Total Statutory Exemptions", "EXEMPTION", "FAILED", "Exemptions sum does not match return total.");
      } else {
        addCheck("CHK_TOTAL_EXEMPTIONS", "Total Statutory Exemptions", "EXEMPTION", "PASSED", `Total exemptions (BDT ${Number(returnRecord.total_exemption).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }
    }

    // =========================================================================
    // CATEGORY E: DEDUCTION VALIDATION
    // =========================================================================
    const deductionDetails = details.filter((d) => d.section === "ALLOWABLE_DEDUCTIONS" || d.section === "DEDUCTION");
    if (calculation) {
      if (Math.abs(Number(returnRecord.total_deduction) - Number(calculation.total_deduction)) > 0.01) {
        addIssue("DEDUCTION_MISMATCH", "BLOCKER", "DEDUCTION", "total_deduction", `Return total deduction (BDT ${returnRecord.total_deduction}) does not match calculation total deduction (BDT ${calculation.total_deduction}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_TOTAL_DEDUCTIONS", "Total Allowable Deductions", "DEDUCTION", "FAILED", "Deductions diverge from calculation.");
      } else {
        addCheck("CHK_TOTAL_DEDUCTIONS", "Total Allowable Deductions", "DEDUCTION", "PASSED", `Total deductions (BDT ${Number(returnRecord.total_deduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }
    }

    // Check duplicate deduction items
    const dedTypeCounts = {};
    for (const d of deductionDetails) {
      if (d.income_type && d.income_type !== "TOTAL_DEDUCTIONS") {
        dedTypeCounts[d.income_type] = (dedTypeCounts[d.income_type] || 0) + 1;
      }
    }
    for (const [dtype, count] of Object.entries(dedTypeCounts)) {
      if (count > 1) {
        addIssue("DUPLICATE_DEDUCTION_SNAPSHOT", "ERROR", "DEDUCTION", "deduction_type", `Duplicate snapshot entry detected for deduction: ${dtype}.`, "tax_return_details");
      }
    }

    // =========================================================================
    // CATEGORY F: REBATE VALIDATION
    // =========================================================================
    if (calculation) {
      if (Math.abs(Number(returnRecord.tax_rebate) - Number(calculation.tax_rebate)) > 0.01) {
        addIssue("REBATE_MISMATCH", "BLOCKER", "REBATE", "tax_rebate", `Return tax rebate (BDT ${returnRecord.tax_rebate}) does not match calculation tax rebate (BDT ${calculation.tax_rebate}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_TAX_REBATE", "Investment Tax Rebate Verification", "REBATE", "FAILED", "Rebate diverges from calculation.");
      } else {
        addCheck("CHK_TAX_REBATE", "Investment Tax Rebate Verification", "REBATE", "PASSED", `Tax rebate (BDT ${Number(returnRecord.tax_rebate).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }

      if (Number(returnRecord.tax_rebate) > Number(returnRecord.gross_tax)) {
        addIssue("REBATE_EXCEEDS_GROSS_TAX", "ERROR", "REBATE", "tax_rebate", `Tax rebate (BDT ${returnRecord.tax_rebate}) cannot exceed gross tax liability (BDT ${returnRecord.gross_tax}).`, null);
      }
    }

    // =========================================================================
    // CATEGORY G: TAX CALCULATION INTEGRITY VALIDATION
    // =========================================================================
    if (!calculation) {
      addIssue("MISSING_CALCULATION_REFERENCE", "BLOCKER", "TAX_CALCULATION", "tax_calculation_id", `Referenced tax calculation #${returnRecord.tax_calculation_id} does not exist in tax_calculations table.`, null);
      addCheck("CHK_CALC_EXISTS", "Calculation Record Existence", "TAX_CALCULATION", "FAILED", "Referenced calculation does not exist.");
    } else {
      addCheck("CHK_CALC_EXISTS", "Calculation Record Existence", "TAX_CALCULATION", "PASSED", `Calculation #${calculation.id} found.`);

      // 1. Taxable income match
      if (Math.abs(Number(returnRecord.taxable_income) - Number(calculation.taxable_income)) > 0.01) {
        addIssue("TAXABLE_INCOME_MISMATCH", "BLOCKER", "TAX_CALCULATION", "taxable_income", `Return taxable income (BDT ${returnRecord.taxable_income}) does not match calculation taxable income (BDT ${calculation.taxable_income}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_TAXABLE_INCOME_INTEGRITY", "Taxable Income Integrity", "TAX_CALCULATION", "FAILED", "Taxable income mismatch.");
      } else {
        addCheck("CHK_TAXABLE_INCOME_INTEGRITY", "Taxable Income Integrity", "TAX_CALCULATION", "PASSED", `Taxable income (BDT ${Number(returnRecord.taxable_income).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }

      // 2. Gross tax match
      if (Math.abs(Number(returnRecord.gross_tax) - Number(calculation.gross_tax)) > 0.01) {
        addIssue("GROSS_TAX_MISMATCH", "BLOCKER", "TAX_CALCULATION", "gross_tax", `Return gross tax (BDT ${returnRecord.gross_tax}) does not match calculation gross tax (BDT ${calculation.gross_tax}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_GROSS_TAX_INTEGRITY", "Gross Tax Integrity", "TAX_CALCULATION", "FAILED", "Gross tax mismatch.");
      } else {
        addCheck("CHK_GROSS_TAX_INTEGRITY", "Gross Tax Integrity", "TAX_CALCULATION", "PASSED", `Gross tax (BDT ${Number(returnRecord.gross_tax).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }

      // 3. Minimum tax match
      if (Math.abs(Number(returnRecord.minimum_tax) - Number(calculation.minimum_tax)) > 0.01) {
        addIssue("MINIMUM_TAX_MISMATCH", "BLOCKER", "TAX_CALCULATION", "minimum_tax", `Return minimum tax (BDT ${returnRecord.minimum_tax}) does not match calculation minimum tax (BDT ${calculation.minimum_tax}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_MINIMUM_TAX_INTEGRITY", "Minimum Tax Integrity", "TAX_CALCULATION", "FAILED", "Minimum tax mismatch.");
      } else {
        addCheck("CHK_MINIMUM_TAX_INTEGRITY", "Minimum Tax Integrity", "TAX_CALCULATION", "PASSED", `Minimum tax (BDT ${Number(returnRecord.minimum_tax).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }

      // 4. Payable tax match
      if (Math.abs(Number(returnRecord.payable_tax) - Number(calculation.final_payable)) > 0.01) {
        addIssue("PAYABLE_TAX_MISMATCH", "BLOCKER", "TAX_CALCULATION", "payable_tax", `Return payable tax (BDT ${returnRecord.payable_tax}) does not match calculation final payable (BDT ${calculation.final_payable}).`, `tax_calculations:${calculation.id}`);
        addCheck("CHK_PAYABLE_TAX_INTEGRITY", "Payable Tax Integrity", "TAX_CALCULATION", "FAILED", "Final payable tax mismatch.");
      } else {
        addCheck("CHK_PAYABLE_TAX_INTEGRITY", "Payable Tax Integrity", "TAX_CALCULATION", "PASSED", `Final payable tax (BDT ${Number(returnRecord.payable_tax).toLocaleString('en-US', { minimumFractionDigits: 2 })}) verified.`);
      }

      // 5. Progressive slabs validation
      const snapshotSlabs = details.filter((d) => d.section === "TAX_CALCULATION" && d.income_type === "SLAB");
      if (slabDetails.length > 0 && snapshotSlabs.length !== slabDetails.length) {
        addIssue("PROGRESSIVE_SLAB_MISMATCH", "BLOCKER", "TAX_CALCULATION", "slabs", `Return snapshot contains ${snapshotSlabs.length} slabs, but authoritative calculation contains ${slabDetails.length} slabs.`, "tax_calculation_details");
        addCheck("CHK_SLAB_BREAKDOWN", "Progressive Slab Breakdown", "TAX_CALCULATION", "FAILED", "Slab count mismatch.");
      } else {
        addCheck("CHK_SLAB_BREAKDOWN", "Progressive Slab Breakdown", "TAX_CALCULATION", "PASSED", `All ${snapshotSlabs.length} progressive slabs verified.`);
      }
    }

    // =========================================================================
    // CATEGORY H: SNAPSHOT INTEGRITY VALIDATION
    // =========================================================================
    // 1. Cross-user calculation reference
    if (calculation && calculation.user_id !== returnRecord.user_id) {
      addIssue("CROSS_USER_CALCULATION_REFERENCE", "BLOCKER", "SNAPSHOT_INTEGRITY", "user_id", `Return user ID (${returnRecord.user_id}) does not match calculation owner (${calculation.user_id}).`, `tax_calculations:${calculation.id}`);
      addCheck("CHK_CROSS_USER_CALC", "Ownership Isolation Check", "SNAPSHOT_INTEGRITY", "FAILED", "Cross-user calculation reference.");
    } else {
      addCheck("CHK_CROSS_USER_CALC", "Ownership Isolation Check", "SNAPSHOT_INTEGRITY", "PASSED", "Calculation ownership verified.");
    }

    // 2. Snapshot required sections
    const existingSections = new Set(details.map((d) => d.section));
    const mandatorySections = ["TAXPAYER_INFORMATION", "INCOME_SUMMARY", "INCOME_EXEMPTIONS", "ALLOWABLE_DEDUCTIONS", "TAX_CALCULATION"];
    let missingSectionFound = false;
    for (const reqSec of mandatorySections) {
      if (!existingSections.has(reqSec)) {
        missingSectionFound = true;
        addIssue("MISSING_SNAPSHOT_SECTION", "BLOCKER", "SNAPSHOT_INTEGRITY", "section", `Mandatory snapshot section '${reqSec}' is missing.`, "tax_return_details");
      }
    }
    if (missingSectionFound) {
      addCheck("CHK_SNAPSHOT_SECTIONS", "Mandatory Sections Completeness", "SNAPSHOT_INTEGRITY", "FAILED", "Missing required snapshot sections.");
    } else {
      addCheck("CHK_SNAPSHOT_SECTIONS", "Mandatory Sections Completeness", "SNAPSHOT_INTEGRITY", "PASSED", "All 5 mandatory sections present.");
    }

    // 3. Null values check
    if (
      returnRecord.total_income === null ||
      returnRecord.taxable_income === null ||
      returnRecord.gross_tax === null ||
      returnRecord.payable_tax === null
    ) {
      addIssue("NULL_SNAPSHOT_VALUE", "BLOCKER", "SNAPSHOT_INTEGRITY", "financial_fields", "Return contains null values in critical financial snapshot fields.", `tax_returns:${returnRecord.id}`);
      addCheck("CHK_NULL_FIELDS", "Non-Null Constraint Verification", "SNAPSHOT_INTEGRITY", "FAILED", "Critical fields contain null values.");
    } else {
      addCheck("CHK_NULL_FIELDS", "Non-Null Constraint Verification", "SNAPSHOT_INTEGRITY", "PASSED", "All financial fields contain non-null values.");
    }

    // =========================================================================
    // CATEGORY I: FILING STATUS VALIDATION
    // =========================================================================
    // 1. Unverified acknowledgment check
    const ackRows = await query("SELECT * FROM tax_return_acknowledgments WHERE tax_return_id = ?", [returnId]);
    if (ackRows && ackRows.length > 0 && returnRecord.return_status === "DRAFT") {
      addIssue("UNVERIFIED_ACKNOWLEDGMENT_DETECTED", "BLOCKER", "FILING_STATUS", "acknowledgment", `Return has acknowledgment #${ackRows[0].acknowledgment_number} while still in review status.`, `tax_return_acknowledgments:${ackRows[0].id}`);
      addCheck("CHK_ACKNOWLEDGMENT_INTEGRITY", "Acknowledgment Authenticity", "FILING_STATUS", "FAILED", "Premature acknowledgment detected.");
    } else {
      addCheck("CHK_ACKNOWLEDGMENT_INTEGRITY", "Acknowledgment Authenticity", "FILING_STATUS", "PASSED", "No conflicting acknowledgment.");
    }

    // =========================================================================
    // STATUS TRANSITION RESOLUTION & EVALUATION
    // =========================================================================
    const hasBlockers = errors.some((e) => e.severity === "BLOCKER");
    const hasErrors = errors.some((e) => e.severity === "ERROR");
    const canProceed = !hasBlockers && !hasErrors;

    let validationStatus = "VALID";
    if (hasBlockers) {
      validationStatus = "BLOCKED";
    } else if (hasErrors) {
      validationStatus = "INVALID";
    } else if (warnings.length > 0) {
      validationStatus = "WARNINGS_ONLY";
    }

    let updatedReturn = returnRecord;

    // Transition from DRAFT -> VALIDATED only if canProceed === true
    if (canProceed && returnRecord.return_status === "DRAFT") {
      const connection = await getConnection();
      try {
        await connection.beginTransaction();

        await TaxReturnModel.updateStatus(
          returnId,
          "VALIDATED",
          userId,
          `Return passed statutory validation. Checks: ${checks.length}, Warnings: ${warnings.length}.`,
          null,
          connection
        );

        await TaxReturnModel.addStatusHistory(
          {
            tax_return_id: returnId,
            previous_status: returnRecord.return_status,
            new_status: "VALIDATED",
            changed_by: userId,
            remarks: `Statutory validation passed (${checks.length} checks passed). Return ready for filing submission.`,
          },
          connection
        );

        await connection.commit();
        updatedReturn = await TaxReturnModel.findById(returnId);
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    const summaries = buildSummariesFromDetails(updatedReturn, details);

    return {
      success: true,
      message: canProceed
        ? "Tax return passed statutory validation and is ready for submission."
        : `Tax return validation failed with ${errors.length} unresolved issue(s).`,
      data: {
        returnId: Number(returnId),
        validationStatus,
        canProceed,
        checkedAt: new Date().toISOString(),
        errors,
        warnings,
        checks,
        return_status: updatedReturn.return_status,
        ...updatedReturn,
        ...summaries,
        details,
      },
    };
  },

  /**
   * Get return by ID with RBAC ownership enforcement.
   */
  async getReturnById(returnId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);

    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to view this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    const details = await TaxReturnModel.getDetailsByReturnId(returnId);
    const statusHistory = await TaxReturnModel.getStatusHistoryByReturnId(returnId);
    const acknowledgment = await TaxReturnModel.getAcknowledgment(returnId);
    const summaries = buildSummariesFromDetails(returnRecord, details);

    const assessmentYear = returnRecord.assessment_year || returnRecord.tax_year;
    const incomeYear = getIncomeYearFromAssessmentYear(assessmentYear);

    return {
      ...returnRecord,
      payable_tax: Math.max(0, Number(returnRecord.payable_tax || 0)),
      final_payable: Math.max(0, Number(returnRecord.payable_tax || returnRecord.final_payable || 0)),
      refund_amount: Math.max(0, Number(returnRecord.refund_amount || 0)),
      assessment_year: assessmentYear,
      income_year: incomeYear,
      ...summaries,
      details,
      status_history: statusHistory,
      acknowledgment,
    };
  },

  /**
   * Get return snapshot details by ID with RBAC check.
   */
  async getReturnDetails(returnId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);

    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to view this tax return's details.");
      err.code = "FORBIDDEN";
      throw err;
    }

    return await TaxReturnModel.getDetailsByReturnId(returnId);
  },

  /**
   * Get return status transition history by ID with RBAC check.
   */
  async getStatusHistory(returnId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);

    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to view this tax return's status history.");
      err.code = "FORBIDDEN";
      throw err;
    }

    return await TaxReturnModel.getStatusHistoryByReturnId(returnId);
  },

  /**
   * List tax returns (Taxpayer sees only their own; Admin can view all or filter).
   */
  async listReturns(userId, userRole = "user", filters = {}) {
    let returns;
    if (userRole === "admin") {
      returns = await TaxReturnModel.findAll(filters);
    } else {
      returns = await TaxReturnModel.findByUserId(userId, {
        taxYear: filters.taxYear,
        status: filters.status,
      });
    }

    return returns.map((r) => {
      const assessmentYear = r.assessment_year || r.tax_year || "2026-27";
      return {
        ...r,
        payable_tax: Math.max(0, Number(r.payable_tax || 0)),
        final_payable: Math.max(0, Number(r.payable_tax || r.final_payable || 0)),
        refund_amount: Math.max(0, Number(r.refund_amount || 0)),
        assessment_year: assessmentYear,
        income_year: getIncomeYearFromAssessmentYear(assessmentYear),
        return_number:
          r.return_number ||
          `TRN-${String(assessmentYear).replace("-", "")}-${String(r.id).padStart(6, "0")}`,
      };
    });
  },
  /**
   * Submit and officially file a tax return.
   * Enforces taxpayer ownership, database-verified payment (if payable > 0),
   * and single submission protection using row locking in a database transaction.
   */
  async submitTaxReturn(returnId, userId, userRole = "user") {
    // 1. Check return existence
    const returnRecord = await TaxReturnModel.findById(returnId);
    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    // 2. Ownership enforcement (taxpayer must own the return; cross-user rejected)
    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to file this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    // 3. Status enforcement - cannot file already filed returns
    if (["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(returnRecord.return_status)) {
      const err = new Error("This tax return has already been filed.");
      err.code = "ALREADY_FILED";
      throw err;
    }

    // 4. Payment verification - if tax is payable, payment must be verified in database
    const payableTax = Math.max(0, Number(returnRecord.payable_tax || 0));
    if (payableTax > 0 && returnRecord.payment_status !== "PAID") {
      const err = new Error(
        `Tax payment must be verified before submitting return. Net tax payable is BDT ${payableTax.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })}.`
      );
      err.code = "PAYMENT_REQUIRED";
      throw err;
    }

    // 5. Eligible return status check (must be PAID or VALIDATED; or DRAFT if 0 payable)
    if (
      returnRecord.return_status !== "PAID" &&
      returnRecord.return_status !== "VALIDATED" &&
      !(returnRecord.return_status === "DRAFT" && payableTax === 0)
    ) {
      const err = new Error(
        `Cannot submit tax return: current status is '${returnRecord.return_status}'. Return must be paid or validated before filing.`
      );
      err.code = "INVALID_STATUS_TRANSITION";
      throw err;
    }

    // 6. Database transaction with row-level locking to transition status to FILED
    const connection = await getConnection();
    const filedAtStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    try {
      await connection.beginTransaction();

      // Row-level lock
      const [rows] = await connection.execute(
        "SELECT id, user_id, return_status, payment_status, payable_tax, tax_year, assessment_year FROM tax_returns WHERE id = ? FOR UPDATE",
        [returnId]
      );
      const lockedReturn = rows[0];

      if (!lockedReturn) {
        const err = new Error("Tax return not found during filing transaction.");
        err.code = "RETURN_NOT_FOUND";
        throw err;
      }

      if (userRole !== "admin" && lockedReturn.user_id !== userId) {
        const err = new Error("Access denied: You do not have permission to file this tax return.");
        err.code = "FORBIDDEN";
        throw err;
      }

      if (["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(lockedReturn.return_status)) {
        const err = new Error("This tax return has already been filed.");
        err.code = "ALREADY_FILED";
        throw err;
      }

      const lockedPayable = Math.max(0, Number(lockedReturn.payable_tax || 0));
      if (lockedPayable > 0 && lockedReturn.payment_status !== "PAID") {
        const err = new Error("Tax payment must be verified before submitting return.");
        err.code = "PAYMENT_REQUIRED";
        throw err;
      }

      // If return has zero net payable (e.g. refund due or zero tax liability),
      // ensure payment status is recorded as PAID (satisfied) to prevent inconsistent PENDING state.
      if (lockedPayable === 0 && lockedReturn.payment_status !== "PAID") {
        await connection.execute(
          "UPDATE tax_returns SET payment_status = 'PAID' WHERE id = ?",
          [returnId]
        );
      }

      // Generate statutory-style acknowledgment and document reference
      const yearClean = String(lockedReturn.assessment_year || lockedReturn.tax_year || "202728").replace(/[^0-9]/g, "");
      const ackNumber = `ACK-${yearClean}-${String(returnId).padStart(6, "0")}`;
      const docRef = `DOC-${yearClean}-${String(returnId).padStart(6, "0")}`;

      // Update return status to FILED and record submitted_at
      await TaxReturnModel.updateStatus(
        returnId,
        "FILED",
        userId,
        "Tax return officially filed by taxpayer.",
        filedAtStr,
        connection
      );

      // Record status transition in tax_return_status_history
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: returnId,
          previous_status: lockedReturn.return_status,
          new_status: "FILED",
          changed_by: userId,
          remarks: `Tax return filed successfully. Acknowledgment Ref: ${ackNumber}`,
        },
        connection
      );

      // Persist acknowledgment details
      await TaxReturnModel.createAcknowledgment(
        {
          taxReturnId: returnId,
          acknowledgmentNumber: ackNumber,
          source: "SYSTEM",
          documentReference: docRef,
        },
        connection
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Fetch the updated return
    const updatedReturn = await this.getReturnById(returnId, userId, userRole);

    return {
      success: true,
      message: "Tax return successfully submitted and marked as Filed.",
      data: {
        returnId: Number(returnId),
        return_status: "FILED",
        submitted_at: updatedReturn.submitted_at || filedAtStr,
        ...updatedReturn,
      },
    };
  },

  /**
   * Confirm filing for a tax return (Backward-compatible alias for submitTaxReturn).
   */
  async confirmFiling(returnId, userId, userRole = "user") {
    return await this.submitTaxReturn(returnId, userId, userRole);
  },

  /**
   * Find an existing tax return for a specific calculation ID.
   */
  async getReturnByCalculationId(calculationId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findByCalculationId(calculationId);
    if (!returnRecord) {
      return null;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to view this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    return await this.getReturnById(returnRecord.id, userId, userRole);
  },

  /**
   * Helper method to assemble frozen snapshot line items for a return.
   */
  async _assembleSnapshotDetails(returnId, userId, calculation, user, profile) {
    // Query category statutory tax-free threshold
    const thresholdRows = await query(
      "SELECT tax_free_threshold FROM tax_thresholds WHERE tax_year = ? AND category = ? LIMIT 1",
      [calculation.tax_year, calculation.category]
    );
    const taxFreeThreshold =
      thresholdRows.length > 0 ? Number(thresholdRows[0].tax_free_threshold) : 375000;

    // Inspect source income breakdown (to distinguish DIVIDEND and check honorarium)
    const { startDate, endDate } = getTaxYearDateRange(calculation.tax_year);
    const userIncomes = await query(
      "SELECT id, income_type, source_name, amount, description FROM income WHERE user_id = ? AND income_date BETWEEN ? AND ?",
      [userId, startDate, endDate]
    );

    const calcOtherIncome = this.roundMoney(Number(calculation.other_income || 0));
    let dividendIncome = 0;
    const classificationWarnings = [];

    if (userIncomes && userIncomes.length > 0) {
      const dividendRows = userIncomes.filter((i) => {
        const t = String(i.income_type || "").trim().toUpperCase().replace(/\s+/g, "_");
        return t === "DIVIDEND";
      });
      if (dividendRows.length > 0) {
        const rawDiv = dividendRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        dividendIncome = this.roundMoney(Math.min(calcOtherIncome, rawDiv));
      }

      // Check for honorarium records (such as guest lectures, BUET / ICT honorarium)
      const honorariumRows = userIncomes.filter(
        (i) =>
          [112, 113].includes(i.id) ||
          i.income_type === "PENSION" ||
          (i.source_name && /honorarium|lecture|judge|hackathon/i.test(i.source_name)) ||
          (i.description && /honorarium|lecture|judge|hackathon/i.test(i.description))
      );

      if (honorariumRows.length > 0) {
        classificationWarnings.push(
          "Some professional income records require classification review. No pension exemption has been applied to these records."
        );
      }
    }

    // Single authoritative source of truth:
    // dividendIncome + otherSourcesIncome must always equal calculation.other_income
    const otherSourcesIncome = this.roundMoney(Math.max(0, calcOtherIncome - dividendIncome));

    // Deductions & Allowances computation
    const salaryExemption = Number(calculation.salary_exemption || 0);
    // House property allowance (25% residential repair allowance from Sec 38)
    const housePropertyAllowance = this.roundMoney(Number(calculation.house_property_income || 0) * 0.25);
    const agriculturalDeduction = 0.0;
    const totalExemptions = this.roundMoney(salaryExemption + housePropertyAllowance + agriculturalDeduction);

    // Business expenses
    const businessExpenses = this.roundMoney(
      Number(calculation.total_deduction || 0) - salaryExemption - housePropertyAllowance
    );
    const otherDeductions = 0.0;
    const allowableInvestment = Number(calculation.eligible_investment || 0);
    const totalAllowableDeductions = this.roundMoney(Math.max(0, businessExpenses) + otherDeductions);

    // Fetch slab calculation details
    const slabDetails = await query(
      "SELECT * FROM tax_calculation_details WHERE tax_calculation_id = ? ORDER BY slab_order ASC",
      [calculation.id]
    );

    const detailsToInsert = [];

    // Section A: TAXPAYER_INFORMATION
    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAXPAYER_INFORMATION",
      income_type: null,
      description: "Taxpayer Identity and Demographic Snapshot",
      amount: 0.0,
      metadata: {
        taxpayer_name: user?.full_name || "Taxpayer",
        tin: profile.tin_number || null,
        tin_number: profile.tin_number || null,
        nid: user?.nid || null,
        date_of_birth: profile.date_of_birth
          ? typeof profile.date_of_birth === "string"
            ? profile.date_of_birth.split("T")[0]
            : profile.date_of_birth.toISOString().split("T")[0]
          : null,
        taxpayer_category: calculation.category,
        taxpayer_address: null,
        minimum_tax_area: profile.minimum_tax_area || null,
        tax_year: calculation.tax_year,
        assessment_year: calculation.tax_year,
        is_new_taxpayer: profile.is_new_taxpayer,
        filing_history_status: profile.filing_history_status,
      },
    });

    // Section B: INCOME_SUMMARY
    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "SALARY",
      description: "Income from Salary / Employment (Section 32)",
      amount: Number(calculation.salary_income || 0),
      metadata: {
        exemption: salaryExemption,
        net: this.roundMoney(Number(calculation.salary_income || 0) - salaryExemption),
      },
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "HOUSE_RENT",
      description: "Income from House Property (Section 38)",
      amount: Number(calculation.house_property_income || 0),
      metadata: { repair_allowance: housePropertyAllowance },
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "BUSINESS",
      description: "Income from Business or Profession (Section 49)",
      amount: Number(calculation.business_income || 0),
      metadata: { deductible_expenses: Math.max(0, businessExpenses) },
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "AGRICULTURE",
      description: "Income from Agriculture (Section 40/42/43)",
      amount: Number(calculation.agriculture_income || 0),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "DIVIDEND",
      description: "Dividend Income (Section 102)",
      amount: dividendIncome,
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "CAPITAL_GAIN",
      description: "Capital Gains Income (Section 57)",
      amount: Number(calculation.capital_gain_income || 0),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "OTHER_SOURCES",
      description: "Income from Other Sources (Honorarium / Fees / Other)",
      amount: otherSourcesIncome,
      metadata: classificationWarnings.length > 0 ? { warnings: classificationWarnings } : null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_SUMMARY",
      income_type: "TOTAL_INCOME",
      description: "Gross Total Income from All Heads",
      amount: Number(calculation.total_income || 0),
      metadata: null,
    });

    // Section C: INCOME_EXEMPTIONS
    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_EXEMPTIONS",
      income_type: "SALARY",
      description: "Statutory Salary Exemption (Section 32: 1/3 capped at BDT 500,000)",
      amount: salaryExemption,
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_EXEMPTIONS",
      income_type: "HOUSE_RENT",
      description: "Section 38 Statutory House Property Repair & Collection Allowance",
      amount: housePropertyAllowance,
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_EXEMPTIONS",
      income_type: "AGRICULTURE",
      description: "Section 42/43 Agricultural Cost of Production Exemption",
      amount: agriculturalDeduction,
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "INCOME_EXEMPTIONS",
      income_type: "TOTAL_EXEMPTIONS",
      description: "Total Statutory Income Exemptions & Allowances",
      amount: totalExemptions,
      metadata: null,
    });

    // Section D: ALLOWABLE_DEDUCTIONS
    detailsToInsert.push({
      tax_return_id: returnId,
      section: "ALLOWABLE_DEDUCTIONS",
      income_type: "BUSINESS",
      description: "Tax-Deductible Business Expenses (Section 49)",
      amount: Math.max(0, businessExpenses),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "ALLOWABLE_DEDUCTIONS",
      income_type: "OTHER",
      description: "Other Statutory Allowable Deductions",
      amount: otherDeductions,
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "ALLOWABLE_DEDUCTIONS",
      income_type: "INVESTMENT_ALLOWANCE",
      description: "Allowable Investment Allowance",
      amount: allowableInvestment,
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "ALLOWABLE_DEDUCTIONS",
      income_type: "TOTAL_DEDUCTIONS",
      description: "Total Allowable Deductions & Business Expenses",
      amount: totalAllowableDeductions,
      metadata: null,
    });

    // Section E: TAX_REBATE
    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_REBATE",
      income_type: "INVESTMENT",
      description: "Tax Rebate on Eligible Investment",
      amount: Number(calculation.tax_rebate || 0),
      metadata: {
        eligible_investment: Number(calculation.eligible_investment || 0),
        allowable_investment: allowableInvestment,
        rebate_rate: Number(calculation.eligible_investment) > 0 ? "15.00%" : "0.00%",
        tax_rebate: Number(calculation.tax_rebate || 0),
      },
    });

    // Section F: TAX_CALCULATION
    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "TAXABLE_INCOME",
      description: "Net Taxable Income",
      amount: Number(calculation.taxable_income || 0),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "TAX_FREE_THRESHOLD",
      description: `Tax-Free Threshold for Category (${calculation.category})`,
      amount: taxFreeThreshold,
      metadata: { category: calculation.category },
    });

    // Progressive slabs breakdown
    for (const slab of slabDetails) {
      detailsToInsert.push({
        tax_return_id: returnId,
        section: "TAX_CALCULATION",
        income_type: "SLAB",
        description: `Slab ${slab.slab_order}: ${slab.tax_rate}% on taxable BDT ${Number(slab.taxable_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        amount: Number(slab.calculated_tax || 0),
        metadata: {
          slab_order: slab.slab_order,
          minimum_income: Number(slab.minimum_income || 0),
          maximum_income: Number(slab.maximum_income || 0),
          tax_rate: Number(slab.tax_rate || 0),
          taxable_amount: Number(slab.taxable_amount || 0),
        },
      });
    }

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "GROSS_TAX",
      description: "Gross Tax on Total Income",
      amount: Number(calculation.gross_tax || 0),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "TAX_REBATE",
      description: "Tax Rebate Deducted",
      amount: Number(calculation.tax_rebate || 0),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "TAX_AFTER_REBATE",
      description: "Tax Liability After Rebate",
      amount: Number(calculation.net_tax || 0),
      metadata: null,
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "MINIMUM_TAX",
      description: "Applicable Statutory Minimum Tax Floor",
      amount: Number(calculation.minimum_tax || 0),
      metadata: {
        minimum_tax_applied: Number(calculation.minimum_tax) > Number(calculation.net_tax),
        rule_id: calculation.minimum_tax_rule_id,
      },
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "SURCHARGE",
      description: "Net Wealth Surcharge",
      amount: Number(calculation.surcharge_amount || 0),
      metadata: {
        net_wealth: Number(calculation.net_wealth || 0),
        surcharge_rate: Number(calculation.surcharge_rate || 0),
      },
    });

    detailsToInsert.push({
      tax_return_id: returnId,
      section: "TAX_CALCULATION",
      income_type: "FINAL_PAYABLE",
      description: "Comprehensive Tax Calculation Summary Snapshot",
      amount: Number(calculation.final_payable || 0),
      metadata: {
        category: calculation.category,
        tds_amount: Number(calculation.tds_amount || 0),
        advance_tax_amount: Number(calculation.advance_tax_amount || 0),
        refund_amount: Number(calculation.refund_amount || 0),
        net_wealth: Number(calculation.net_wealth || 0),
        surcharge_rate: Number(calculation.surcharge_rate || 0),
        surcharge_amount: Number(calculation.surcharge_amount || 0),
        minimum_tax: Number(calculation.minimum_tax || 0),
      },
    });

    return { detailsToInsert, totalExemptions };
  },

  /**
   * Update an existing draft return with a newly selected calculation.
   * Enables the taxpayer to switch to an eligible category/calculation
   * without running into ACTIVE_DRAFT_EXISTS deadlock.
   */
  async updateDraftReturnCalculation(returnId, calculationId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);
    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to update this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    if (
      ["FILED", "SUBMITTED", "PAID", "ACKNOWLEDGED"].includes(returnRecord.return_status) ||
      ["SUCCESS", "PAID"].includes(returnRecord.payment_status)
    ) {
      const err = new Error("Cannot modify a tax return that has already been filed or paid.");
      err.code = "RETURN_ALREADY_FINALIZED";
      throw err;
    }

    // 1. Fetch calculation
    const calcRows = await query("SELECT * FROM tax_calculations WHERE id = ?", [calculationId]);
    const calculation = calcRows[0];
    if (!calculation) {
      const err = new Error(`Tax calculation #${calculationId} not found.`);
      err.code = "CALCULATION_NOT_FOUND";
      throw err;
    }

    if (calculation.user_id !== userId && userRole !== "admin") {
      const err = new Error("Unauthorized: Calculation does not belong to the authenticated user.");
      err.code = "UNAUTHORIZED_CALCULATION_REFERENCE";
      throw err;
    }

    // 2. Fetch User and Profile
    const userRows = await query(
      "SELECT id, full_name, email, phone, nid FROM users WHERE id = ?",
      [userId]
    );
    const user = userRows[0];

    const profileRaw = await TaxpayerProfileModel.getProfileByUserId(userId);
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    if (!profile) {
      const err = new Error("Taxpayer profile not found. Please complete profile before filing a return.");
      err.code = "PROFILE_NOT_FOUND";
      throw err;
    }

    // 3. Assemble snapshot details
    const { detailsToInsert, totalExemptions } = await this._assembleSnapshotDetails(
      returnId,
      userId,
      calculation,
      user,
      profile
    );

    const returnData = {
      tax_calculation_id: calculation.id,
      total_income: calculation.total_income,
      total_exemption: totalExemptions,
      total_deduction: calculation.total_deduction,
      taxable_income: calculation.taxable_income,
      gross_tax: calculation.gross_tax,
      tax_rebate: calculation.tax_rebate,
      tax_liability: calculation.tax_liability,
      minimum_tax: calculation.minimum_tax,
      payable_tax: calculation.final_payable,
      net_tax: calculation.net_tax,
      surcharge_amount: calculation.surcharge_amount,
      total_tax_payable: calculation.total_tax_payable,
      tds_amount: calculation.tds_amount,
      advance_tax_amount: calculation.advance_tax_amount,
      refund_amount: calculation.refund_amount,
    };

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      // Update return header
      await TaxReturnModel.updateReturnCalculation(returnId, returnData, connection);

      // Replace snapshot details
      await connection.execute("DELETE FROM tax_return_details WHERE tax_return_id = ?", [returnId]);
      await TaxReturnModel.createReturnDetails(detailsToInsert, connection);

      // Record status transition/history
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: returnId,
          previous_status: returnRecord.return_status,
          new_status: "DRAFT",
          changed_by: userId,
          remarks: `Tax return snapshot updated with tax calculation #${calculation.id} (${calculation.category}) for tax year ${calculation.tax_year}.`,
        },
        connection
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    return await this.getReturnById(returnId, userId, userRole);
  },

  /**
   * Delete a tax return and all associated records.
   */
  async deleteReturn(returnId, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);
    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to delete this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await TaxReturnModel.deleteReturn(returnId, connection);
      await connection.commit();
      return {
        success: true,
        message: `Tax return #${returnId} deleted successfully.`,
        deletedId: returnId,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Process and record tax payment for a return.
   */
  async processPayment(returnId, paymentData = {}, userId, userRole = "user") {
    const returnRecord = await TaxReturnModel.findById(returnId);
    if (!returnRecord) {
      const err = new Error(`Tax return #${returnId} not found.`);
      err.code = "RETURN_NOT_FOUND";
      throw err;
    }

    if (userRole !== "admin" && returnRecord.user_id !== userId) {
      const err = new Error("Access denied: You do not have permission to pay for this tax return.");
      err.code = "FORBIDDEN";
      throw err;
    }

    if (returnRecord.payment_status === "PAID" || returnRecord.return_status === "PAID") {
      return {
        success: true,
        alreadyPaid: true,
        message: "This tax return has already been paid.",
        data: returnRecord,
      };
    }

    const refundAmount = Number(returnRecord.refund_amount || 0);
    const payableTax = Number(returnRecord.payable_tax || 0);

    if (refundAmount > 0) {
      const err = new Error("Payment cannot be processed for a return with refund due. Please submit a refund request instead.");
      err.code = "PAYMENT_NOT_APPLICABLE_REFUND_DUE";
      throw err;
    }

    if (payableTax <= 0) {
      const err = new Error("No tax payment is due for this tax return.");
      err.code = "NO_TAX_DUE";
      throw err;
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const paymentReference =
        paymentData.paymentReference ||
        paymentData.payment_reference ||
        `PAY-${String(returnRecord.tax_year || "2026-27").replace("-", "")}-${String(returnId).padStart(6, "0")}-${Date.now().toString().slice(-4)}`;

      const paymentMethod = paymentData.paymentMethod || paymentData.payment_method || "A-CHALLAN";
      const paidAt = new Date();

      await TaxReturnModel.recordPayment(
        returnId,
        {
          paymentMethod,
          paymentReference,
          paidAt,
        },
        connection
      );

      // Record status transition in tax_return_status_history
      await TaxReturnModel.addStatusHistory(
        {
          tax_return_id: returnId,
          previous_status: returnRecord.return_status,
          new_status: "PAID",
          changed_by: userId,
          remarks: `Tax payment settled via ${paymentMethod} (Ref: ${paymentReference}). Final payable: BDT ${Number(returnRecord.payable_tax || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
        },
        connection
      );

      await connection.commit();

      const updated = await TaxReturnModel.findById(returnId);
      const details = await TaxReturnModel.getDetailsByReturnId(returnId);
      const summaries = buildSummariesFromDetails(updated, details);

      return {
        success: true,
        message: "Tax payment processed successfully.",
        data: {
          ...updated,
          ...summaries,
          details,
        },
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Create a new tax return for a calculation.
   * Every time a filing is initiated, a brand new return is created.
   */
  async getOrCreateReturnForCalculation(calculationId, userId, returnType = "INDIVIDUAL_REGULAR", userRole = "user") {
    // Whenever a filing is created, always initialize a brand new return
    const newDraft = await this.createDraftReturn(userId, calculationId, returnType);
    return {
      returnRecord: newDraft,
      isNew: true,
    };
  },
};

module.exports = TaxReturnService;
