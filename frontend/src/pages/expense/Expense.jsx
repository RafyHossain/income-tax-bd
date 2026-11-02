import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Receipt,
  CalendarDays,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

import ExpenseService from "@/services/expenseService";
import TaxDeductionService from "@/services/taxDeductionService";
import {
  COMMON_TAX_YEARS,
  formatTaxYearLabel,
  getEarningPeriodForAssessmentYear,
  getAssessmentYearForDate,
  formatFriendlyDateRange,
} from "@/utils/taxYearUtils";

const defaultInitialYear = "2026-27";

const initialFormData = {
  tax_year: defaultInitialYear,
  expense_category: "",
  expense_type_id: "",
  description: "",
  amount: "",
  expense_date: "",
};

const Expense = () => {
  const [expenses, setExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [taxYears, setTaxYears] = useState(COMMON_TAX_YEARS);
  const [filterTaxYear, setFilterTaxYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [expenseTypesLoading, setExpenseTypesLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  // Computed earning period for the currently selected tax year in form
  const earningPeriod = useMemo(() => {
    return getEarningPeriodForAssessmentYear(formData.tax_year);
  }, [formData.tax_year]);

  // fetch available tax years
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
      // Keep COMMON_TAX_YEARS
    }
  };

  // fetch expenses
  const fetchExpense = async () => {
    try {
      const response = await ExpenseService.getMyExpense();
      const data = Array.isArray(response?.data) ? response.data : [];

      const sortedData = [...data].sort(
        (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)
      );

      setExpenses(sortedData);
    } catch (error) {
      console.error("Get Expense Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch expenses"
      );
    } finally {
      setLoading(false);
    }
  };

  // fetch expense types
  const fetchExpenseTypes = async (category = "") => {
    try {
      setExpenseTypesLoading(true);
      const response = await ExpenseService.getExpenseTypes(category);
      setExpenseTypes(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Get Expense Types Error:", error);
      setExpenseTypes([]);
      toast.error(
        error.response?.data?.message || "Failed to fetch expense types"
      );
    } finally {
      setExpenseTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxYears();
    fetchExpense();
  }, []);

  // tax year change in form
  const handleTaxYearChange = (e) => {
    const selectedYear = e.target.value;
    const period = getEarningPeriodForAssessmentYear(selectedYear);

    setFormData((prev) => {
      let nextDate = prev.expense_date;
      if (
        period &&
        (!nextDate || nextDate < period.startDate || nextDate > period.endDate)
      ) {
        nextDate = period.startDate;
      }
      return {
        ...prev,
        tax_year: selectedYear,
        expense_date: nextDate,
      };
    });
  };

  // form change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // category change
  const handleCategoryChange = async (event) => {
    const category = event.target.value;

    setFormData((previousData) => ({
      ...previousData,
      expense_category: category,
      expense_type_id: "",
    }));

    if (!category) {
      setExpenseTypes([]);
      return;
    }

    await fetchExpenseTypes(category);
  };

  // open add form
  const handleOpenAddForm = () => {
    const initialYear = filterTaxYear || taxYears[0] || defaultInitialYear;
    const period = getEarningPeriodForAssessmentYear(initialYear);

    setEditingExpenseId(null);
    setFormData({
      ...initialFormData,
      tax_year: initialYear,
      expense_date: period ? period.startDate : "",
    });
    setExpenseTypes([]);
    setShowForm(true);
  };

  // edit expense
  const handleEditExpense = async (expense) => {
    const category = expense.expense_category || "";
    const formattedDate = expense.expense_date
      ? String(expense.expense_date).slice(0, 10)
      : "";

    const detectedYear =
      getAssessmentYearForDate(formattedDate) ||
      filterTaxYear ||
      taxYears[0] ||
      defaultInitialYear;

    setEditingExpenseId(expense.id);

    setFormData({
      tax_year: detectedYear,
      expense_category: category,
      expense_type_id: expense.expense_type_id ? String(expense.expense_type_id) : "",
      description: expense.description || "",
      amount: expense.amount ?? "",
      expense_date: formattedDate,
    });

    setShowForm(true);

    if (category) {
      await fetchExpenseTypes(category);
    } else {
      setExpenseTypes([]);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpenseId(null);
    setFormData(initialFormData);
    setExpenseTypes([]);
  };

  // submit expense
  const handleSubmitExpense = async (event) => {
    event.preventDefault();

    if (
      !formData.tax_year ||
      !formData.expense_category ||
      !formData.expense_type_id ||
      !formData.amount ||
      !formData.expense_date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    // validate date range
    if (earningPeriod) {
      if (
        formData.expense_date < earningPeriod.startDate ||
        formData.expense_date > earningPeriod.endDate
      ) {
        toast.error(
          `Expense date must be between ${earningPeriod.startDate} and ${earningPeriod.endDate} for AY ${formData.tax_year}`
        );
        return;
      }
    }

    const selectedExpenseType = expenseTypes.find(
      (type) => String(type.id) === String(formData.expense_type_id)
    );

    if (!selectedExpenseType) {
      toast.error("Please select a valid expense type");
      return;
    }

    if (selectedExpenseType.expense_category !== formData.expense_category) {
      toast.error(
        "Selected expense type does not belong to the selected category"
      );
      return;
    }

    const payload = {
      expense_type_id: Number(formData.expense_type_id),
      description: formData.description.trim() || null,
      amount,
      expense_date: formData.expense_date,
    };

    try {
      setSubmitting(true);

      if (editingExpenseId) {
        await ExpenseService.updateExpense(editingExpenseId, payload);
        toast.success("Expense updated successfully");
      } else {
        await ExpenseService.createExpense(payload);
        toast.success("Expense added successfully");
      }

      setFormData(initialFormData);
      setEditingExpenseId(null);
      setExpenseTypes([]);
      setShowForm(false);

      await fetchExpense();
    } catch (error) {
      console.error("Expense Submit Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to save expense"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // delete expense
  const handleDeleteExpense = (expenseId) => {
    toast(
      (t) => (
        <div className="w-[320px]">
          <p className="text-sm font-medium text-slate-900">Delete expense?</p>
          <p className="mt-1 text-sm text-slate-500">
            This expense record will be permanently deleted.
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
                  setDeletingExpenseId(expenseId);
                  await ExpenseService.deleteExpense(expenseId);
                  toast.success("Expense deleted successfully");
                  await fetchExpense();
                } catch (error) {
                  console.error("Delete Expense Error:", error);
                  toast.error(
                    error.response?.data?.message || "Failed to delete expense"
                  );
                } finally {
                  setDeletingExpenseId(null);
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

  // filtering & helpers
  const filteredExpenses = useMemo(() => {
    if (!filterTaxYear) return expenses;
    return expenses.filter((expense) => {
      const ay = getAssessmentYearForDate(expense.expense_date);
      return ay === filterTaxYear;
    });
  }, [expenses, filterTaxYear]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [filteredExpenses]);

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading expense records...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Expenses
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add and manage your expense records by tax year.
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
            {showForm ? "Close" : "Add Expense"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {filterTaxYear ? `Total Expenses (${filterTaxYear})` : "Total Expenses (All Years)"}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                BDT {formatAmount(totalFilteredAmount)}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Receipt className="h-4 w-4 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Records</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? "record" : "records"}
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
            <h3 className="text-lg font-semibold text-slate-900">
              {editingExpenseId ? "Edit Expense" : "Add Expense"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Select the Tax Year and enter the expense details. The date calendar is automatically bounded to the Income Year.
            </p>
          </div>

          <form onSubmit={handleSubmitExpense} className="space-y-5">
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
                    Income Year: <strong className="text-slate-700">{earningPeriod.incomeYear}</strong> (Period:{" "}
                    {formatFriendlyDateRange(earningPeriod.startDate, earningPeriod.endDate)})
                  </span>
                </div>
              )}
            </div>

            {/* Expense Category */}
            <div>
              <label
                htmlFor="expense_category"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Expense Category
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                id="expense_category"
                name="expense_category"
                value={formData.expense_category}
                onChange={handleCategoryChange}
                required
                disabled={submitting}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">Select expense category</option>
                <option value="BUSINESS">Business</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>

            {/* Expense Type */}
            <div>
              <label
                htmlFor="expense_type_id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Expense Type
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                id="expense_type_id"
                name="expense_type_id"
                value={formData.expense_type_id}
                onChange={handleChange}
                required
                disabled={
                  !formData.expense_category ||
                  expenseTypesLoading ||
                  submitting
                }
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  {!formData.expense_category
                    ? "Select category first"
                    : expenseTypesLoading
                      ? "Loading expense types..."
                      : "Select expense type"}
                </option>

                {expenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.expense_name}
                  </option>
                ))}
              </select>

              {formData.expense_category &&
                !expenseTypesLoading &&
                expenseTypes.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">
                    No active expense types are available for this category.
                  </p>
                )}
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
                    placeholder="5000"
                    required
                    disabled={submitting}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Date with calendar restrictions */}
              <div>
                <label
                  htmlFor="expense_date"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Expense Date
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    min={earningPeriod?.startDate}
                    max={earningPeriod?.endDate}
                    value={formData.expense_date}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
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
                placeholder="Optional description"
                rows="3"
                disabled={submitting}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
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
                disabled={
                  submitting ||
                  !formData.expense_type_id ||
                  expenseTypes.length === 0
                }
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : editingExpenseId
                    ? "Update Expense"
                    : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Records Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Receipt className="h-4 w-4 text-slate-600" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Expense Records
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {filteredExpenses.length}{" "}
                {filteredExpenses.length === 1 ? "record" : "records"}
                {filterTaxYear ? ` for ${filterTaxYear}` : " (All Years)"}
              </p>
            </div>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
              <Receipt className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 text-sm text-slate-600">
              No expense records found{filterTaxYear ? ` for ${filterTaxYear}` : ""}.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Click &quot;Add Expense&quot; to record expenses for this tax year.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
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
                    Category
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-slate-500">
                    Description
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
                {filteredExpenses.map((expense, index) => {
                  const itemAy = getAssessmentYearForDate(expense.expense_date);

                  return (
                    <tr
                      key={expense.id}
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
                        <p className="text-sm font-medium text-slate-900">
                          {expense.expense_name}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {expense.expense_category}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-xs truncate text-sm text-slate-600">
                          {expense.description || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-900">
                          BDT {formatAmount(expense.amount)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {formatDate(expense.expense_date)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleEditExpense(expense)}
                            disabled={deletingExpenseId !== null}
                            title="Edit expense"
                            aria-label="Edit expense"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(expense.id)}
                            disabled={deletingExpenseId === expense.id}
                            title="Delete expense"
                            aria-label="Delete expense"
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

export default Expense;
