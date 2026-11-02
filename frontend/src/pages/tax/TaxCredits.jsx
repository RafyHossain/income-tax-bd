import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  Receipt,
  FileCheck,
  CalendarDays,
  Save,
  Pencil,
  Trash2,
  TrendingDown,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

import TaxCreditService from "@/services/taxCreditService";
import TaxDeductionService from "@/services/taxDeductionService";
import {
  COMMON_TAX_YEARS,
  formatTaxYearLabel,
  getEarningPeriodForAssessmentYear,
  formatFriendlyDateRange,
} from "@/utils/taxYearUtils";

const defaultInitialYear = "2026-27";

const initialFormData = {
  tax_year: defaultInitialYear,
  tds_amount: "",
  advance_tax_amount: "",
  challan_number: "",
  description: "",
};

const TaxCredits = () => {
  const [taxYears, setTaxYears] = useState(COMMON_TAX_YEARS);
  const [selectedTaxYear, setSelectedTaxYear] = useState(defaultInitialYear);
  const [creditList, setCreditList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingYear, setDeletingYear] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  // Earning period info for selected assessment year
  const earningPeriod = useMemo(() => {
    return getEarningPeriodForAssessmentYear(selectedTaxYear);
  }, [selectedTaxYear]);

  // Fetch available tax years
  const fetchTaxYears = async () => {
    try {
      const response = await TaxDeductionService.getAvailableTaxYears();
      const years = Array.isArray(response?.data) ? response.data : [];
      const normalizedYears = years
        .map((item) => (typeof item === "string" ? item : item?.tax_year))
        .filter(Boolean);

      if (normalizedYears.length > 0) {
        const merged = Array.from(new Set([...normalizedYears, ...COMMON_TAX_YEARS]));
        setTaxYears(merged);
      }
    } catch {
      // Keep COMMON_TAX_YEARS as fallback
    }
  };

  // Fetch user credit records
  const fetchAllCredits = async () => {
    try {
      const response = await TaxCreditService.getMyCredits();
      const data = Array.isArray(response?.data) ? response.data : [];
      setCreditList(data);
      return data;
    } catch (error) {
      console.error("Fetch tax credits error:", error);
      toast.error(error.response?.data?.message || "Failed to load tax credits");
      return [];
    }
  };

  // Load record for the selected tax year
  const loadYearCredit = (year, list = creditList) => {
    const existing = list.find((item) => item.tax_year === year);
    if (existing) {
      setFormData({
        tax_year: existing.tax_year,
        tds_amount: existing.tds_amount != null ? String(existing.tds_amount) : "",
        advance_tax_amount:
          existing.advance_tax_amount != null ? String(existing.advance_tax_amount) : "",
        challan_number: existing.challan_number || "",
        description: existing.description || "",
      });
    } else {
      setFormData({
        tax_year: year,
        tds_amount: "",
        advance_tax_amount: "",
        challan_number: "",
        description: "",
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchTaxYears();
      const credits = await fetchAllCredits();
      loadYearCredit(selectedTaxYear, credits);
      setLoading(false);
    };
    init();
  }, []);

  const handleTaxYearChange = (year) => {
    setSelectedTaxYear(year);
    loadYearCredit(year, creditList);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const tdsNum = Number(formData.tds_amount || 0);
    const advanceNum = Number(formData.advance_tax_amount || 0);

    if (tdsNum < 0 || advanceNum < 0) {
      toast.error("Credit amounts cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        tax_year: selectedTaxYear,
        tds_amount: tdsNum,
        advance_tax_amount: advanceNum,
        challan_number: formData.challan_number.trim() || null,
        description: formData.description.trim() || null,
      };

      const res = await TaxCreditService.saveTaxCredit(payload);
      toast.success(res?.message || "Tax credits saved successfully!");

      const updatedList = await fetchAllCredits();
      loadYearCredit(selectedTaxYear, updatedList);
    } catch (error) {
      console.error("Save tax credit error:", error);
      toast.error(error.response?.data?.message || "Failed to save tax credits");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (year) => {
    toast(
      (t) => (
        <div className="w-[320px]">
          <p className="text-sm font-medium text-slate-900">
            Reset tax credits for {year}?
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This will clear recorded TDS and advance tax credits for this tax year.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  setDeletingYear(year);
                  await TaxCreditService.deleteTaxCredit(year);
                  toast.success(`Tax credits for ${year} reset successfully.`);
                  const updated = await fetchAllCredits();
                  if (selectedTaxYear === year) {
                    loadYearCredit(year, updated);
                  }
                } catch (error) {
                  toast.error(
                    error.response?.data?.message || "Failed to delete tax credit"
                  );
                } finally {
                  setDeletingYear(null);
                }
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  const currentTds = Number(formData.tds_amount || 0);
  const currentAdvance = Number(formData.advance_tax_amount || 0);
  const currentTotalCredits = currentTds + currentAdvance;

  const formatAmount = (val) => {
    return Number(val || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading tax credits...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tax Credits
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage Tax Deducted at Source (TDS) and Advance Tax Paid by Assessment Year.
          </p>
        </div>

        {/* Tax Year Selector */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-medium text-slate-500">Tax Year:</span>
          <select
            value={selectedTaxYear}
            onChange={(e) => handleTaxYearChange(e.target.value)}
            aria-label="Select Tax Year"
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
          >
            {taxYears.map((year) => (
              <option key={year} value={year}>
                {formatTaxYearLabel(year)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* TDS Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">TDS Credit ({selectedTaxYear})</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                BDT {formatAmount(currentTds)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tax Deducted at Source
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Receipt className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Advance Tax Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Advance Tax Paid ({selectedTaxYear})</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                BDT {formatAmount(currentAdvance)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Advance Income Tax (AIT)
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Credits Card */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Total Tax Credits ({selectedTaxYear})
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                BDT {formatAmount(currentTotalCredits)}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Deducted from Net Tax Payable</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Coins className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Credit Set Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Set Tax Credits for Assessment Year {selectedTaxYear}
            </h3>
            {earningPeriod && (
              <p className="mt-0.5 text-xs text-slate-500">
                Income Year: <strong className="text-slate-700">{earningPeriod.incomeYear}</strong> ({formatFriendlyDateRange(earningPeriod.startDate, earningPeriod.endDate)})
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <Info className="h-3.5 w-3.5" />
            Applied in {selectedTaxYear} Tax Calculation
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* TDS Credit Input */}
            <div>
              <label
                htmlFor="tds_amount"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Tax Deducted at Source (TDS Credit)
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  BDT
                </span>
                <input
                  id="tds_amount"
                  name="tds_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tds_amount}
                  onChange={handleInputChange}
                  disabled={saving}
                  placeholder="0.00"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                TDS deducted by employer, banks (profit/interest), contracts, or dividends.
              </p>
            </div>

            {/* Advance Tax Paid Input */}
            <div>
              <label
                htmlFor="advance_tax_amount"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Advance Tax Paid (Advance Credit)
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  BDT
                </span>
                <input
                  id="advance_tax_amount"
                  name="advance_tax_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.advance_tax_amount}
                  onChange={handleInputChange}
                  disabled={saving}
                  placeholder="0.00"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                Advance Income Tax (AIT) paid directly via treasury challan or banking.
              </p>
            </div>

            {/* Challan / Reference Number */}
            <div>
              <label
                htmlFor="challan_number"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Challan / AIT Reference Number <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="challan_number"
                name="challan_number"
                type="text"
                value={formData.challan_number}
                onChange={handleInputChange}
                disabled={saving}
                placeholder="e.g. TR-2023-CH99482"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
              />
            </div>

            {/* Description / Source Notes */}
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Credit Source Notes <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="description"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleInputChange}
                disabled={saving}
                placeholder="e.g. Salary TDS Certificate and Advance Tax Challan"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="text-xs text-slate-500">
              Tax credits are linked to <strong className="text-slate-700">{selectedTaxYear}</strong> calculations.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : `Save Credits for ${selectedTaxYear}`}
            </button>
          </div>
        </form>
      </div>

      {/* Recorded Tax Credits Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Coins className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                All Recorded Tax Credit Years
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                TDS and Advance Tax credits configured across all Assessment Years.
              </p>
            </div>
          </div>
        </div>

        {creditList.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Coins className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-600">No tax credits recorded yet.</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Select a tax year above and enter TDS or Advance Tax amounts to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">SL</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Tax Year (Assessment Year)</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">TDS Credit</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Advance Tax Paid</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Total Tax Credits</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Reference / Notes</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>

              <tbody>
                {creditList.map((item, idx) => {
                  const isCurrentSelected = item.tax_year === selectedTaxYear;

                  return (
                    <tr
                      key={item.id || item.tax_year}
                      className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 ${
                        isCurrentSelected ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            AY {item.tax_year}
                          </span>
                          {isCurrentSelected && (
                            <span className="text-[11px] font-medium text-emerald-600">
                              (Active)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        BDT {formatAmount(item.tds_amount)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        BDT {formatAmount(item.advance_tax_amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-emerald-700">
                          BDT {formatAmount(item.total_tax_credits || Number(item.tds_amount || 0) + Number(item.advance_tax_amount || 0))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div className="max-w-xs truncate">
                          {item.challan_number && (
                            <span className="font-mono font-medium text-slate-700 mr-1">
                              [{item.challan_number}]
                            </span>
                          )}
                          {item.description || (!item.challan_number && "-")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit / Select Button */}
                          <button
                            type="button"
                            onClick={() => handleTaxYearChange(item.tax_year)}
                            title="Edit credits for this year"
                            aria-label="Edit credits for this year"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Reset / Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.tax_year)}
                            disabled={deletingYear === item.tax_year}
                            title="Reset credits for this year"
                            aria-label="Reset credits for this year"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxCredits;
