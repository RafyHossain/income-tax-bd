import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";

import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Info,
  Loader2,
  Percent,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  UserRound,
  TrendingUp,
  Receipt,
  CreditCard,
  Briefcase,
} from "lucide-react";

import TaxCalculationService from "@/services/taxCalculationService";
import TaxpayerProfileService from "@/services/taxpayerProfileService";
import SequentialTaxCalculationDetails from "@/components/tax/SequentialTaxCalculationDetails";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

// helpers

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (value) => {
  const rate = Number(value || 0);

  return `${rate}%`;
};

const formatCategory = (category) => {
  if (!category) {
    return "General";
  }

  return String(category)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const getDetailValue = (
  detail,
  camelCase,
  snakeCase,
) => {
  return (
    detail?.[camelCase] ??
    detail?.[snakeCase]
  );
};

// summary card

const SummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconClassName = "bg-slate-100 text-slate-700",
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

// detail row

const DetailRow = ({
  label,
  value,
  valueClassName = "text-slate-900",
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`text-right text-sm font-medium ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
};

// main component

const TaxCalculation = () => {
  // tax year

  const [taxYears, setTaxYears] = useState([]);
  const [taxYear, setTaxYear] = useState("");

  // taxpayer profile

  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] =
    useState(false);

  // current calculation

  const [calculation, setCalculation] =
    useState(null);

  // loading

  const [loading, setLoading] =
    useState(true);

  const [calculating, setCalculating] =
    useState(false);


  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);

        const [
          taxYearResponse,
          profileResponse,
        ] = await Promise.allSettled([
          TaxCalculationService.getAvailableTaxYears(),
          TaxpayerProfileService.getProfile(),
        ]);

        if (!mounted) {
          return;
        }

        // tax years

        if (
          taxYearResponse.status ===
          "fulfilled"
        ) {
          const response =
            taxYearResponse.value;

          const years = Array.isArray(
            response?.data,
          )
            ? response.data
            : [];

          setTaxYears(years);

          if (years.length > 0) {
            setTaxYear((currentYear) => {
              if (
                currentYear &&
                years.includes(currentYear)
              ) {
                return currentYear;
              }

              return years[0];
            });
          }
        } else {
          console.error(
            "Get Tax Years Error:",
            taxYearResponse.reason,
          );

          toast.error(
            taxYearResponse.reason?.response
              ?.data?.message ||
              taxYearResponse.reason?.message ||
              "Failed to load tax years.",
          );
        }

        // taxpayer profile

        if (
          profileResponse.status ===
          "fulfilled"
        ) {
          const profileData =
            profileResponse.value?.data ||
            null;

          setProfile(profileData);
          setHasProfile(
            Boolean(profileData),
          );
        } else {
          const error =
            profileResponse.reason;

          if (
            error?.response?.status ===
            404
          ) {
            setProfile(null);
            setHasProfile(false);
          } else {
            console.error(
              "Get Profile Error:",
              error,
            );

            toast.error(
              error?.response?.data
                ?.message ||
                "Failed to load taxpayer profile.",
            );
          }
        }
      } catch (error) {
        console.error(
          "Load Tax Calculation Page Error:",
          error,
        );

        if (mounted) {
          toast.error(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Failed to load tax calculation data.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  // calculate tax

  const handleCalculate = async () => {
    if (!taxYear) {
      toast.error(
        "Please select a tax year.",
      );

      return;
    }

    if (!hasProfile) {
      toast.error(
        "Please complete your taxpayer profile first.",
      );

      return;
    }

    try {
      setCalculating(true);

      const response =
        await TaxCalculationService.calculateTax(
          taxYear,
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Tax calculation failed.",
        );
      }

      setCalculation(
        response?.data || null,
      );

      toast.success(
        "Tax calculated successfully.",
      );
    } catch (error) {
      console.error(
        "Calculate Tax Error:",
        error,
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to calculate tax.";

      toast.error(message);

      if (
        message ===
        "Taxpayer profile not found"
      ) {
        setHasProfile(false);
        setProfile(null);
      }
    } finally {
      setCalculating(false);
    }
  };



  // tax year change

  const handleYearChange = (event) => {
    setTaxYear(event.target.value);
    setCalculation(null);
  };

  // reset

  const handleReset = () => {
    setCalculation(null);
    setSelectedCalculation(null);

    if (taxYears.length > 0) {
      setTaxYear(taxYears[0]);
    } else {
      setTaxYear("");
    }
  };

  // normalized current calculation

  const calculationData = useMemo(() => {
    if (!calculation) {
      return null;
    }

    return {
      ...calculation,
      id:
        calculation.id ??
        calculation.calculation_id ??
        calculation.calculationId ??
        null,

      taxYear:
        calculation.taxYear ??
        calculation.tax_year ??
        taxYear,

      category:
        calculation.category ||
        "GENERAL",

      totalIncome:
        calculation.totalIncome ??
        calculation.total_income ??
        0,

      totalDeduction:
        calculation.totalDeduction ??
        calculation.total_deduction ??
        0,

      taxableIncome:
        calculation.taxableIncome ??
        calculation.taxable_income ??
        0,

      disabledChildDependents:
        calculation.disabledChildDependents ??
        calculation.disabled_child_dependents ??
        0,

      disabledChildAdditionalThreshold:
        calculation.disabledChildAdditionalThreshold ??
        calculation.disabled_child_additional_threshold ??
        0,

      taxFreeThreshold:
        calculation.taxFreeThreshold ??
        calculation.tax_free_threshold ??
        0,

      eligibleInvestment:
        calculation.eligibleInvestment ??
        calculation.eligible_investment ??
        0,

      allowableInvestment:
        calculation.allowableInvestment ??
        calculation.allowable_investment ??
        0,

      investmentLimitByIncome:
        calculation.investmentLimitByIncome ??
        calculation.investment_limit_by_income ??
        0,

      investmentBasedRebateLimit:
        calculation.investmentBasedRebateLimit ??
        calculation.investment_based_rebate_limit ??
        0,

      investmentMaximum:
        calculation.investmentMaximum ??
        calculation.investment_maximum ??
        0,

      grossTax:
        calculation.grossTax ??
        calculation.gross_tax ??
        0,

      taxRebate:
        calculation.taxRebate ??
        calculation.tax_rebate ??
        0,

      rebateRate:
        calculation.rebateRate ??
        calculation.rebate_rate ??
        0,

      taxAfterRebate:
        calculation.taxAfterRebate ??
        calculation.tax_after_rebate ??
        Math.max(
          0,
          (calculation.grossTax ?? calculation.gross_tax ?? 0) -
            (calculation.taxRebate ?? calculation.tax_rebate ?? 0)
        ),

      minimumTaxArea:
        calculation.minimumTaxArea ??
        calculation.minimum_tax_area ??
        "OTHER_AREA",

      minimumTaxAreaName:
        calculation.minimumTaxAreaName ??
        calculation.minimum_tax_area_name ??
        null,

      minimumTaxRuleType:
        calculation.minimumTaxRuleType ??
        calculation.minimum_tax_rule_type ??
        (calculation.minimumTaxArea === "NEW_TAXPAYER" || calculation.minimumTaxArea === "REGULAR_TAXPAYER" ? "TAXPAYER_TYPE" : "AREA_BASED"),

      isNewTaxpayer:
        calculation.isNewTaxpayer ??
        Boolean(calculation.is_new_taxpayer),

      minimumTax:
        calculation.minimumTax ??
        calculation.minimum_tax ??
        0,

      minimumTaxApplicable:
        calculation.minimumTaxApplicable ??
        calculation.minimum_tax_applicable ??
        false,

      minimumTaxApplied:
        calculation.minimumTaxApplied ??
        calculation.minimum_tax_applied ??
        false,

      taxLiability:
        calculation.taxLiability ??
        calculation.tax_liability ??
        0,

      salaryIncome:
        calculation.salaryIncome ??
        calculation.salary_income ??
        0,

      salaryExemption:
        calculation.salaryExemption ??
        calculation.salary_exemption ??
        0,

      netTax:
        calculation.netTax ??
        calculation.net_tax ??
        0,

      netWealth:
        calculation.netWealth ??
        calculation.net_wealth ??
        0,

      surchargeRate:
        calculation.surchargeRate ??
        calculation.surcharge_rate ??
        0,

      surchargeAmount:
        calculation.surchargeAmount ??
        calculation.surcharge_amount ??
        0,

      totalTaxPayable:
        calculation.totalTaxPayable ??
        calculation.total_tax_payable ??
        (Number(calculation.taxLiability ?? calculation.tax_liability ?? 0) + Number(calculation.surchargeAmount ?? calculation.surcharge_amount ?? 0)),

      tdsAmount:
        calculation.tdsAmount ??
        calculation.tds_amount ??
        0,

      advanceTaxAmount:
        calculation.advanceTaxAmount ??
        calculation.advance_tax_amount ??
        0,

      totalTaxCredits:
        (Number(calculation.tdsAmount ?? calculation.tds_amount ?? 0)) +
        (Number(calculation.advanceTaxAmount ?? calculation.advance_tax_amount ?? 0)),

      finalPayable: Math.max(
        0,
        Number(
          calculation.finalPayable ??
          calculation.final_payable ??
          (Number(calculation.totalTaxPayable ?? calculation.total_tax_payable ?? 0) -
           (Number(calculation.tdsAmount ?? calculation.tds_amount ?? 0) + Number(calculation.advanceTaxAmount ?? calculation.advance_tax_amount ?? 0)))
        )
      ),

      details: Array.isArray(
        calculation.details,
      )
        ? calculation.details
        : [],
    };
  }, [calculation, taxYear]);

  // loading

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />

          Loading tax calculation...
        </div>
      </div>
    );
  }

  // page

  return (
    <div className="space-y-8">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Calculate Your Income Tax
          </h2>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Calculate your tax and review previous
            calculations.
          </p>
        </div>

        <Link
          to="/dashboard/profile"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <UserRound className="h-4 w-4" />

          View Profile
        </Link>
      </div>

      {/* =================================================
          PROFILE WARNING
      ================================================= */}

      {!hasProfile && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <h2 className="font-semibold text-amber-900">
                Complete your taxpayer profile
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Your taxpayer profile is required
                before calculating tax.
              </p>

              <Link
                to="/dashboard/profile"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 hover:underline"
              >
                Complete Profile

                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          TAX YEAR SELECTOR
      ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileText className="h-4 w-4" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Select Tax Year
                </h2>
              </div>
            </div>
          </div>

          <div className="w-full lg:max-w-xs">
            <label
              htmlFor="tax-year"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Tax Year
            </label>

            <select
              id="tax-year"
              value={taxYear}
              onChange={handleYearChange}
              disabled={
                calculating ||
                taxYears.length === 0
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">
                Select Tax Year
              </option>

              {taxYears.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {formatTaxYearLabel(year)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {taxYears.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Info className="h-4 w-4" />

            No active tax year is available.
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={
              calculating || !taxYear
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />

            Reset
          </button>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={
              calculating ||
              !taxYear ||
              !hasProfile
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />

                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />

                Calculate Tax
              </>
            )}
          </button>
        </div>
      </div>

      {/* =================================================
          CURRENT CALCULATION RESULT
      ================================================= */}

      {calculationData ? (
        <SequentialTaxCalculationDetails
          calculation={calculationData}
          title="Current Tax Calculation Breakdown"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Calculator className="mx-auto h-8 w-8 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            Ready to calculate
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a tax year and calculate your tax.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaxCalculation;