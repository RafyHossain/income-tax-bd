/**
 * Utility functions for Assessment Year (AY) and Income Year mapping in Bangladesh Tax System.
 *
 * Rules:
 * 1. Assessment Year (AY) always immediately follows the Income Year.
 *    Example:
 *      AY 2027-28 -> Income Year 2026-27 (Period: July 1, 2026 to June 30, 2027).
 *      AY 2026-27 -> Income Year 2025-26 (Period: July 1, 2025 to June 30, 2026).
 * 2. Period dates are always July 1 to June 30.
 */

function validateYearFormat(yearStr) {
  if (typeof yearStr !== "string" || !/^\d{4}-\d{2}$/.test(yearStr.trim())) {
    throw new Error(`Invalid tax year format: '${yearStr}'. Expected YYYY-YY (e.g. '2026-27').`);
  }
  const [sYear, eYear] = yearStr.trim().split("-");
  const startYear = parseInt(sYear, 10);
  const expectedEndShort = String(startYear + 1).slice(-2);
  if (eYear !== expectedEndShort) {
    throw new Error(`Invalid year range: '${yearStr}'. Expected second part to be '${expectedEndShort}'.`);
  }
  return startYear;
}

// Given Assessment Year (e.g. '2027-28'), returns corresponding Income Year ('2026-27')
function getIncomeYearFromAssessmentYear(assessmentYear) {
  const ayStartYear = validateYearFormat(assessmentYear);
  const incomeStartYear = ayStartYear - 1;
  const incomeEndShort = String(incomeStartYear + 1).slice(-2);
  return `${incomeStartYear}-${incomeEndShort}`;
}

// Given Income Year (e.g. '2026-27'), returns corresponding Assessment Year ('2027-28')
function getAssessmentYearFromIncomeYear(incomeYear) {
  const incomeStartYear = validateYearFormat(incomeYear);
  const ayStartYear = incomeStartYear + 1;
  const ayEndShort = String(ayStartYear + 1).slice(-2);
  return `${ayStartYear}-${ayEndShort}`;
}

// Assessment Year period dates: July 1 to June 30
function getAssessmentYearDateRange(assessmentYear) {
  const startYear = validateYearFormat(assessmentYear);
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`,
  };
}

// Income Year period dates: July 1 to June 30
function getIncomeYearDateRange(incomeYear) {
  const startYear = validateYearFormat(incomeYear);
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`,
  };
}

// Backward compatibility helper
function getTaxYearDateRange(taxYear) {
  return getAssessmentYearDateRange(taxYear);
}

module.exports = {
  validateYearFormat,
  getIncomeYearFromAssessmentYear,
  getAssessmentYearFromIncomeYear,
  getAssessmentYearDateRange,
  getIncomeYearDateRange,
  getTaxYearDateRange,
};
