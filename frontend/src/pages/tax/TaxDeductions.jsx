import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  RefreshCw,
  TrendingUp,
  Wallet,
  CalendarDays,
  CircleDollarSign,
} from "lucide-react";
import toast from "react-hot-toast";

import TaxDeductionService from "@/services/taxDeductionService";
import {
  COMMON_TAX_YEARS,
  formatTaxYearLabel,
  getEarningPeriodForAssessmentYear,
  getAssessmentYearForDate,
  formatFriendlyDateRange,
} from "@/utils/taxYearUtils";

// helpers

const formatAmount = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


const TaxDeductions = () => {
  // available tax years

  const [taxYears, setTaxYears] = useState([]);

  const [taxYear, setTaxYear] = useState("");

  const [yearsLoading, setYearsLoading] = useState(true);

  // investment rules

  const [rules, setRules] = useState([]);

  const [rulesLoading, setRulesLoading] = useState(false);

  // user investments

  const [investments, setInvestments] = useState([]);

  const [totalInvestment, setTotalInvestment] = useState(0);

  const [investmentsLoading, setInvestmentsLoading] = useState(false);

  // form

  const [showForm, setShowForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [editingInvestmentId, setEditingInvestmentId] = useState(null);

  const [deletingInvestmentId, setDeletingInvestmentId] = useState(null);

  const [formData, setFormData] = useState({
    tax_year: "",
    deduction_code: "",
    amount: "",
    description: "",
    deduction_date: "",
  });

  // Computed earning period for the currently selected tax year in form
  const earningPeriod = useMemo(() => {
    return getEarningPeriodForAssessmentYear(formData.tax_year);
  }, [formData.tax_year]);

  // selected rule

  const selectedRule = useMemo(() => {
    if (!formData.deduction_code) {
      return null;
    }

    return rules.find(
      (rule) =>
        String(rule.deduction_code).toUpperCase() ===
        String(formData.deduction_code).toUpperCase(),
    );
  }, [rules, formData.deduction_code]);

  // load available tax years

  const fetchTaxYears = async () => {
    try {
      setYearsLoading(true);

      const response = await TaxDeductionService.getAvailableTaxYears();

      const years = Array.isArray(response?.data) ? response.data : [];

      const normalizedYears = years
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return item.tax_year;
        })
        .filter(Boolean);

      const mergedYears =
        normalizedYears.length > 0
          ? Array.from(new Set([...normalizedYears, ...COMMON_TAX_YEARS]))
          : COMMON_TAX_YEARS;

      setTaxYears(mergedYears);

      // select newest available year automatically
      if (mergedYears.length > 0 && !mergedYears.includes(taxYear)) {
        setTaxYear(mergedYears[0]);
      }
    } catch (error) {
      console.error("Get Investment Tax Years Error:", error);

      setTaxYears(COMMON_TAX_YEARS);
      if (!taxYear) {
        setTaxYear(COMMON_TAX_YEARS[0]);
      }
    } finally {
      setYearsLoading(false);
    }
  };

  // load investment rules

  const fetchRules = async (year) => {
    if (!year) {
      setRules([]);
      return;
    }

    try {
      setRulesLoading(true);

      const response = await TaxDeductionService.getActiveDeductionRules(year);

      setRules(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Get Investment Rules Error:", error);

      setRules([]);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load investment types",
      );
    } finally {
      setRulesLoading(false);
    }
  };

  // load user investments

  const fetchInvestments = async (year) => {
    if (!year) {
      setInvestments([]);
      setTotalInvestment(0);
      return;
    }

    try {
      setInvestmentsLoading(true);

      const response = await TaxDeductionService.getMyDeductionsByTaxYear(year);

      const data = Array.isArray(response?.data) ? response.data : [];

      const sortedData = [...data].sort(
        (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)
      );

      setInvestments(sortedData);

      const total = data.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      setTotalInvestment(total);
    } catch (error) {
      console.error("Get Investments Error:", error);

      setInvestments([]);
      setTotalInvestment(0);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load investments",
      );
    } finally {
      setInvestmentsLoading(false);
    }
  };


  useEffect(() => {
    fetchTaxYears();
  }, []);

  // tax year change

  useEffect(() => {
    if (!taxYear) {
      return;
    }

    fetchRules(taxYear);
    fetchInvestments(taxYear);

    setFormData((previous) => ({
      ...previous,
      tax_year: taxYear,
      deduction_code: "",
    }));

    setShowForm(false);
  }, [taxYear]);

  // form change

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // open form

  const handleOpenForm = () => {
    const activeYear = taxYear || taxYears[0] || "2026-27";
    const period = getEarningPeriodForAssessmentYear(activeYear);

    setEditingInvestmentId(null);

    setFormData({
      tax_year: activeYear,
      deduction_code: "",
      amount: "",
      description: "",
      deduction_date: period ? period.startDate : "",
    });

    setShowForm(true);
  };

  // tax year change inside form

  const handleFormTaxYearChange = async (event) => {
    const selectedYear = event.target.value;
    const period = getEarningPeriodForAssessmentYear(selectedYear);

    setFormData((prev) => {
      let nextDate = prev.deduction_date;
      if (
        period &&
        (!nextDate || nextDate < period.startDate || nextDate > period.endDate)
      ) {
        nextDate = period.startDate;
      }
      return {
        ...prev,
        tax_year: selectedYear,
        deduction_code: "",
        deduction_date: nextDate,
      };
    });

    await fetchRules(selectedYear);
  };

  // edit investment

  const handleEdit = (investment) => {
    setEditingInvestmentId(investment.id);

    const formattedDate = investment.deduction_date
      ? String(investment.deduction_date).slice(0, 10)
      : "";

    const itemYear =
      investment.tax_year ||
      getAssessmentYearForDate(formattedDate) ||
      taxYear ||
      taxYears[0];

    setFormData({
      tax_year: itemYear,
      deduction_code: investment.deduction_code || "",
      amount: investment.amount ?? "",
      description: investment.description || "",
      deduction_date: formattedDate,
    });

    fetchRules(itemYear);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // delete investment

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this investment record?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingInvestmentId(id);

      await TaxDeductionService.deleteDeduction(id);

      toast.success("Investment deleted successfully.");

      await fetchInvestments(taxYear);
    } catch (error) {
      console.error("Delete Investment Error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete investment",
      );
    } finally {
      setDeletingInvestmentId(null);
    }
  };

  // close form

  const handleCloseForm = () => {
    setShowForm(false);

    setEditingInvestmentId(null);

    setFormData({
      tax_year: taxYear,
      deduction_code: "",
      amount: "",
      description: "",
      deduction_date: "",
    });
  };

  // submit investment

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.tax_year) {
      toast.error("Tax year is required.");
      return;
    }

    if (!formData.deduction_code) {
      toast.error("Please select an investment type.");

      return;
    }

    if (!formData.amount) {
      toast.error("Investment amount is required.");

      return;
    }

    if (!formData.deduction_date) {
      toast.error("Investment date is required.");

      return;
    }

    const amount = Number(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Investment amount must be greater than 0.");

      return;
    }

    // Validate investment date falls within the selected tax year's earning period
    if (earningPeriod) {
      if (
        formData.deduction_date < earningPeriod.startDate ||
        formData.deduction_date > earningPeriod.endDate
      ) {
        toast.error(
          `Investment date must be between ${earningPeriod.startDate} and ${earningPeriod.endDate} for AY ${formData.tax_year}`
        );
        return;
      }
    }

    // verify type exists for selected year

    const rule = rules.find(
      (item) =>
        String(item.deduction_code).toUpperCase() ===
        String(formData.deduction_code).toUpperCase(),
    );

    if (!rule) {
      toast.error(
        "Selected investment type is not available for this tax year.",
      );

      return;
    }

    const payload = {
      tax_year: formData.tax_year,
      deduction_code: formData.deduction_code,
      amount,
      description: formData.description.trim() || null,
      deduction_date: formData.deduction_date,
    };

    try {
      setSubmitting(true);

      if (editingInvestmentId) {
        await TaxDeductionService.updateDeduction(editingInvestmentId, payload);

        toast.success("Investment updated successfully.");
      } else {
        await TaxDeductionService.createDeduction(payload);

        toast.success("Investment added successfully.");
      }

      handleCloseForm();

      if (taxYear !== formData.tax_year) {
        setTaxYear(formData.tax_year);
      } else {
        await fetchInvestments(taxYear);
      }
    } catch (error) {
      console.error("Add Investment Error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to add investment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // get investment name

  const getInvestmentName = (code) => {
    const rule = rules.find(
      (item) =>
        String(item.deduction_code).toUpperCase() ===
        String(code).toUpperCase(),
    );

    return rule?.deduction_name || code || "Investment";
  };

  // ui

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Investment and Rebate
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add your investment for the selected tax year.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleOpenForm}
              disabled={!taxYear}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Investment
            </button>
          </div>
        </div>

        {/* =================================================
            TAX YEAR SELECTOR
        ================================================= */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />

                <h2 className="text-sm font-medium text-slate-900">Tax Year</h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Select the tax year for which you want to add an investment.
              </p>
            </div>

            <select
              value={taxYear}
              onChange={(event) => setTaxYear(event.target.value)}
              disabled={yearsLoading || taxYears.length === 0}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-48"
            >
              {yearsLoading ? (
                <option value="">Loading tax years...</option>
              ) : taxYears.length === 0 ? (
                <option value="">No tax year available</option>
              ) : (
                <>
                  <option value="">Select tax year</option>

                  {taxYears.map((year) => (
                    <option key={year} value={year}>
                      {formatTaxYearLabel(year)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </section>

        {/* =================================================
            SUMMARY
        ================================================= */}

        {taxYear && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Selected Tax Year</p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {taxYear}
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <CalendarDays className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Your Total Investment
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    BDT {formatAmount(totalInvestment)}
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <Wallet className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            ADD INVESTMENT FORM
        ================================================= */}

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-medium text-slate-900">
                  {editingInvestmentId ? "Edit Investment" : "Add Investment"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Investment for tax year{" "}
                  <span className="font-medium text-slate-700">{formData.tax_year}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Tax Year */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tax Year (Assessment Year)
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <select
                    name="tax_year"
                    value={formData.tax_year}
                    onChange={handleFormTaxYearChange}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    {taxYears.map((year) => (
                      <option key={year} value={year}>
                        {formatTaxYearLabel(year)}
                      </option>
                    ))}
                  </select>

                  {earningPeriod && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>
                        Income Year: <strong className="text-slate-700">{earningPeriod.incomeYear}</strong> (Period:{" "}
                        {formatFriendlyDateRange(earningPeriod.startDate, earningPeriod.endDate)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Investment Type */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Investment Type
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <select
                    name="deduction_code"
                    value={formData.deduction_code}
                    onChange={handleChange}
                    disabled={rulesLoading || rules.length === 0}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      {rulesLoading
                        ? "Loading investment types..."
                        : rules.length === 0
                          ? "No investment type available"
                          : "Select investment type"}
                    </option>

                    {rules.map((rule) => (
                      <option key={rule.id} value={rule.deduction_code}>
                        {rule.deduction_name || rule.deduction_code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Investment Amount
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <CircleDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="Enter investment amount"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                {/* Date with calendar restrictions */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Investment Date
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      name="deduction_date"
                      min={earningPeriod?.startDate}
                      max={earningPeriod?.endDate}
                      value={formData.deduction_date}
                      onChange={handleChange}
                      required
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  {earningPeriod && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Calendar restricted to:{" "}
                      <span className="font-medium text-emerald-700">
                        {formatFriendlyDateRange(earningPeriod.startDate, earningPeriod.endDate)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Description */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Optional description"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* Selected Investment Info */}

              {selectedRule && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {selectedRule.deduction_name || selectedRule.deduction_code}
                  </p>

                  {selectedRule.description && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {selectedRule.description}
                    </p>
                  )}
                </div>
              )}

              {/* Buttons */}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || rulesLoading || rules.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}

                  {submitting
                    ? "Saving..."
                    : editingInvestmentId
                      ? "Update Investment"
                      : "Save Investment"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =================================================
            MY INVESTMENTS
        ================================================= */}

        {taxYear && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-medium text-slate-900">
                  My Investments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your investment records for {taxYear}
                </p>
              </div>
            </div>

            {investmentsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading investments...
              </div>
            ) : investments.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                  <TrendingUp className="h-5 w-5 text-slate-400" />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-700">
                  No investment added for {taxYear}.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Add an investment to keep your investment record.
                </p>

                <button
                  type="button"
                  onClick={handleOpenForm}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Investment
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        SL
                      </th>

                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Investment
                      </th>

                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Description
                      </th>

                      <th className="sticky right-0 z-10 bg-slate-50 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {investments.map((investment, index) => (
                      <tr
                        key={investment.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-900">
                            {getInvestmentName(investment.deduction_code)}
                          </p>

                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {investment.deduction_code}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(investment.deduction_date)}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-900">
                          BDT {formatAmount(investment.amount)}
                        </td>

                        <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                          <span className="line-clamp-2">
                            {investment.description || "-"}
                          </span>
                        </td>

                        <td className="sticky right-0 z-10 bg-white px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(investment)}
                              disabled={deletingInvestmentId === investment.id}
                              title="Edit investment"
                              aria-label="Edit investment"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(investment.id)}
                              disabled={deletingInvestmentId === investment.id}
                              title="Delete investment"
                              aria-label="Delete investment"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingInvestmentId === investment.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default TaxDeductions;
