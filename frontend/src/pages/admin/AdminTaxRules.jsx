import { useEffect, useState } from "react";
import {
  Calculator,
  Plus,
  RefreshCw,
  Pencil,
  X,
  Power,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import TaxRuleService from "@/services/taxRuleService";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "",
  minimum_income: "",
  maximum_income: "",
  tax_rate: "",
  fixed_amount: "0",
  status: "ACTIVE",
  effective_from: "",
  effective_to: "",
};

const AdminTaxRules = () => {
  const [taxYears, setTaxYears] = useState([]);
  const [selectedTaxYear, setSelectedTaxYear] = useState("");

  const [rules, setRules] = useState([]);

  const [taxYearStatus, setTaxYearStatus] =
    useState("INACTIVE");

  const [loadingYears, setLoadingYears] =
    useState(true);

  const [loadingRules, setLoadingRules] =
    useState(false);

  const [loadingStatus, setLoadingStatus] =
    useState(false);

  const [statusUpdating, setStatusUpdating] =
    useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingRule, setEditingRule] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState(emptyForm);

  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleToggleRuleStatus = (rule) => {
    const nextStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setConfirmDialog({
      title: nextStatus === "ACTIVE" ? "Activate Tax Slab" : "Deactivate Tax Slab",
      message: `Are you sure you want to mark this tax slab (${Number(rule.tax_rate).toFixed(2)}%) as ${nextStatus}?`,
      variant: nextStatus === "ACTIVE" ? "primary" : "warning",
      confirmText: nextStatus === "ACTIVE" ? "Activate Slab" : "Deactivate Slab",
      onConfirm: async () => {
        try {
          const res = await TaxRuleService.toggleStatus(rule.id, nextStatus);
          toast.success(res?.message || `Tax slab marked as ${nextStatus}.`);
          setConfirmDialog(null);
          await loadRules(selectedTaxYear);
          await loadTaxYearStatus(selectedTaxYear);
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || "Failed to update tax slab status.");
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteRule = (rule) => {
    setConfirmDialog({
      title: "Delete Tax Slab",
      message: `Are you sure you want to permanently delete this tax slab (${Number(rule.tax_rate).toFixed(2)}% on BDT ${formatMoney(rule.minimum_income)} - ${rule.maximum_income ? `BDT ${formatMoney(rule.maximum_income)}` : "Above"})? This action cannot be undone.`,
      variant: "danger",
      confirmText: "Delete Slab",
      onConfirm: async () => {
        try {
          const res = await TaxRuleService.deleteTaxRule(rule.id);
          toast.success(res?.message || "Tax slab deleted successfully.");
          setConfirmDialog(null);
          await loadRules(selectedTaxYear);
          await loadTaxYearStatus(selectedTaxYear);
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || "Failed to delete tax slab.");
          setConfirmDialog(null);
        }
      },
    });
  };

  // load tax years

  const loadTaxYears = async () => {
    try {
      setLoadingYears(true);
      setError("");

      const response =
        await TaxRuleService.getAvailableTaxYears();

      const years = response.data || [];

      setTaxYears(years);

      if (years.length > 0) {
        setSelectedTaxYear((currentYear) => {
          return currentYear || years[0];
        });
      }
    } catch (error) {
      console.error(
        "Tax year loading error:",
        error,
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load tax years.",
      );
    } finally {
      setLoadingYears(false);
    }
  };

  // load all tax rules
  // admin

  const loadRules = async (taxYear) => {
    if (!taxYear) {
      setRules([]);
      return;
    }

    try {
      setLoadingRules(true);
      setError("");

      const response =
        await TaxRuleService.getAllTaxRules(
          taxYear,
        );

      setRules(response.data || []);
    } catch (error) {
      console.error(
        "Tax rules loading error:",
        error,
      );

      setRules([]);

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load tax rules.",
      );
    } finally {
      setLoadingRules(false);
    }
  };

  // load tax year status

  const loadTaxYearStatus = async (taxYear) => {
    if (!taxYear) {
      setTaxYearStatus("INACTIVE");
      return;
    }

    try {
      setLoadingStatus(true);

      const response =
        await TaxRuleService.getTaxYearStatus(
          taxYear,
        );

      const status =
        response?.data?.status || "INACTIVE";

      setTaxYearStatus(status);
    } catch (error) {
      console.error(
        "Tax year status loading error:",
        error,
      );

      setTaxYearStatus("INACTIVE");
    } finally {
      setLoadingStatus(false);
    }
  };


  useEffect(() => {
    let cancelled = false;

    TaxRuleService.getAvailableTaxYears()
      .then((response) => {
        if (cancelled) {
          return;
        }

        const years = response?.data || [];

        setTaxYears(years);

        if (years.length > 0) {
          setSelectedTaxYear((currentYear) => {
            return currentYear || years[0];
          });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Tax year loading error:",
          error,
        );

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load tax years.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingYears(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // tax year change

  useEffect(() => {
    if (!selectedTaxYear) {
      return;
    }

    let cancelled = false;

    Promise.all([
      TaxRuleService.getAllTaxRules(
        selectedTaxYear,
      ),
      TaxRuleService.getTaxYearStatus(
        selectedTaxYear,
      ),
    ])
      .then(([rulesResponse, statusResponse]) => {
        if (cancelled) {
          return;
        }

        setRules(rulesResponse?.data || []);

        setTaxYearStatus(
          statusResponse?.data?.status ||
            "INACTIVE",
        );

        setError("");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Tax year data loading error:",
          error,
        );

        setRules([]);

        setTaxYearStatus("INACTIVE");

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load tax rules.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRules(false);
          setLoadingStatus(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTaxYear]);

  // form handler

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // open create form
  // existing tax year

  const handleCreate = () => {
    setEditingRule(null);

    setForm({
      ...emptyForm,
      tax_year: selectedTaxYear || (taxYears[0] || ""),
    });

    setShowForm(true);
  };

  // open edit form

  const handleEdit = (rule) => {
    setEditingRule(rule);

    setForm({
      tax_year: rule.tax_year || "",

      minimum_income:
        rule.minimum_income ?? "",

      maximum_income:
        rule.maximum_income ?? "",

      tax_rate:
        rule.tax_rate ?? "",

      fixed_amount:
        rule.fixed_amount ?? "0",

      status:
        rule.status || "ACTIVE",

      effective_from:
        rule.effective_from
          ? String(rule.effective_from).slice(
              0,
              10,
            )
          : "",

      effective_to:
        rule.effective_to
          ? String(rule.effective_to).slice(
              0,
              10,
            )
          : "",
    });

    setShowForm(true);
  };

  // close form

  const handleCloseForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingRule(null);
    setForm(emptyForm);
  };

  // save tax rule

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        tax_year: form.tax_year,

        minimum_income:
          Number(form.minimum_income),

        maximum_income:
          form.maximum_income === ""
            ? null
            : Number(form.maximum_income),

        tax_rate:
          Number(form.tax_rate),

        fixed_amount:
          form.fixed_amount === ""
            ? 0
            : Number(form.fixed_amount),

        status:
          form.status || "ACTIVE",

        effective_from:
          form.effective_from,

        effective_to:
          form.effective_to === ""
            ? null
            : form.effective_to,
      };

      if (editingRule) {
        await TaxRuleService.updateTaxRule(
          editingRule.id,
          payload,
        );

        toast.success(
          "Tax rule updated successfully.",
        );
      } else {
        await TaxRuleService.createTaxRule(
          payload,
        );

        toast.success(
          "Tax rule created successfully.",
        );
      }

      setShowForm(false);
      setEditingRule(null);
      setForm(emptyForm);

      await loadTaxYears();

      await loadRules(
        payload.tax_year,
      );

      await loadTaxYearStatus(
        payload.tax_year,
      );

      setSelectedTaxYear(
        payload.tax_year,
      );
    } catch (error) {
      console.error(
        "Tax rule save error:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save tax rule.",
      );
    } finally {
      setSaving(false);
    }
  };

  // change tax year status
  const handleTaxYearStatusChange = () => {
    if (!selectedTaxYear) {
      return;
    }

    const nextStatus =
      taxYearStatus === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    const action =
      nextStatus === "ACTIVE"
        ? "activate"
        : "deactivate";

    setConfirmDialog({
      title: `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} Assessment Year Slabs`,
      message: `Are you sure you want to ${action} all tax slabs for Assessment Year ${selectedTaxYear}?`,
      variant: nextStatus === "ACTIVE" ? "primary" : "warning",
      confirmText: nextStatus === "ACTIVE" ? "Activate All" : "Deactivate All",
      onConfirm: async () => {
        try {
          setStatusUpdating(true);

          await TaxRuleService.updateTaxYearStatus(
            selectedTaxYear,
            nextStatus,
          );

          setTaxYearStatus(nextStatus);

          toast.success(
            `All slabs for ${selectedTaxYear} ${action}d successfully.`,
          );

          setConfirmDialog(null);

          await loadRules(
            selectedTaxYear,
          );

          await loadTaxYearStatus(
            selectedTaxYear,
          );
        } catch (error) {
          console.error(
            "Tax year status update error:",
            error,
          );

          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to update tax year status.",
          );

          setConfirmDialog(null);
        } finally {
          setStatusUpdating(false);
        }
      },
    });
  };


  // format money

  const formatMoney = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return Number(value).toLocaleString(
      "en-BD",
      {
        maximumFractionDigits: 2,
      },
    );
  };

  // loading

  if (loadingYears) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-slate-500" />

          <p className="mt-3 text-sm text-slate-500">
            Loading tax rules...
          </p>
        </div>
      </div>
    );
  }

  // main ui

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tax Slabs
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedTaxYear}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Tax Rule
          </button>
        </div>
      </div>

      {/* =====================================================
          TAX YEAR SELECTOR + STATUS TOOLBAR
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-64">
            <label
              htmlFor="taxYear"
              className="text-xs font-medium text-slate-600 block"
            >
              Tax Year
            </label>
            <select
              id="taxYear"
              value={selectedTaxYear}
              onChange={(event) =>
                setSelectedTaxYear(event.target.value)
              }
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              {taxYears.map((year) => (
                <option key={year} value={year}>
                  {formatTaxYearLabel(year)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                taxYearStatus === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              Year Status: {taxYearStatus}
            </span>

            <button
              type="button"
              onClick={handleTaxYearStatusChange}
              disabled={statusUpdating || loadingStatus || !selectedTaxYear}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                taxYearStatus === "ACTIVE"
                  ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
                  : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {statusUpdating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
              {taxYearStatus === "ACTIVE" ? "Deactivate Year" : "Activate Year"}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          RULE TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loadingRules ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            <p className="mt-2 text-sm">Loading tax slabs...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Calculator className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">No tax rules found for this tax year</p>
            <p className="text-xs text-slate-400">Click &ldquo;Add Tax Rule&rdquo; to create a new progressive slab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Minimum Income</th>
                  <th className="px-4 py-3">Maximum Income</th>
                  <th className="px-4 py-3 text-right">Tax Rate</th>
                  <th className="px-4 py-3 text-right">Fixed Amount</th>
                  <th className="px-4 py-3 text-center">Effective From</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule, index) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      BDT{" "}
                      {formatMoney(
                        index > 0 && Number(rule.minimum_income) > 0 && Number(rule.minimum_income) % 1000 === 0
                          ? Number(rule.minimum_income) + 1
                          : rule.minimum_income,
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {rule.maximum_income === null ? "Above" : `BDT ${formatMoney(rule.maximum_income)}`}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {Number(rule.tax_rate).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      BDT {formatMoney(rule.fixed_amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {rule.effective_from ? String(rule.effective_from).slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {rule.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleRuleStatus(rule)}
                          title={rule.status === "ACTIVE" ? "Deactivate Slab" : "Activate Slab"}
                          className={`rounded p-1.5 transition ${
                            rule.status === "ACTIVE"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(rule)}
                          title="Edit Slab"
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule)}
                          title="Delete Slab"
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>

                <h2 className="text-xl font-semibold text-slate-900">

                  {editingRule
                    ? "Edit Tax Rule"
                    : "Add Tax Rule"}

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  {editingRule
                    ? "Update the selected tax slab."
                    : "Configure a new tax slab for the selected tax year."}

                </p>

              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div className="grid gap-5 md:grid-cols-2">

                {/* TAX YEAR */}

                <div>

                  <label
                    htmlFor="form-tax-year"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Tax Year
                  </label>

                  <select
                    id="form-tax-year"
                    name="tax_year"
                    value={form.tax_year}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    {taxYears.map(
                      (year) => (
                        <option
                          key={year}
                          value={year}
                        >
                          {formatTaxYearLabel(year)}
                        </option>
                      ),
                    )}
                  </select>

                </div>

                {/* TAX RATE */}

                <div>

                  <label
                    htmlFor="tax-rate"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Tax Rate (%)
                  </label>

                  <input
                    id="tax-rate"
                    name="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    placeholder="e.g. 10"
                  />

                </div>

                {/* MINIMUM INCOME */}

                <div>

                  <label
                    htmlFor="minimum-income"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Minimum Income
                  </label>

                  <input
                    id="minimum-income"
                    name="minimum_income"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.minimum_income
                    }
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    placeholder="Minimum income"
                  />

                </div>

                {/* MAXIMUM INCOME */}

                <div>

                  <label
                    htmlFor="maximum-income"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Maximum Income
                  </label>

                  <input
                    id="maximum-income"
                    name="maximum_income"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.maximum_income
                    }
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    placeholder="Leave empty for unlimited"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Leave empty for the final/open-ended
                    slab.
                  </p>

                </div>

                {/* FIXED AMOUNT */}

                <div>

                  <label
                    htmlFor="fixed-amount"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Fixed Amount
                  </label>

                  <input
                    id="fixed-amount"
                    name="fixed_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.fixed_amount
                    }
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    placeholder="0"
                  />

                </div>

                {/* EFFECTIVE FROM */}

                <div>

                  <label
                    htmlFor="effective-from"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Effective From
                  </label>

                  <input
                    id="effective-from"
                    name="effective_from"
                    type="date"
                    value={
                      form.effective_from
                    }
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />

                </div>

                {/* EFFECTIVE TO */}

                <div>

                  <label
                    htmlFor="effective-to"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Effective To
                  </label>

                  <input
                    id="effective-to"
                    name="effective_to"
                    type="date"
                    value={
                      form.effective_to
                    }
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Leave empty if there is no end date.
                  </p>

                </div>

                {/* STATUS */}

                <div>

                  <label
                    htmlFor="form-status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Status
                  </label>

                  <select
                    id="form-status"
                    name="status"
                    value={form.status || "ACTIVE"}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>

                  <p className="mt-1 text-xs text-slate-400">
                    Inactive slabs are excluded from new calculations.
                  </p>

                </div>

              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {saving && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {editingRule
                    ? "Update Rule"
                    : "Create Rule"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          CONFIRMATION DIALOG MODAL
      ====================================================== */}
      <ConfirmDialog
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        variant={confirmDialog?.variant}
        confirmText={confirmDialog?.confirmText}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />

    </div>
  );
};

export default AdminTaxRules;