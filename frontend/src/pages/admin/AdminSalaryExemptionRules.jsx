import { useEffect, useState } from "react";
import {
  PiggyBank,
  Plus,
  RefreshCw,
  Pencil,
  X,
  Power,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminSalaryExemptionRuleService from "@/services/adminSalaryExemptionRuleService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "2026-27",
  calculation_type: "ONE_THIRD",
  exemption_percentage: "33.33",
  max_exemption_amount: "500000",
  description: "Statutory salary exemption: 1/3 of salary income capped at BDT 500,000",
  status: "ACTIVE",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
};

const formatBDT = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return "BDT 0.00";
  return `BDT ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const AdminSalaryExemptionRules = () => {
  const [rules, setRules] = useState([]);
  const [taxYears, setTaxYears] = useState([]);

  const [selectedTaxYear, setSelectedTaxYear] = useState("");
  const [selectedCalculationType, setSelectedCalculationType] = useState("");
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
      const res = await AdminSalaryExemptionRuleService.getAvailableTaxYears();
      if (res?.data && res.data.length > 0) {
        setTaxYears(res.data);
      }
    } catch (err) {
      console.error("Failed to load tax years:", err);
    }
  };

  // Load all rules with filters
  const loadRules = async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (selectedTaxYear) filters.tax_year = selectedTaxYear;
      if (selectedCalculationType) filters.calculation_type = selectedCalculationType;
      if (selectedStatus) filters.status = selectedStatus;

      const res = await AdminSalaryExemptionRuleService.getAllRules(filters);
      setRules(res?.data || []);
    } catch (err) {
      console.error("Error loading salary exemption rules:", err);
      setRules([]);
      setError(err?.response?.data?.message || "Failed to load salary exemption rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxYears();
  }, []);

  useEffect(() => {
    loadRules();
  }, [selectedTaxYear, selectedCalculationType, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm,
      tax_year: selectedTaxYear || taxYears[0] || "2026-27",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      tax_year: item.tax_year,
      calculation_type: item.calculation_type || "ONE_THIRD",
      exemption_percentage: String(item.exemption_percentage ?? "33.33"),
      max_exemption_amount: String(item.max_exemption_amount ?? "500000"),
      description: item.description || "",
      status: item.status || "ACTIVE",
      effective_from: item.effective_from ? String(item.effective_from).slice(0, 10) : "",
      effective_to: item.effective_to ? String(item.effective_to).slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "calculation_type") {
        if (value === "ONE_THIRD") {
          next.exemption_percentage = "33.33";
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tax_year || form.max_exemption_amount === "" || !form.effective_from) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      tax_year: form.tax_year.trim(),
      calculation_type: form.calculation_type,
      exemption_percentage: Number(form.exemption_percentage) || 33.33,
      max_exemption_amount: Number(form.max_exemption_amount),
      description: form.description?.trim() || null,
      status: form.status,
      effective_from: form.effective_from,
      effective_to: form.effective_to ? form.effective_to : null,
    };

    try {
      setSaving(true);
      if (editingItem) {
        await AdminSalaryExemptionRuleService.updateRule(editingItem.id, payload);
        toast.success("Salary exemption rule updated successfully.");
      } else {
        await AdminSalaryExemptionRuleService.createRule(payload);
        toast.success("Salary exemption rule created successfully.");
      }
      setShowModal(false);
      loadRules();
      loadTaxYears();
    } catch (err) {
      console.error("Save salary exemption rule error:", err);
      toast.error(err?.response?.data?.message || "Failed to save salary exemption rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await AdminSalaryExemptionRuleService.toggleStatus(item.id, nextStatus);
      toast.success(`Rule status marked as ${nextStatus}`);
      loadRules();
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (item) => {
    try {
      await AdminSalaryExemptionRuleService.deleteRule(item.id);
      toast.success("Salary exemption rule deleted successfully.");
      setConfirmDialog(null);
      loadRules();
    } catch (err) {
      console.error("Delete rule error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete rule.");
    }
  };

  const totalRulesCount = rules.length;
  const activeRulesCount = rules.filter((r) => r.status === "ACTIVE").length;
  const currentActiveRule = rules.find((r) => r.status === "ACTIVE" && (r.tax_year === "2026-27" || r.tax_year === "2025-26"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Salary Exemption Rules
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
            Add Exemption Rule
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
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Assessment Years</option>
              {taxYears.map((yr) => (
                <option key={yr} value={yr}>
                  {formatTaxYearLabel(yr)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Calculation Type</label>
            <select
              value={selectedCalculationType}
              onChange={(e) => setSelectedCalculationType(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="ONE_THIRD">One-Third (1/3 of Salary)</option>
              <option value="PERCENTAGE">Custom Percentage (%)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Tax Year</th>
                <th className="px-6 py-3.5">Calculation Rule</th>
                <th className="px-6 py-3.5 text-right">Maximum Ceiling</th>
                <th className="px-6 py-3.5">Effective Period</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-xs">Loading salary exemption rules...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-red-500">
                    <AlertCircle className="mx-auto h-6 w-6" />
                    <p className="mt-1 text-xs">{error}</p>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-600">No salary exemption rules found</p>
                    <p className="text-xs text-slate-400">Click &ldquo;Add Exemption Rule&rdquo; to define a rule for an assessment year.</p>
                  </td>
                </tr>
              ) : (
                rules.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.tax_year}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            item.calculation_type === "ONE_THIRD"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {item.calculation_type === "ONE_THIRD" ? "1/3 of Salary" : `${item.exemption_percentage}% of Salary`}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatBDT(item.max_exemption_amount)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {item.effective_from ? String(item.effective_from).slice(0, 10) : "—"}
                          {" to "}
                          {item.effective_to ? String(item.effective_to).slice(0, 10) : "Open"}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={item.description || ""}>
                      {item.description || "—"}
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {item.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title={item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          className={`rounded p-1.5 transition ${
                            item.status === "ACTIVE"
                              ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
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

      {/* Modal: Create / Edit Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingItem ? "Edit Salary Exemption Rule" : "Create Salary Exemption Rule"}
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
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    {taxYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {formatTaxYearLabel(yr)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Calculation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="calculation_type"
                    value={form.calculation_type}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="ONE_THIRD">One-Third (1/3 of Salary)</option>
                    <option value="PERCENTAGE">Custom Percentage (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="exemption_percentage"
                    value={form.exemption_percentage}
                    onChange={handleFormChange}
                    disabled={form.calculation_type === "ONE_THIRD"}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {form.calculation_type === "ONE_THIRD" ? "Fixed statutory 33.33% (1/3)" : "Custom rate"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Max Exemption Ceiling (BDT) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    name="max_exemption_amount"
                    value={form.max_exemption_amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 500000"
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none font-semibold"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Maximum limit allowed in BDT
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Effective From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="effective_from"
                    value={form.effective_from}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Effective To (Optional)
                  </label>
                  <input
                    type="date"
                    name="effective_to"
                    value={form.effective_to}
                    onChange={handleFormChange}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Used in calculations)</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Description / Statutory Note</label>
                <textarea
                  name="description"
                  rows={2}
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="e.g. 1/3 of salary income capped at BDT 500,000 as per statutory amendment"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingItem ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Exemption Rule?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Are you sure you want to delete the salary exemption rule for tax year{" "}
              <strong className="text-slate-800">{confirmDialog.tax_year}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDialog)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSalaryExemptionRules;
