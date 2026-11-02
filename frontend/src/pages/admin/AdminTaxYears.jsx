import React, { useEffect, useState } from "react";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Power,
  Star,
  X,
  FileCheck2,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminTaxYearService from "@/services/adminTaxYearService";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import LoadingState from "@/components/admin/LoadingState";
import ErrorState from "@/components/admin/ErrorState";
import {
  getIncomeYearFromAssessmentYear,
  getAssessmentYearDateRange,
} from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "",
  income_year: "",
  start_date: "",
  end_date: "",
  status: "ACTIVE",
  is_current: 0,
  description: "",
};

const AdminTaxYears = () => {
  const [taxYears, setTaxYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await AdminTaxYearService.getAllTaxYears();
      if (res?.success) {
        setTaxYears(res.data || []);
      } else {
        throw new Error(res?.message || "Failed to load tax years.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Failed to load tax years.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm,
      start_date: `${new Date().getFullYear()}-07-01`,
      end_date: `${new Date().getFullYear() + 1}-06-30`,
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      tax_year: item.tax_year || "",
      income_year: item.income_year || "",
      start_date: item.start_date ? item.start_date.split("T")[0] : "",
      end_date: item.end_date ? item.end_date.split("T")[0] : "",
      status: item.status || "ACTIVE",
      is_current: item.is_current ? 1 : 0,
      description: item.description || "",
    });
    setShowModal(true);
  };

  const handleTaxYearChange = (val) => {
    const updated = { ...form, tax_year: val };
    if (/^\d{4}-\d{2}$/.test(val.trim())) {
      const derivedIncomeYear = getIncomeYearFromAssessmentYear(val.trim());
      const dates = getAssessmentYearDateRange(val.trim());
      if (derivedIncomeYear) updated.income_year = derivedIncomeYear;
      if (dates) {
        updated.start_date = dates.startDate;
        updated.end_date = dates.endDate;
      }
      if (!updated.description || updated.description.startsWith("Finance Act")) {
        updated.description = `Finance Act ${val.trim().split("-")[0]} Statutory Assessment Year`;
      }
    }
    setForm(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.tax_year.trim()) {
      toast.error("Tax year is required (e.g. 2026-27).");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.tax_year.trim())) {
      toast.error("Tax year must match YYYY-YY format (e.g. 2026-27).");
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        const res = await AdminTaxYearService.updateTaxYear(editingItem.id, form);
        if (res.success) {
          toast.success(res.message || "Tax year updated successfully.");
          setShowModal(false);
          loadData();
        }
      } else {
        const res = await AdminTaxYearService.createTaxYear(form);
        if (res.success) {
          toast.success(res.message || "Tax year created successfully.");
          setShowModal(false);
          loadData();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (item) => {
    if (item.is_current === 1) {
      toast.error("The current active assessment year is protected and cannot be deactivated.");
      return;
    }
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setConfirmDialog({
      title: `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} Tax Year`,
      message: `Are you sure you want to change status of ${item.tax_year} to ${nextStatus}?`,
      variant: nextStatus === "ACTIVE" ? "primary" : "warning",
      confirmText: nextStatus === "ACTIVE" ? "Activate" : "Deactivate",
      onConfirm: async () => {
        try {
          const res = await AdminTaxYearService.toggleStatus(item.id, nextStatus);
          toast.success(res?.message || `Tax year marked as ${nextStatus}.`);
          setConfirmDialog(null);
          loadData();
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || "Failed to toggle status.");
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleSetCurrent = async (item) => {
    if (item.is_current) return;
    try {
      const res = await AdminTaxYearService.setCurrent(item.id, 1);
      toast.success(res?.message || `${item.tax_year} is now the default current tax year.`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to set as current year.");
    }
  };

  const handleDeleteTaxYear = (item) => {
    if (item.is_current === 1) {
      toast.error("The current active assessment year is protected. Please set another assessment year as current before deleting this year.");
      return;
    }

    const refCount = Number(item.reference_count || 0);

    setConfirmDialog({
      title: "Delete Tax Year",
      message:
        refCount > 0
          ? `Are you sure you want to permanently delete Assessment Year ${item.tax_year}? All ${refCount} related statutory rules, thresholds, minimum tax, rebates, surcharges, calculations, and returns for this year will also be deleted. This action cannot be undone.`
          : `Are you sure you want to permanently delete Assessment Year ${item.tax_year}? This action cannot be undone.`,
      variant: "danger",
      confirmText: "Delete Tax Year",
      onConfirm: async () => {
        try {
          const res = await AdminTaxYearService.deleteTaxYear(item.id);
          toast.success(res?.message || "Tax Year and all related records deleted successfully.");
          setConfirmDialog(null);
          loadData();
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || "Failed to delete tax year.");
          setConfirmDialog(null);
        }
      },
    });
  };

  const filteredData = taxYears.filter((item) => {
    return !statusFilter || item.status === statusFilter;
  });

  const columns = [
    {
      title: "Tax Year (AY)",
      key: "tax_year",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{val}</span>
          {row.is_current === 1 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              Current
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Income Year",
      key: "income_year",
      render: (val) => <span className="font-medium text-slate-700">{val || "—"}</span>,
    },
    {
      title: "Period Dates",
      key: "start_date",
      render: (val, row) => (
        <span className="text-xs text-slate-600">
          {row.start_date ? row.start_date.split("T")[0] : "—"} to{" "}
          {row.end_date ? row.end_date.split("T")[0] : "—"}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: "Description",
      key: "description",
      render: (val) => (
        <span className="text-xs text-slate-500 line-clamp-1 max-w-[220px]" title={val}>
          {val || "No notes"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleSetCurrent(row)}
            disabled={row.is_current === 1}
            title={row.is_current ? "Already current year" : "Set as current assessment year"}
            className={`rounded-lg p-1.5 transition ${
              row.is_current
                ? "text-amber-500 bg-amber-50/70 opacity-60 cursor-default"
                : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
            }`}
          >
            <Star className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            disabled={row.is_current === 1}
            title={
              row.is_current === 1
                ? "Current assessment year cannot be deactivated"
                : row.status === "ACTIVE"
                ? "Deactivate"
                : "Activate"
            }
            className={`rounded-lg p-1.5 transition ${
              row.is_current === 1
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            title="Edit Tax Year"
            className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteTaxYear(row)}
            disabled={row.is_current === 1}
            title={
              row.is_current === 1
                ? "Current assessment year is protected"
                : "Delete Tax Year & All Related Records"
            }
            className={`rounded-lg p-1.5 transition ${
              row.is_current === 1
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-400 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading && taxYears.length === 0) {
    return <LoadingState message="Loading tax years..." />;
  }

  if (error && taxYears.length === 0) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span>Fiscal Calendar Management</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Assessment & Income Years
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure statutory Bangladesh tax years, period boundaries, and designate active filing years.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Tax Year
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <span className="text-xs font-medium text-slate-500">
          Showing {filteredData.length} of {taxYears.length} tax years
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyTitle="No tax years found"
        emptyDescription="No tax years match the selected status or add a new tax year."
      />

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingItem ? "Edit Tax Year" : "Create Tax Year"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingItem ? `Update details for ${editingItem.tax_year}` : "Define a new fiscal assessment period"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax Year (Assessment Year) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={form.tax_year}
                    onChange={(e) => handleTaxYearChange(e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                  />
                  <p className="mt-0.5 text-[10px] text-slate-400">Format: YYYY-YY</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Income Year
                  </label>
                  <input
                    type="text"
                    value={form.income_year}
                    onChange={(e) => setForm({ ...form, income_year: e.target.value })}
                    placeholder="e.g. 2025-26"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-0.5 text-[10px] text-slate-400">Preceding fiscal year</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Current Year
                  </label>
                  <select
                    value={form.is_current}
                    onChange={(e) => setForm({ ...form, is_current: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value={0}>No (Historical / Future)</option>
                    <option value={1}>Yes (Active Default)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Statutory Reference
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Bangladesh Finance Act 2026 assessment year"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {saving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {editingItem ? "Update Tax Year" : "Create Tax Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
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

export default AdminTaxYears;

