import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Pencil,
  X,
  Power,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminTaxThresholdService from "@/services/adminTaxThresholdService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "2026-27",
  category: "GENERAL",
  tax_free_threshold: "375000",
  status: "ACTIVE",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
};

const CATEGORIES = [
  { value: "GENERAL", label: "General Taxpayers", defaultExemption: 375000 },
  { value: "WOMEN", label: "Women Taxpayers", defaultExemption: 425000 },
  { value: "SENIOR_CITIZEN", label: "Senior Citizens (65+)", defaultExemption: 425000 },
  { value: "PHYSICALLY_CHALLENGED", label: "Physically Challenged", defaultExemption: 500000 },
  { value: "THIRD_GENDER", label: "Third Gender", defaultExemption: 500000 },
  { value: "WAR_WOUNDED_FREEDOM_FIGHTER", label: "War-Wounded Freedom Fighters", defaultExemption: 525000 },
  { value: "JULY_WARRIOR", label: "July 2024 Mass-Uprising Fighters", defaultExemption: 525000 },
];

const AdminTaxThresholds = () => {
  const [thresholds, setThresholds] = useState([]);
  const [taxYears, setTaxYears] = useState([]);

  const [selectedTaxYear, setSelectedTaxYear] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [confirmDialog, setConfirmDialog] = useState(null);

  // Load available tax years
  const loadTaxYears = async () => {
    try {
      const res = await AdminTaxThresholdService.getAvailableTaxYears();
      if (res?.data && res.data.length > 0) {
        setTaxYears(res.data);
      }
    } catch (err) {
      console.error("Failed to load tax years:", err);
    }
  };

  // Load all thresholds with filters
  const loadThresholds = async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (selectedTaxYear) filters.tax_year = selectedTaxYear;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedStatus) filters.status = selectedStatus;

      const res = await AdminTaxThresholdService.getAllThresholds(filters);
      setThresholds(res?.data || []);
    } catch (err) {
      console.error("Error loading tax thresholds:", err);
      setThresholds([]);
      setError(err?.response?.data?.message || "Failed to load tax thresholds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxYears();
  }, []);

  useEffect(() => {
    loadThresholds();
  }, [selectedTaxYear, selectedCategory, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm,
      tax_year: selectedTaxYear || (taxYears[0] || "2026-27"),
      category: "GENERAL",
      tax_free_threshold: "375000",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      tax_year: item.tax_year,
      category: item.category,
      tax_free_threshold: String(item.tax_free_threshold),
      status: item.status,
      effective_from: item.effective_from ? String(item.effective_from).slice(0, 10) : "",
      effective_to: item.effective_to ? String(item.effective_to).slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "category") {
        const found = CATEGORIES.find((c) => c.value === value);
        if (found) {
          next.tax_free_threshold = String(found.defaultExemption);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tax_year || !form.category || !form.tax_free_threshold) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      tax_year: form.tax_year,
      category: form.category,
      tax_free_threshold: Number(form.tax_free_threshold),
      status: form.status,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
    };

    try {
      setSaving(true);
      if (editingItem) {
        await AdminTaxThresholdService.updateThreshold(editingItem.id, payload);
        toast.success("Tax threshold updated successfully.");
      } else {
        await AdminTaxThresholdService.createThreshold(payload);
        toast.success("Tax threshold created successfully.");
      }
      setShowModal(false);
      loadThresholds();
      loadTaxYears();
    } catch (err) {
      console.error("Save tax threshold error:", err);
      toast.error(err?.response?.data?.message || "Failed to save tax threshold.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await AdminTaxThresholdService.toggleStatus(item.id, nextStatus);
      toast.success(`Threshold status marked as ${nextStatus}`);
      loadThresholds();
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (item) => {
    try {
      await AdminTaxThresholdService.deleteThreshold(item.id);
      toast.success("Tax threshold deleted successfully.");
      setConfirmDialog(null);
      loadThresholds();
    } catch (err) {
      console.error("Delete threshold error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete threshold.");
    }
  };

  const getCategoryLabel = (categoryValue) => {
    const found = CATEGORIES.find((c) => c.value === categoryValue);
    return found ? found.label : categoryValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tax Thresholds
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Threshold
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Tax Year</label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Tax Years</option>
              {taxYears.map((year) => (
                <option key={year} value={year}>{formatTaxYearLabel(year)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Thresholds Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Tax Year</th>
                <th className="px-4 py-3">Category Code</th>
                <th className="px-4 py-3">Category Description</th>
                <th className="px-4 py-3 text-right">Tax-Free Threshold</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm">Loading tax thresholds...</p>
                  </td>
                </tr>
              ) : thresholds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">No tax thresholds found</p>
                    <p className="text-xs text-slate-400">Click &ldquo;Add Threshold&rdquo; to configure exemption limit.</p>
                  </td>
                </tr>
              ) : (
                thresholds.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.tax_year}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 font-semibold">{item.category}</td>
                    <td className="px-4 py-3 text-slate-800">{getCategoryLabel(item.category)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      BDT {Number(item.tax_free_threshold).toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title={item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          className={`rounded p-1.5 transition ${
                            item.status === "ACTIVE"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit"
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDialog(item)}
                          title="Delete"
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Threshold */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingItem ? "Edit Tax Exemption Threshold" : "Create Tax Exemption Threshold"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Tax Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tax_year"
                    value={form.tax_year}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {taxYears.map((year) => (
                      <option key={year} value={year}>
                        {formatTaxYearLabel(year)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Tax-Free Threshold Exemption (BDT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="tax_free_threshold"
                  value={form.tax_free_threshold}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. 375000"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Effective From</label>
                  <input
                    type="date"
                    name="effective_from"
                    value={form.effective_from}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Effective To (Optional)</label>
                  <input
                    type="date"
                    name="effective_to"
                    value={form.effective_to}
                    onChange={handleFormChange}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingItem ? "Update Threshold" : "Create Threshold"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
            <Trash2 className="mx-auto h-10 w-10 text-red-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Delete Tax Threshold?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete category <strong>{confirmDialog.category}</strong> for {confirmDialog.tax_year}?
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDialog)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTaxThresholds;
