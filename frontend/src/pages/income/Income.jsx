import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Wallet,
  CalendarDays,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

import IncomeService from "@/services/incomeService";
import TaxDeductionService from "@/services/taxDeductionService";
import {
  COMMON_TAX_YEARS,
  formatTaxYearLabel,
  getEarningPeriodForAssessmentYear,
  getAssessmentYearForDate,
  formatFriendlyDateRange,
} from "@/utils/taxYearUtils";

const incomeTypes = [
  "Employment",
  "Rent",
  "Agriculture",
  "Business",
  "Capital Gains",
  "Financial Assets",
  "Other Sources",
];

const defaultInitialYear = "2026-27";

const initialFormData = {
  tax_year: defaultInitialYear,
  income_type: "",
  source_name: "",
  amount: "",
  income_date: "",
  description: "",
};

const Income = () => {
  const [incomes, setIncomes] = useState([]);
  const [taxYears, setTaxYears] = useState(COMMON_TAX_YEARS);
  const [filterTaxYear, setFilterTaxYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deletingIncomeId, setDeletingIncomeId] = useState(null);
  const [editingIncomeId, setEditingIncomeId] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  // Computed earning period for the currently selected tax year in form
  const earningPeriod = useMemo(() => {
    return getEarningPeriodForAssessmentYear(formData.tax_year);
  }, [formData.tax_year]);

  // ----------------------------- fetch tax years
  const fetchTaxYears = async () => {
    try {
      const response = await TaxDeductionService.getAvailableTaxYears();
      const years = Array.isArray(response?.data) ? response.data : [];
      const normalizedYears = years
        .map((item) => (typeof item === "string" ? item : item?.tax_year))
        .filter(Boolean);

      if (normalizedYears.length > 0) {
        // merge with common tax years preserving uniqueness
        const merged = Array.from(new Set([...normalizedYears, ...COMMON_TAX_YEARS]));
        setTaxYears(merged);
      }
    } catch {
      // Keep COMMON_TAX_YEARS as default
    }
  };

  // ----------------------------- fetch income
  const fetchIncome = async () => {
    try {
      const response = await IncomeService.getMyIncome();
      const data = Array.isArray(response?.data) ? response.data : [];

      const sortedData = [...data].sort(
        (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)
      );

      setIncomes(sortedData);
    } catch (error) {
      console.error("Get Income Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch income"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxYears();
    fetchIncome();
  }, []);

  // ----------------------------- tax year change in form
  const handleTaxYearChange = (e) => {
    const selectedYear = e.target.value;
    const period = getEarningPeriodForAssessmentYear(selectedYear);

    setFormData((prev) => {
      let nextDate = prev.income_date;
      // If no date or date is outside the new year period, set to period start date
      if (
        period &&
        (!nextDate || nextDate < period.startDate || nextDate > period.endDate)
      ) {
        nextDate = period.startDate;
      }
      return {
        ...prev,
        tax_year: selectedYear,
        income_date: nextDate,
      };
    });
  };

  // ----------------------------- form change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ----------------------------- open add form
  const handleOpenAddForm = () => {
    const initialYear = filterTaxYear || taxYears[0] || defaultInitialYear;
    const period = getEarningPeriodForAssessmentYear(initialYear);

    setEditingIncomeId(null);
    setFormData({
      ...initialFormData,
      tax_year: initialYear,
      income_date: period ? period.startDate : "",
    });
    setShowForm(true);
  };

  // ----------------------------- edit income
  const handleEditIncome = (income) => {
    setEditingIncomeId(income.id);

    const formattedDate = income.income_date
      ? String(income.income_date).slice(0, 10)
      : "";

    // Determine tax year from existing date
    const detectedYear =
      getAssessmentYearForDate(formattedDate) ||
      filterTaxYear ||
      taxYears[0] ||
      defaultInitialYear;

    setFormData({
      tax_year: detectedYear,
      income_type: income.income_type || "",
      source_name: income.source_name || "",
      amount: income.amount || "",
      income_date: formattedDate,
      description: income.description || "",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ----------------------------- close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingIncomeId(null);
    setFormData(initialFormData);
  };

  // ----------------------------- submit income
  const handleSubmitIncome = async (event) => {
    event.preventDefault();

    if (
      !formData.tax_year ||
      !formData.income_type ||
      !formData.source_name ||
      !formData.amount ||
      !formData.income_date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (Number(formData.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    // Validate income date falls within the selected tax year's earning period
    if (earningPeriod) {
      if (
        formData.income_date < earningPeriod.startDate ||
        formData.income_date > earningPeriod.endDate
      ) {
        toast.error(
          `Income date must be between ${earningPeriod.startDate} and ${earningPeriod.endDate} for AY ${formData.tax_year}`
        );
        return;
      }
    }

    const payload = {
      income_type: formData.income_type,
      source_name: formData.source_name,
      amount: formData.amount,
      income_date: formData.income_date,
      description: formData.description,
    };

    try {
      setSubmitting(true);

      if (editingIncomeId) {
        await IncomeService.updateIncome(editingIncomeId, payload);
        toast.success("Income updated successfully");
      } else {
        await IncomeService.createIncome(payload);
        toast.success("Income added successfully");
      }

      setFormData(initialFormData);
      setEditingIncomeId(null);
      setShowForm(false);

      await fetchIncome();
    } catch (error) {
      console.error("Income Submit Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to save income"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------- delete income
  const handleDeleteIncome = (incomeId) => {
    toast(
      (t) => (
        <div className="w-[320px]">
          <p className="text-sm font-medium text-slate-900">Delete income?</p>
          <p className="mt-1 text-sm text-slate-500">
            This income record will be permanently deleted.
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
                  setDeletingIncomeId(incomeId);
                  await IncomeService.deleteIncome(incomeId);
                  toast.success("Income deleted successfully");
                  await fetchIncome();
                } catch (error) {
                  console.error("Delete Income Error:", error);
                  toast.error(
                    error.response?.data?.message || "Failed to delete income"
                  );
                } finally {
                  setDeletingIncomeId(null);
                }
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      }
    );
  };

  // ----------------------------- helpers & filtering
  const filteredIncomes = useMemo(() => {
    if (!filterTaxYear) return incomes;
    return incomes.filter((income) => {
      const ay = getAssessmentYearForDate(income.income_date);
      return ay === filterTaxYear;
    });
  }, [incomes, filterTaxYear]);

  const totalFilteredAmount = useMemo(() => {
    return filteredIncomes.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [filteredIncomes]);

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ----------------------------- loading
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading income records...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Income
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add and manage your income records by tax year.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tax Year Filter */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterTaxYear}
              onChange={(e) => setFilterTaxYear(e.target.value)}
              aria-label="Filter by Tax Year"
              className="bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="">All Tax Years</option>
              {taxYears.map((year) => (
                <option key={year} value={year}>
                  {formatTaxYearLabel(year)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={showForm ? handleCloseForm : handleOpenAddForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Add Income"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {filterTaxYear ? `Total Income (${filterTaxYear})` : "Total Income (All Years)"}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                BDT {formatAmount(totalFilteredAmount)}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Records</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {filteredIncomes.length} {filteredIncomes.length === 1 ? "record" : "records"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <CalendarDays className="h-4 w-4 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-sm text-slate-500">Selected View Period</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {filterTaxYear ? (
                <>
                  <span className="font-semibold text-emerald-600">{filterTaxYear}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {(() => {
                      const ep = getEarningPeriodForAssessmentYear(filterTaxYear);
                      return ep
                        ? `Income Year ${ep.incomeYear} (${formatFriendlyDateRange(ep.startDate, ep.endDate)})`
                        : "Full Record History";
                    })()}
                  </span>
                </>
              ) : (
                "Showing all recorded transactions across all tax years"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-900">
              {editingIncomeId ? "Edit Income" : "Add Income"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Select the Tax Year and enter the income details. The date calendar is automatically bounded to the Income Year.
            </p>
          </div>

          <form onSubmit={handleSubmitIncome} className="space-y-5">
            {/* Tax Year Selector */}
            <div>
              <label
                htmlFor="tax_year"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tax Year (Assessment Year)
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                id="tax_year"
                name="tax_year"
                value={formData.tax_year}
                onChange={handleTaxYearChange}
                required
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                    Income Year: <strong className="text-slate-700">{earningPeriod.incomeYear}</strong> (Earning period:{" "}
                    {formatFriendlyDateRange(earningPeriod.startDate, earningPeriod.endDate)})
                  </span>
                </div>
              )}
            </div>

            {/* Income Type + Source */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Income Type */}
              <div>
                <label
                  htmlFor="income_type"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Income Type
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  id="income_type"
                  name="income_type"
                  value={formData.income_type}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">Select income type</option>
                  {incomeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Name */}
              <div>
                <label
                  htmlFor="source_name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Source Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="source_name"
                  name="source_name"
                  type="text"
                  value={formData.source_name}
                  onChange={handleChange}
                  placeholder="e.g. ABC Company Ltd."
                  required
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* Amount + Date */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Amount */}
              <div>
                <label
                  htmlFor="amount"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Amount
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    BDT
                  </span>

                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="60000"
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 pl-12 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* Date with strict calendar constraints */}
              <div>
                <label
                  htmlFor="income_date"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Income Date
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="income_date"
                    name="income_date"
                    type="date"
                    min={earningPeriod?.startDate}
                    max={earningPeriod?.endDate}
                    value={formData.income_date}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add an optional description"
                rows="3"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={submitting}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : editingIncomeId
                    ? "Update Income"
                    : "Save Income"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Income Records Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table Header */}
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Wallet className="h-4 w-4 text-slate-600" />
              </div>

              <div>
                <h3 className="text-base font-medium text-slate-900">
                  Income Records
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredIncomes.length}{" "}
                  {filteredIncomes.length === 1 ? "record" : "records"}
                  {filterTaxYear ? ` for ${filterTaxYear}` : " (All Years)"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {filteredIncomes.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
              <Wallet className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 text-sm text-slate-600">
              No income records found{filterTaxYear ? ` for ${filterTaxYear}` : ""}.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Click &quot;Add Income&quot; to record earnings for this tax year.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    SL
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    Tax Year
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    Source
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredIncomes.map((income, index) => {
                  const itemAy = getAssessmentYearForDate(income.income_date);

                  return (
                    <tr
                      key={income.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          {itemAy ? `AY ${itemAy}` : "-"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-slate-900">
                          {income.income_type}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900">
                            {income.source_name}
                          </p>

                          {income.description && (
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                              {income.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-900">
                          BDT {formatAmount(income.amount)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {formatDate(income.income_date)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleEditIncome(income)}
                            disabled={deletingIncomeId !== null}
                            title="Edit income"
                            aria-label="Edit income"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteIncome(income.id)}
                            disabled={deletingIncomeId === income.id}
                            title="Delete income"
                            aria-label="Delete income"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
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

export default Income;
