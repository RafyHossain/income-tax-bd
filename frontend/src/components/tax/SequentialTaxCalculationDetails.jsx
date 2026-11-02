import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import TaxReturnService from "@/services/taxReturnService";
import { getIncomeYearFromAssessmentYear } from "@/utils/taxYearUtils";
import {
  ArrowRight,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet,
  Loader2,
  Receipt,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";

// ============================================================================
// HELPERS
// ============================================================================

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (value) => {
  return `${Number(value || 0)}%`;
};

const formatCategory = (category) => {
  if (!category) return "General";
  return String(category)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getDetailValue = (detail, camelCase, snakeCase) => {
  return detail?.[camelCase] ?? detail?.[snakeCase];
};

// ============================================================================
// MAIN COMPONENT: MINIMAL, CLEAN & USER-FRIENDLY TAX CALCULATION DETAILS
// ============================================================================

const SequentialTaxCalculationDetails = ({
  calculation,
  onClose,
  showCloseButton = false,
  title = "Tax Calculation Summary",
}) => {
  const navigate = useNavigate();

  const handleProceedToFiling = () => {
    const calcId =
      calculation?.id ||
      calculation?.calculationId ||
      calculation?.taxCalculationId;
    if (!calcId) {
      toast.error("Tax calculation reference not found.");
      return;
    }

    navigate(`/dashboard/tax-returns/create?calculationId=${calcId}`);
  };

  const handleReviewReturn = handleProceedToFiling;

  // Normalize calculation data safely
  const data = useMemo(() => {
    if (!calculation) return null;

    const taxYear = calculation.taxYear ?? calculation.tax_year ?? "N/A";
    const category = calculation.category || "GENERAL";
    const totalIncome = Number(
      calculation.totalIncome ?? calculation.total_income ?? 0
    );
    const salaryIncome = Number(
      calculation.salaryIncome ?? calculation.salary_income ?? 0
    );
    const salaryExemption = Number(
      calculation.salaryExemption ?? calculation.salary_exemption ?? 0
    );
    const housePropertyIncome = Number(
      calculation.housePropertyIncome ?? calculation.house_property_income ?? 0
    );
    const businessIncome = Number(
      calculation.businessIncome ?? calculation.business_income ?? 0
    );
    const agricultureIncome = Number(
      calculation.agricultureIncome ?? calculation.agriculture_income ?? 0
    );
    const agricultureDeduction = Number(
      calculation.agricultureDeduction ?? calculation.agriculture_deduction ?? 0
    );
    const totalDeductionRaw = Number(
      calculation.totalDeduction ?? calculation.total_deduction ?? 0
    );

    // Explicit breakdown fields from API response if present
    const explicitHpDeduction = Number(
      calculation.housePropertyDeduction ??
        calculation.house_property_deduction ??
        0
    );
    const explicitBusinessExpense = Number(
      calculation.totalDeductibleExpense ??
        calculation.total_deductible_expense ??
        0
    );

    // Resolve House Property Repair Allowance:
    // If explicitly provided by API, use it.
    // If missing/zero in historical record but rental income exists, apply statutory 25% residential repair allowance.
    let housePropertyRepairAllowance = explicitHpDeduction;
    if (housePropertyRepairAllowance === 0 && housePropertyIncome > 0) {
      const statutoryHpAllowance = Math.round(housePropertyIncome * 0.25 * 100) / 100;
      if (totalDeductionRaw >= salaryExemption + statutoryHpAllowance) {
        housePropertyRepairAllowance = statutoryHpAllowance;
      }
    }

    // Resolve Deductible Business Expenses:
    // 1. If explicitBusinessExpense is provided and does not conflate HP repair
    // 2. If explicitBusinessExpense was set by backend historical fallback (totalDeductionRaw - salaryExemption) which bundled HP repair, unbundle it
    // 3. Otherwise if totalDeductionRaw has remaining amount beyond salary, HP repair, and agriculture deduction
    let totalDeductibleExpense = 0;
    if (explicitBusinessExpense > 0) {
      if (
        housePropertyRepairAllowance > 0 &&
        Math.abs(explicitBusinessExpense + salaryExemption - totalDeductionRaw) < 0.01
      ) {
        // Backend historical fallback bundled HP repair into business expenses -> unbundle cleanly
        totalDeductibleExpense = Math.max(0, explicitBusinessExpense - housePropertyRepairAllowance);
      } else {
        totalDeductibleExpense = explicitBusinessExpense;
      }
    } else if (totalDeductionRaw > 0) {
      const knownDeductions = salaryExemption + housePropertyRepairAllowance + agricultureDeduction;
      if (businessIncome > 0 && totalDeductionRaw > knownDeductions) {
        totalDeductibleExpense = totalDeductionRaw - knownDeductions;
      }
    }

    const totalDeduction =
      totalDeductionRaw > 0
        ? totalDeductionRaw
        : salaryExemption + totalDeductibleExpense + housePropertyRepairAllowance + agricultureDeduction;
    const taxableIncome = Number(
      calculation.taxableIncome ??
        calculation.taxable_income ??
        Math.max(0, totalIncome - totalDeduction)
    );

    const maxSalaryCap = [
      "2025-26",
      "2026-27",
      "2025-2026",
      "2026-2027",
    ].includes(String(taxYear))
      ? 500000
      : 450000;
    const oneThirdSalary = salaryIncome > 0 ? salaryIncome / 3 : 0;
    const hasSalary = salaryIncome > 0;
    const isSalaryCapApplied = hasSalary && oneThirdSalary > maxSalaryCap;
    const taxableSalary = Math.max(0, salaryIncome - salaryExemption);

    const taxFreeThreshold = Number(
      calculation.taxFreeThreshold ?? calculation.tax_free_threshold ?? 0
    );
    const disabledChildDependents = Number(
      calculation.disabledChildDependents ??
        calculation.disabled_child_dependents ??
        0
    );
    const disabledChildAdditionalThreshold = Number(
      calculation.disabledChildAdditionalThreshold ??
        calculation.disabled_child_additional_threshold ??
        0
    );
    const baseThreshold = Math.max(
      0,
      taxFreeThreshold - disabledChildAdditionalThreshold
    );

    const eligibleInvestment = Number(
      calculation.eligibleInvestment ??
        calculation.eligible_investment ??
        calculation.totalInvestment ??
        calculation.total_investment ??
        0
    );
    const allowableInvestment = Number(
      calculation.allowableInvestment ??
        calculation.allowable_investment ??
        eligibleInvestment
    );
    const rebateRate = Number(
      calculation.rebateRate ?? calculation.rebate_rate ?? 0
    );
    const investmentBasedRebateLimit = allowableInvestment * 0.15;
    const investmentLimitByIncome = taxableIncome * 0.03;
    const investmentMaximum = 1000000;

    const grossTax = Number(
      calculation.grossTax ?? calculation.gross_tax ?? 0
    );
    const taxRebate = Number(
      calculation.taxRebate ?? calculation.tax_rebate ?? 0
    );
    const taxAfterRebate = Number(
      calculation.taxAfterRebate ??
        calculation.tax_after_rebate ??
        Math.max(0, grossTax - taxRebate)
    );

    const minimumTax = Number(
      calculation.minimumTax ?? calculation.minimum_tax ?? 0
    );
    const minimumTaxArea =
      calculation.minimumTaxArea ??
      calculation.minimum_tax_area ??
      "OTHER_AREA";
    const minimumTaxAreaName =
      calculation.minimumTaxAreaName ??
      calculation.minimum_tax_area_name ??
      null;
    const minimumTaxRuleType =
      calculation.minimumTaxRuleType ??
      calculation.minimum_tax_rule_type ??
      "AREA_BASED";
    const isNewTaxpayer =
      calculation.isNewTaxpayer ?? Boolean(calculation.is_new_taxpayer);

    const minimumTaxApplicable =
      calculation.minimumTaxApplicable ??
      calculation.minimum_tax_applicable ??
      taxableIncome > taxFreeThreshold;
    const minimumTaxApplied = Boolean(
      calculation.minimumTaxApplied ??
        calculation.minimum_tax_applied ??
        (minimumTaxApplicable && taxAfterRebate < minimumTax)
    );

    const taxLiability = Number(
      calculation.taxLiability ??
        calculation.tax_liability ??
        (minimumTaxApplicable ? Math.max(taxAfterRebate, minimumTax) : 0)
    );

    const netWealth = Number(
      calculation.netWealth ?? calculation.net_wealth ?? 0
    );
    const surchargeRate = Number(
      calculation.surchargeRate ?? calculation.surcharge_rate ?? 0
    );
    const surchargeAmount = Number(
      calculation.surchargeAmount ?? calculation.surcharge_amount ?? 0
    );
    const totalTaxPayable = Number(
      calculation.totalTaxPayable ??
        calculation.total_tax_payable ??
        taxLiability + surchargeAmount
    );

    const tdsAmount = Number(
      calculation.tdsAmount ?? calculation.tds_amount ?? 0
    );
    const advanceTaxAmount = Number(
      calculation.advanceTaxAmount ?? calculation.advance_tax_amount ?? 0
    );
    const totalTaxCredits = Number(
      calculation.totalTaxCredits ??
        calculation.total_tax_credits ??
        tdsAmount + advanceTaxAmount
    );
    const finalPayable = Number(
      calculation.finalPayable ??
        calculation.final_payable ??
        totalTaxPayable - totalTaxCredits
    );

    const details = Array.isArray(calculation.details)
      ? calculation.details
      : [];

    return {
      taxYear,
      category,
      totalIncome,
      salaryIncome,
      salaryExemption,
      housePropertyIncome,
      housePropertyRepairAllowance,
      housePropertyDeduction: housePropertyRepairAllowance,
      businessIncome,
      totalDeductibleExpense,
      agricultureIncome,
      agricultureDeduction,
      totalDeduction,
      taxableIncome,
      maxSalaryCap,
      oneThirdSalary,
      hasSalary,
      isSalaryCapApplied,
      taxableSalary,
      baseThreshold,
      taxFreeThreshold,
      disabledChildDependents,
      disabledChildAdditionalThreshold,
      eligibleInvestment,
      allowableInvestment,
      rebateRate,
      investmentBasedRebateLimit,
      investmentLimitByIncome,
      investmentMaximum,
      grossTax,
      taxRebate,
      taxAfterRebate,
      minimumTax,
      minimumTaxArea,
      minimumTaxAreaName,
      minimumTaxRuleType,
      isNewTaxpayer,
      minimumTaxApplicable,
      minimumTaxApplied,
      taxLiability,
      netWealth,
      surchargeRate,
      surchargeAmount,
      totalTaxPayable,
      tdsAmount,
      advanceTaxAmount,
      totalTaxCredits,
      finalPayable,
      details,
    };
  }, [calculation]);

  // Normalized sequential slabs list to prevent duplicate 0% threshold slabs
  const slabsToRender = useMemo(() => {
    if (!data) return [];
    if (!data.details || data.details.length === 0) {
      return [
        {
          key: "slab-1",
          slabOrder: 1,
          label: "Slab 1 (Tax-Free)",
          rangeText: `BDT 0.00 – BDT ${formatMoney(data.taxFreeThreshold)}`,
          rateText: "0%",
          taxable: Math.min(data.taxableIncome, data.taxFreeThreshold),
          tax: 0,
        },
      ];
    }

    const firstRate = Number(
      getDetailValue(data.details[0], "taxRate", "tax_rate") || 0
    );

    if (firstRate === 0) {
      return data.details.map((slab, idx) => {
        const minInc = Number(
          getDetailValue(slab, "minimumIncome", "minimum_income") || 0
        );
        const maxInc = getDetailValue(slab, "maximumIncome", "maximum_income");
        const rate = Number(
          getDetailValue(slab, "taxRate", "tax_rate") || 0
        );
        const taxable = Number(
          getDetailValue(slab, "taxableAmount", "taxable_amount") || 0
        );
        const calcTax = Number(
          getDetailValue(slab, "calculatedTax", "calculated_tax") || 0
        );
        const slabOrder = Number(
          getDetailValue(slab, "slabOrder", "slab_order") || idx + 1
        );
        const isTaxFree = slabOrder === 1 || rate === 0;
        const displayMin =
          !isTaxFree && minInc > 0 && minInc % 1000 === 0
            ? minInc + 1
            : minInc;

        return {
          key: slab.id || `slab-${slabOrder}`,
          slabOrder,
          label: isTaxFree ? `Slab ${slabOrder} (Tax-Free)` : `Slab ${slabOrder}`,
          rangeText:
            maxInc === null || maxInc === "" || maxInc === undefined
              ? `BDT ${formatMoney(displayMin)} – Remaining Above`
              : `BDT ${formatMoney(displayMin)} – BDT ${formatMoney(maxInc)}`,
          rateText: formatPercent(rate),
          taxable,
          tax: calcTax,
        };
      });
    }

    const zeroSlab = {
      key: "slab-1",
      slabOrder: 1,
      label: "Slab 1 (Tax-Free)",
      rangeText: `BDT 0.00 – BDT ${formatMoney(data.taxFreeThreshold)}`,
      rateText: "0%",
      taxable: Math.min(data.taxableIncome, data.taxFreeThreshold),
      tax: 0,
    };

    const progressiveSlabs = data.details.map((slab, idx) => {
      const minInc = Number(
        getDetailValue(slab, "minimumIncome", "minimum_income") || 0
      );
      const maxInc = getDetailValue(slab, "maximumIncome", "maximum_income");
      const rate = Number(
        getDetailValue(slab, "taxRate", "tax_rate") || 0
      );
      const taxable = Number(
        getDetailValue(slab, "taxableAmount", "taxable_amount") || 0
      );
      const calcTax = Number(
        getDetailValue(slab, "calculatedTax", "calculated_tax") || 0
      );
      const slabOrder = idx + 2;
      const displayMin =
        minInc > 0 && minInc % 1000 === 0 ? minInc + 1 : minInc;

      return {
        key: slab.id || `slab-${slabOrder}`,
        slabOrder,
        label: `Slab ${slabOrder}`,
        rangeText:
          maxInc === null || maxInc === "" || maxInc === undefined
            ? `BDT ${formatMoney(displayMin)} – Remaining Above`
            : `BDT ${formatMoney(displayMin)} – BDT ${formatMoney(maxInc)}`,
        rateText: formatPercent(rate),
        taxable,
        tax: calcTax,
      };
    });

    return [zeroSlab, ...progressiveSlabs];
  }, [data]);

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* ====================================================================
          TOP SUMMARY BAR & ACTIONS
      ==================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                AY {data.taxYear}
              </span>
              <span className="text-xs text-slate-500">
                (Income Year {getIncomeYearFromAssessmentYear(data.taxYear)})
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-600">
                Category: {formatCategory(data.category)}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleProceedToFiling}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Proceed to Tax Filing
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* 4 Essential Summary Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="text-xs font-medium text-slate-500">Gross Income</p>
            <p className="mt-1 text-base font-bold text-slate-900">
              BDT {formatMoney(data.totalIncome)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="text-xs font-medium text-slate-500">Allowable Deductions</p>
            <p className="mt-1 text-base font-bold text-slate-900">
              − BDT {formatMoney(data.totalDeduction)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="text-xs font-medium text-slate-500">Taxable Income</p>
            <p className="mt-1 text-base font-bold text-slate-900">
              BDT {formatMoney(data.taxableIncome)}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-3.5">
            <p className="text-xs font-medium text-emerald-800">Final Tax Payable</p>
            <p className="mt-1 text-base font-bold text-emerald-950">
              {Number(data.finalPayable) < 0
                ? `Refund BDT ${formatMoney(Math.abs(data.finalPayable))}`
                : `BDT ${formatMoney(data.finalPayable)}`}
            </p>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2-COLUMN CLEAN BREAKDOWN: DEDUCTIONS & PROGRESSIVE SLABS
      ==================================================================== */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: Income & Allowable Deductions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">
            Income & Deductions Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Reconciliation of declared gross receipts to net taxable income
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3.5 py-2.5 font-medium text-slate-700">
                    Gross Income (All Heads)
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900">
                    BDT {formatMoney(data.totalIncome)}
                  </td>
                </tr>

                {data.salaryExemption > 0 && (
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      Less: Statutory Salary Exemption
                      {data.hasSalary && (
                        <span className="block text-[11px] text-slate-400">
                          (Gross Salary: BDT {formatMoney(data.salaryIncome)})
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">
                      − BDT {formatMoney(data.salaryExemption)}
                    </td>
                  </tr>
                )}

                {data.totalDeductibleExpense > 0 && (
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      Less: Deductible Business Expenses
                      {data.businessIncome > 0 && (
                        <span className="block text-[11px] text-slate-400">
                          (Gross Business Income: BDT {formatMoney(data.businessIncome)})
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">
                      − BDT {formatMoney(data.totalDeductibleExpense)}
                    </td>
                  </tr>
                )}

                {data.housePropertyRepairAllowance > 0 && (
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      Less: House Property Repair Allowance
                      {data.housePropertyIncome > 0 && (
                        <span className="block text-[11px] text-slate-400">
                          (Statutory 25% on Rental Income: BDT {formatMoney(data.housePropertyIncome)})
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">
                      − BDT {formatMoney(data.housePropertyRepairAllowance)}
                    </td>
                  </tr>
                )}

                {data.agricultureDeduction > 0 && (
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      Less: Agricultural Production Cost / Allowance
                      {data.agricultureIncome > 0 && (
                        <span className="block text-[11px] text-slate-400">
                          (Gross Agriculture Income: BDT {formatMoney(data.agricultureIncome)})
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">
                      − BDT {formatMoney(data.agricultureDeduction)}
                    </td>
                  </tr>
                )}

                {data.totalDeduction > 0 &&
                  data.salaryExemption === 0 &&
                  data.totalDeductibleExpense === 0 &&
                  data.housePropertyRepairAllowance === 0 &&
                  data.agricultureDeduction === 0 && (
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-600">
                        Less: Allowable Deductions & Exemptions
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">
                        − BDT {formatMoney(data.totalDeduction)}
                      </td>
                    </tr>
                  )}

                <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                  <td className="px-3.5 py-2.5 text-slate-800">Total Deductions</td>
                  <td className="px-3.5 py-2.5 text-right text-slate-900">
                    − BDT {formatMoney(data.totalDeduction)}
                  </td>
                </tr>

                <tr className="bg-emerald-50/40 font-bold border-t border-emerald-200 text-slate-900">
                  <td className="px-3.5 py-3">Net Taxable Income</td>
                  <td className="px-3.5 py-3 text-right text-sm">
                    BDT {formatMoney(data.taxableIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-600">
            <span>Tax-Free Exemption Threshold:</span>
            <span className="font-semibold text-slate-800">
              BDT {formatMoney(data.taxFreeThreshold)}
            </span>
          </div>
        </div>

        {/* Right: Progressive Tax Slabs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">
            Progressive Tax Slabs Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Graduated tax rates applied progressively to taxable income
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="px-3.5 py-2 text-left">Slab</th>
                  <th className="px-3.5 py-2 text-left">Bracket</th>
                  <th className="px-3.5 py-2 text-right">Rate</th>
                  <th className="px-3.5 py-2 text-right">Taxable</th>
                  <th className="px-3.5 py-2 text-right">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slabsToRender.map((slab) => (
                  <tr key={slab.key} className="hover:bg-slate-50/40">
                    <td className="px-3.5 py-2 font-medium text-slate-900">
                      {slab.label}
                    </td>
                    <td className="px-3.5 py-2 text-slate-500">
                      {slab.rangeText}
                    </td>
                    <td className="px-3.5 py-2 text-right font-medium text-slate-700">
                      {slab.rateText}
                    </td>
                    <td className="px-3.5 py-2 text-right text-slate-700">
                      BDT {formatMoney(slab.taxable)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-semibold text-slate-900">
                      BDT {formatMoney(slab.tax)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/70 font-bold">
                  <td colSpan={4} className="px-3.5 py-2.5 text-right text-slate-800">
                    Gross Tax:
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-slate-900">
                    BDT {formatMoney(data.grossTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAX CREDITS, MINIMUM TAX & FINAL SETTLEMENT
      ==================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900">
          Tax Settlement & Net Payable
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Application of rebates, minimum tax rules, and prepaid withholding tax credits
        </p>

        <div className={`mt-4 grid grid-cols-2 gap-3 ${Number(data.surchargeAmount) > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-[11px] font-medium text-slate-500">Gross Tax</span>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              BDT {formatMoney(data.grossTax)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-[11px] font-medium text-slate-500">Tax Rebate</span>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              − BDT {formatMoney(data.taxRebate)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-[11px] font-medium text-slate-500">
              Minimum Tax Floor
              {data.minimumTaxAreaName ? ` (${data.minimumTaxAreaName})` : ""}
            </span>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {data.minimumTaxApplicable
                ? `BDT ${formatMoney(data.minimumTax)}`
                : "Exempt (৳0.00)"}
            </p>
            <span className="text-[10px] text-slate-400">
              {!data.minimumTaxApplicable
                ? "Taxable income within tax-free limit"
                : data.minimumTaxApplied
                ? "Floor Applied (Overrides lower slab tax)"
                : "Satisfied by progressive tax"}
            </span>
          </div>

          {Number(data.surchargeAmount) > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <span className="text-[11px] font-medium text-amber-800">
                Wealth Surcharge ({formatPercent(data.surchargeRate)})
              </span>
              <p className="mt-0.5 text-sm font-bold text-amber-950">
                + BDT {formatMoney(data.surchargeAmount)}
              </p>
              <span className="text-[10px] text-amber-700">
                Net Wealth: BDT {formatMoney(data.netWealth)}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-[11px] font-medium text-slate-500">Prepaid Tax (TDS/AIT)</span>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              − BDT {formatMoney(data.totalTaxCredits)}
            </p>
          </div>
        </div>

        {Number(data.surchargeAmount) === 0 && Number(data.netWealth) > 0 && (
          <div className="mt-2.5 flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-500 rounded-lg bg-slate-50 border border-slate-100">
            <span>Declared Net Wealth: <strong>BDT {formatMoney(data.netWealth)}</strong></span>
            <span>Wealth Surcharge: <strong>0%</strong> (Below BDT 4 Crore threshold)</span>
          </div>
        )}

        {/* Clean Final Callout */}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900">
                Calculation Completed & Ready for Review
              </p>
              <p className="text-xs text-emerald-700">
                Net Tax Payable:{" "}
                <strong className="text-emerald-950 font-bold">
                  BDT {formatMoney(data.finalPayable)}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToFiling}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Proceed to Tax Filing</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SequentialTaxCalculationDetails;
