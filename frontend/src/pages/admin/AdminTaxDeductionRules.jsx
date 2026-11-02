import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Pencil,
  X,
  Power,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminDeductionRuleService from "@/services/adminDeductionRuleService";
import TaxRuleService from "@/services/taxRuleService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "2026-27",
  deduction_code: "",
  deduction_name: "",
  description: "",
  income_type: "",
  calculation_type: "ACTUAL",
  deduction_rate: "0",
  maximum_amount: "",
  status: "ACTIVE",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
};

const CALCULATION_TYPES = ["ACTUAL", "FIXED", "PERCENTAGE", "LIMITED"];

const INCOME_TYPES = [
  { value: "", label: "All Income Types / General" },
  { value: "SALARY", label: "Salary Income" },
  { value: "BUSINESS", label: "Business / Profession" },
  { value: "HOUSE_PROPERTY", label: "House Property" },
  { value: "AGRICULTURE", label: "Agricultural Income" },
  { value: "CAPITAL_GAINS", label: "Capital Gains" },
  { value: "OTHER", label: "Other Sources" },
];

const AdminTaxDeductionRules = () => {
  const [rules, setRules] = useState([]);
  const [taxYears, setTaxYears] = useState([]);

  const [selectedTaxYear, setSelectedTaxYear] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [confirmDialog, setConfirmDialog] = useState(null);

  // Load available tax years
  const loadTaxYears = async () => {
    try {
      const res = await TaxRuleService.getAvailableTaxYears();
      if (res?.data && res.data.length > 0) {
        setTaxYears(res.data);
      }
    } catch (err) {
      console.error("Tax year loading error:", err);
    }
  };

  // Load rules with filters
  const loadRules = async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (selectedTaxYear) filters.tax_year = selectedTaxYear;
      if (selectedStatus) filters.status = selectedStatus;

      const res = await AdminDeductionRuleService.getAllDeductionRules(filters);
      setRules(res?.data || []);
    } catch (err) {
      console.error("Deduction rules loading error:", err);
      setRules([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load deduction rules."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxYears();
  }, []);

  useEffect(() => {
    loadRules();
  }, [selectedTaxYear, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setForm({
      ...emptyForm,
      tax_year: selectedTaxYear || taxYears[0] || "2026-27",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      tax_year: rule.tax_year || "2026-27",
      deduction_code: rule.deduction_code || "",
      deduction_name: rule.deduction_name || "",
      description: rule.description || "",
      income_type: rule.income_type || "",
      calculation_type: rule.calculation_type || "ACTUAL",
      deduction_rate: rule.deduction_rate !== null ? String(rule.deduction_rate) : "0",
      maximum_amount: rule.maximum_amount !== null ? String(rule.maximum_amount) : "",
      status: rule.status || "ACTIVE",
      effective_from: rule.effective_from ? String(rule.effective_from).slice(0, 10) : "",
      effective_to: rule.effective_to ? String(rule.effective_to).slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tax_year || !form.deduction_code || !form.deduction_name) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      tax_year: form.tax_year,
      deduction_code: form.deduction_code.trim().toUpperCase(),
      deduction_name: form.deduction_name.trim(),
      description: form.description.trim(),
      income_type: form.income_type || null,
      calculation_type: form.calculation_type,
      deduction_rate: Number(form.deduction_rate) || 0,
      maximum_amount: form.maximum_amount !== "" ? Number(form.maximum_amount) : null,
      status: form.status,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
    };

    try {
      setSaving(true);
      if (editingRule) {
        await AdminDeductionRuleService.updateDeductionRule(editingRule.id, payload);
        toast.success("Deduction rule updated successfully.");
      } else {
        await AdminDeductionRuleService.createDeductionRule(payload);
        toast.success("Deduction rule created successfully.");
      }
      setShowModal(false);
      loadRules();
    } catch (err) {
      console.error("Save deduction rule error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save deduction rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (rule) => {
    const nextStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await AdminDeductionRuleService.updateDeductionRuleStatus(rule.id, nextStatus);
      toast.success(`Rule marked as ${nextStatus}`);
      loadRules();
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (rule) => {
    try {
      await AdminDeductionRuleService.deleteDeductionRule(rule.id);
      toast.success("Deduction rule deleted successfully.");
      setConfirmDialog(null);
      loadRules();
    } catch (err) {
      console.error("Delete deduction rule error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete deduction rule.");
    }
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    const num = Number(val);
    if (isNaN(num)) return "—";
    return `BDT ${num.toLocaleString("en-BD")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tax Deduction Rules
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
            Add Deduction Rule
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Tax Year</label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Tax Years</option>
              {taxYears.map((year) => (
                <option key={year} value={year}>
                  {formatTaxYearLabel(year)}
                </option>
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

      {/* Deduction Rules Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Tax Year</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name & Description</th>
                <th className="px-4 py-3 text-center">Calc Type</th>
                <th className="px-4 py-3 text-right">Rate / Cap</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm">Loading deduction rules...</p>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <FileText className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">No deduction rules found</p>
                    <p className="text-xs text-slate-400">Click &ldquo;Add Deduction Rule&rdquo; to configure allowable deduction.</p>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{rule.tax_year}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{rule.deduction_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{rule.deduction_name}</div>
                      {rule.description && (
                        <div className="text-xs text-slate-500 truncate max-w-xs">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {rule.calculation_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {rule.calculation_type === "PERCENTAGE" && Number(rule.deduction_rate) > 0 ? (
                        <span>{rule.deduction_rate}%</span>
                      ) : rule.maximum_amount !== null ? (
                        <span>{formatMoney(rule.maximum_amount)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {rule.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(rule)}
                          title={rule.status === "ACTIVE" ? "Deactivate" : "Activate"}
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
                          onClick={() => handleOpenEdit(rule)}
                          title="Edit"
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDialog(rule)}
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

      {/* Modal: Create / Edit Deduction Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRule ? "Edit Deduction Rule" : "Create Deduction Rule"}
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
                    Income Type
                  </label>
                  <select
                    name="income_type"
                    value={form.income_type}
                    onChange={handleFormChange}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {INCOME_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Deduction Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="deduction_code"
                    required
                    value={form.deduction_code}
                    onChange={handleFormChange}
                    placeholder="e.g. HOME_REPAIR"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono uppercase focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Deduction Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="deduction_name"
                    required
                    value={form.deduction_name}
                    onChange={handleFormChange}
                    placeholder="e.g. House Property Repair"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Calculation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="calculation_type"
                    value={form.calculation_type}
                    onChange={handleFormChange}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {CALCULATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    name="deduction_rate"
                    value={form.deduction_rate}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Maximum Amount (BDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="maximum_amount"
                    value={form.maximum_amount}
                    onChange={handleFormChange}
                    placeholder="Optional cap"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
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
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Statutory explanation or clause"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Effective From</label>
                  <input
                    type="date"
                    name="effective_from"
                    value={form.effective_from}
                    onChange={handleFormChange}
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
                  {saving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
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
            <h3 className="text-base font-semibold text-slate-900">Delete Deduction Rule?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete rule <strong>{confirmDialog.deduction_code || confirmDialog.deduction_name}</strong> for {confirmDialog.tax_year}?
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

export default AdminTaxDeductionRules;
