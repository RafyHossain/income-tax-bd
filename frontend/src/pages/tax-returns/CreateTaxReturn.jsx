import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import TaxCalculationService from "@/services/taxCalculationService";
import TaxReturnService from "@/services/taxReturnService";
import TaxpayerProfileService from "@/services/taxpayerProfileService";
import { getIncomeYearFromAssessmentYear } from "@/utils/taxYearUtils";
import {
  ArrowLeft,
  FileCheck,
  Loader2,
  AlertCircle,
  Calculator,
} from "lucide-react";

const formatMoney = (val) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const CreateTaxReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const urlCalcId = searchParams.get("calculationId");

  const [calculations, setCalculations] = useState([]);
  const [loadingCalcs, setLoadingCalcs] = useState(true);
  const [errorCalcs, setErrorCalcs] = useState("");

  const [selectedCalcId, setSelectedCalcId] = useState(
    urlCalcId ? Number(urlCalcId) : null
  );
  const [detailedCalc, setDetailedCalc] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [profile, setProfile] = useState(null);
  const [generating, setGenerating] = useState(false);

  // 1. Fetch available calculations
  useEffect(() => {
    const fetchCalculations = async () => {
      setLoadingCalcs(true);
      setErrorCalcs("");
      try {
        const res = await TaxCalculationService.getCalculations();
        if (res.success && Array.isArray(res.data)) {
          setCalculations(res.data);
          if (res.data.length > 0) {
            if (urlCalcId) {
              const matched = res.data.find(
                (c) => String(c.id) === String(urlCalcId)
              );
              setSelectedCalcId(matched ? matched.id : res.data[0].id);
            } else {
              setSelectedCalcId(res.data[0].id);
            }
          }
        } else {
          setCalculations([]);
        }
      } catch (err) {
        console.error("fetchCalculations error:", err);
        setErrorCalcs(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load tax calculations."
        );
      } finally {
        setLoadingCalcs(false);
      }
    };

    fetchCalculations();
  }, [urlCalcId]);

  // 2. Fetch taxpayer profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await TaxpayerProfileService.getProfile();
        if (res.success && res.data) {
          setProfile(Array.isArray(res.data) ? res.data[0] : res.data);
        }
      } catch (err) {
        console.error("fetchProfile error:", err);
      }
    };
    fetchProfile();
  }, []);

  // 3. When selectedCalcId changes, fetch full calculation details
  useEffect(() => {
    if (!selectedCalcId) {
      setDetailedCalc(null);
      return;
    }

    let isMounted = true;
    const fetchCalcDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await TaxCalculationService.getCalculationById(selectedCalcId);
        if (isMounted) {
          if (res?.success && res.data) {
            setDetailedCalc(res.data);
          } else {
            const found = calculations.find((c) => c.id === selectedCalcId);
            setDetailedCalc(found || null);
          }
        }
      } catch (err) {
        console.error("Error fetching calculation details:", err);
        if (isMounted) {
          const found = calculations.find((c) => c.id === selectedCalcId);
          setDetailedCalc(found || null);
        }
      } finally {
        if (isMounted) {
          setLoadingDetail(false);
        }
      }
    };

    fetchCalcDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedCalcId, calculations]);

  // Active calculation snapshot
  const activeCalc =
    detailedCalc || calculations.find((c) => c.id === selectedCalcId) || null;

  // Extracted Authoritative Fields
  const taxpayerName =
    profile?.full_name ||
    profile?.taxpayer_name ||
    user?.full_name ||
    "Taxpayer";

  const tinNumber =
    profile?.tin_number ||
    profile?.tin ||
    "Not Provided";

  const assessmentYear =
    activeCalc?.tax_year ||
    activeCalc?.taxYear ||
    "2026-27";

  const taxableIncome = Number(
    activeCalc?.taxable_income ?? activeCalc?.taxableIncome ?? 0
  );

  const finalPayable = Math.max(
    0,
    Number(activeCalc?.final_payable ?? activeCalc?.finalPayable ?? 0)
  );

  // Return Creation Handler (Preserves Option B Behavior)
  const handleCreateTaxReturn = async () => {
    if (!selectedCalcId) {
      toast.error("Please select a tax calculation first.");
      return;
    }

    setGenerating(true);

    try {
      const res = await TaxReturnService.getOrCreateReturnForCalculation(
        selectedCalcId,
        "INDIVIDUAL_REGULAR"
      );

      if (res.success && res.data?.id) {
        toast.success("New tax return created successfully!");
        navigate(`/dashboard/tax-returns/${res.data.id}`);
      } else {
        toast.error(res.message || "Failed to create tax return.");
      }
    } catch (err) {
      console.error("handleCreateTaxReturn error:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while creating tax return.";
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-0 space-y-6">
      {/* A. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Create Tax Return
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Review your information before creating your tax return.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition self-start sm:self-auto cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Content Body */}
      {loadingCalcs ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <p className="mt-2 text-xs font-medium text-slate-600">
            Loading tax calculation...
          </p>
        </div>
      ) : errorCalcs ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center shadow-xs">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="text-sm font-bold text-red-900">Failed to Load Calculation</h3>
          <p className="mt-1 text-xs text-red-700">{errorCalcs}</p>
        </div>
      ) : calculations.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
            <Calculator className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Tax Calculations Available</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Please perform a tax calculation before creating a return.
          </p>
          <Link
            to="/dashboard/tax-calculation"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Calculator className="h-4 w-4" />
            <span>Go to Tax Calculation</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Calculation Switcher (if multiple exist) */}
          {calculations.length > 1 && (
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <span className="font-medium text-slate-500">Selected Calculation:</span>
              <select
                value={selectedCalcId || ""}
                onChange={(e) => setSelectedCalcId(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {calculations.map((calc) => (
                  <option key={calc.id} value={calc.id}>
                    Calc #{calc.id} — AY {calc.tax_year || calc.taxYear} (Income Year {getIncomeYearFromAssessmentYear(calc.tax_year || calc.taxYear)}) — Payable: BDT {formatMoney(calc.final_payable || calc.finalPayable || 0)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingDetail ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mr-2" />
              <span className="text-xs font-medium text-slate-600">Loading details...</span>
            </div>
          ) : activeCalc ? (
            <div className="space-y-5">
              {/* B. Taxpayer Information Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
                  Taxpayer Information
                </h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Taxpayer Name</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                      {taxpayerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">e-TIN Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      {tinNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assessment Year</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      AY {assessmentYear}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Income Year {getIncomeYearFromAssessmentYear(assessmentYear)}
                    </span>
                  </div>
                </div>
              </div>

              {/* C. Tax Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
                  Tax Summary
                </h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-slate-500 block text-[11px] font-medium">
                      Taxable Income
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-base mt-1 block">
                      BDT {formatMoney(taxableIncome)}
                    </span>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <span className="text-emerald-800 block text-[11px] font-bold uppercase tracking-wider">
                      Final Net Tax Payable
                    </span>
                    <span className="font-mono font-extrabold text-emerald-950 text-base mt-1 block">
                      BDT {formatMoney(finalPayable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* D. Primary Action */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateTaxReturn}
                  disabled={generating || !selectedCalcId}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs shadow-emerald-600/30 hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Tax Return...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      <span>Create Tax Return</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CreateTaxReturn;
