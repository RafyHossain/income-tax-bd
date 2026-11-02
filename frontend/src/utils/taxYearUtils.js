/**
 * Centralized Tax Year and Income Year Utilities for Bangladesh Tax Law
 *
 * Rules:
 * 1. Assessment Year (AY) represents the year immediately following the Income Year.
 *    Example: AY 2027-28 -> Income Year 2026-27.
 *    Example: AY 2026-27 -> Income Year 2025-26.
 * 2. Period dates run from July 1 to June 30.
 *    - AY 2027-28 Assessment Period: July 1, 2027 to June 30, 2028.
 *    - Income Year 2026-27 Earning Period: July 1, 2026 to June 30, 2027.
 */

export function validateYearFormat(yearStr) {
  if (!yearStr || typeof yearStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})$/.exec(yearStr.trim());
  if (!match) return false;
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  const expectedEnd = (start + 1) % 100;
  return end === expectedEnd;
}

/**
 * Returns Income Year for a given Assessment Year.
 * Example: '2027-28' -> '2026-27'
 */
export function getIncomeYearFromAssessmentYear(assessmentYear) {
  if (!assessmentYear || typeof assessmentYear !== 'string') return '';
  const match = /^(\d{4})-(\d{2})$/.exec(assessmentYear.trim());
  if (!match) return assessmentYear;
  const ayStart = parseInt(match[1], 10);
  const iyStart = ayStart - 1;
  const iyEnd = ayStart % 100;
  const iyEndPad = iyEnd < 10 ? `0${iyEnd}` : `${iyEnd}`;
  return `${iyStart}-${iyEndPad}`;
}

/**
 * Returns Assessment Year for a given Income Year.
 * Example: '2026-27' -> '2027-28'
 */
export function getAssessmentYearFromIncomeYear(incomeYear) {
  if (!incomeYear || typeof incomeYear !== 'string') return '';
  const match = /^(\d{4})-(\d{2})$/.exec(incomeYear.trim());
  if (!match) return incomeYear;
  const iyStart = parseInt(match[1], 10);
  const ayStart = iyStart + 1;
  const ayEnd = (ayStart + 1) % 100;
  const ayEndPad = ayEnd < 10 ? `0${ayEnd}` : `${ayEnd}`;
  return `${ayStart}-${ayEndPad}`;
}

/**
 * Returns the Assessment Year date range: July 1 to June 30.
 * Example: '2027-28' -> { startDate: '2027-07-01', endDate: '2028-06-30' }
 */
export function getAssessmentYearDateRange(assessmentYear) {
  if (!validateYearFormat(assessmentYear)) return null;
  const startYear = parseInt(assessmentYear.split('-')[0], 10);
  const endYear = startYear + 1;
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  };
}

/**
 * Returns the Income Year date range: July 1 to June 30.
 * Example: '2026-27' -> { startDate: '2026-07-01', endDate: '2027-06-30' }
 */
export function getIncomeYearDateRange(incomeYear) {
  return getAssessmentYearDateRange(incomeYear);
}

/**
 * Formats a clean tax year option label for dropdowns.
 * Example: '2027-28' -> 'AY 2027-28 (Income Year 2026-27)'
 */
export function formatTaxYearLabel(yearStr) {
  if (!yearStr) return '';
  const iy = getIncomeYearFromAssessmentYear(yearStr);
  return iy && iy !== yearStr ? `AY ${yearStr} (Income Year ${iy})` : `AY ${yearStr}`;
}

/**
 * Standard list of active Assessment Years in Bangladesh
 */
export const COMMON_TAX_YEARS = [
  '2026-27',
  '2025-26',
  '2024-25',
  '2023-24',
  '2027-28',
];

/**
 * Returns earning period (Income Year dates) for an Assessment Year.
 * Example for AY 2023-24:
 * returns {
 *   assessmentYear: '2023-24',
 *   incomeYear: '2022-23',
 *   startDate: '2022-07-01',
 *   endDate: '2023-06-30'
 * }
 */
export function getEarningPeriodForAssessmentYear(assessmentYear) {
  if (!assessmentYear) return null;
  const iy = getIncomeYearFromAssessmentYear(assessmentYear);
  if (!iy) return null;
  const range = getIncomeYearDateRange(iy);
  if (!range) return null;
  return {
    assessmentYear,
    incomeYear: iy,
    startDate: range.startDate,
    endDate: range.endDate,
  };
}

/**
 * Determines which Assessment Year a given transaction date belongs to.
 * Bangladesh Income Year runs from July 1 to June 30.
 * Example:
 * '2022-08-15' -> Income Year 2022-23 -> Assessment Year 2023-24
 * '2023-03-20' -> Income Year 2022-23 -> Assessment Year 2023-24
 * '2023-07-05' -> Income Year 2023-24 -> Assessment Year 2024-25
 */
export function getAssessmentYearForDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  
  // July 1 (month 7) to June 30 of next year is Income Year `year-(year+1)`
  // Before July (months 1-6) is Income Year `(year-1)-year`
  const iyStart = month >= 7 ? year : year - 1;
  const ayStart = iyStart + 1;
  const ayEnd = (ayStart + 1) % 100;
  const ayEndPad = ayEnd < 10 ? `0${ayEnd}` : `${ayEnd}`;
  return `${ayStart}-${ayEndPad}`;
}

/**
 * Formats a date range into a readable string: e.g. "01 Jul 2022 - 30 Jun 2023"
 */
export function formatFriendlyDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  const formatDatePart = (dStr) => {
    const d = new Date(dStr);
    return isNaN(d.getTime())
      ? dStr
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  return `${formatDatePart(startDate)} to ${formatDatePart(endDate)}`;
}


