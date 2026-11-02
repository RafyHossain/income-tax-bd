import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Pencil,
  X,
  Power,
  Trash2,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminTaxRebateRuleService from "@/services/adminTaxRebateRuleService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "2026-27",
  rule_code: "REBATE_RATE",
  rule_name: "General Investment Rebate Rate",
  description: "15% tax rebate on allowable eligible investments",
  calculation_type: "PERCENTAGE",
  basis_type: "ALLOWABLE_INVESTMENT",
  rate: "15",
  fixed_amount: "",
  status: "ACTIVE",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
};

const PRESET_REBATE_RULES = [
  {
    code: "REBATE_RATE",
    name: "General Investment Rebate Rate",
    description: "15% (or 10% in 2026-27) tax rebate on allowable eligible investments",
    calcType: "PERCENTAGE",
    basisType: "ALLOWABLE_INVESTMENT",
    rate: "15",
    fixed: "",
  },
  {
    code: "INVESTMENT_INCOME_LIMIT",
    name: "Income-Based Investment Limit",
    description: "Maximum 3% of total taxable income under Section 78",
    calcType: "PERCENTAGE",
    basisType: "TAXABLE_INCOME",
    rate: "3",
    fixed: "",
  },
  {
    code: "INVESTMENT_ABSOLUTE_LIMIT",
    name: "Absolute Maximum Investment Cap",
    description: "Maximum allowable tax rebate cap (BDT 1,000,000 / 750,000 in 2026-27)",
    calcType: "LIMIT",
    basisType: "CONSTANT",
    rate: "",
    fixed: "1000000",
  },
];

const AdminTaxRebateRules = () => {
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
      const res = await AdminTaxRebateRuleService.getAvailableTaxYears();
      if (res?.data && res.data.length > 0) {
        setTaxYears(res.data);
      }
    } catch (err) {
      console.error("Failed to load tax years:", err);
    }
  };

  // Load all rebate rules with filters
  const loadRules = async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (selectedTaxYear) filters.tax_year = selectedTaxYear;
      if (selectedStatus) filters.status = selectedStatus;

      const res = await AdminTaxRebateRuleService.getAllRules(filters);
      setRules(res?.data || []);
    } catch (err) {
      console.error("Error loading rebate rules:", err);
      setRules([]);
      setError(err?.response?.data?.message || "Failed to load tax rebate rules.");
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
      tax_year: selectedTaxYear || (taxYears[0] || "2026-27"),
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      tax_year: rule.tax_year,
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description || "",
      calculation_type: rule.calculation_type,
      basis_type: rule.basis_type,
      rate: rule.rate !== null && rule.rate !== undefined ? String(rule.rate) : "",
      fixed_amount: rule.fixed_amount !== null && rule.fixed_amount !== undefined ? String(rule.fixed_amount) : "",
      status: rule.status,
      effective_from: rule.effective_from ? String(rule.effective_from).slice(0, 10) : "",
      effective_to: rule.effective_to ? String(rule.effective_to).slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleSelectPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      rule_code: preset.code,
      rule_name: preset.name,
      description: preset.description,
      calculation_type: preset.calcType,
      basis_type: preset.basisType,
      rate: preset.rate,
      fixed_amount: preset.fixed,
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tax_year || !form.rule_code || !form.rule_name || !form.calculation_type || !form.basis_type) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      tax_year: form.tax_year,
      rule_code: form.rule_code.trim().toUpperCase(),
      rule_name: form.rule_name.trim(),
      description: form.description?.trim() || null,
      calculation_type: form.calculation_type,
      basis_type: form.basis_type,
      rate: form.rate !== "" ? Number(form.rate) : null,
      fixed_amount: form.fixed_amount !== "" ? Number(form.fixed_amount) : null,
      status: form.status,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
    };

    try {
      setSaving(true);
      if (editingRule) {
        await AdminTaxRebateRuleService.updateRule(editingRule.id, payload);
        toast.success("Tax rebate rule updated successfully.");
      } else {
        await AdminTaxRebateRuleService.createRule(payload);
        toast.success("Tax rebate rule created successfully.");
      }
      setShowModal(false);
      loadRules();
      loadTaxYears();
    } catch (err) {
      console.error("Save rebate rule error:", err);
      toast.error(err?.response?.data?.message || "Failed to save tax rebate rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (rule) => {
    const nextStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await AdminTaxRebateRuleService.toggleStatus(rule.id, nextStatus);
      toast.success(`Rule status marked as ${nextStatus}`);
      loadRules();
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (rule) => {
    try {
      await AdminTaxRebateRuleService.deleteRule(rule.id);
      toast.success("Tax rebate rule deleted successfully.");
      setConfirmDialog(null);
      loadRules();
    } catch (err) {
      console.error("Delete rule error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete rule.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tax Rebate Rules
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
            Add Rule
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
                <option key={year} value={year}>{formatTaxYearLabel(year)}</option>
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

      {/* Rules Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Tax Year</th>
                <th className="px-4 py-3">Rule Code</th>
                <th className="px-4 py-3">Rule Name & Basis</th>
                <th className="px-4 py-3 text-center">Type</th>
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
                    <p className="mt-2 text-sm">Loading tax rebate rules...</p>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <TrendingUp className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">No tax rebate rules found</p>
                    <p className="text-xs text-slate-400">Click &ldquo;Add Rule&rdquo; to configure rebate parameter.</p>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{rule.tax_year}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{rule.rule_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{rule.rule_name}</div>
                      <div className="text-xs text-slate-500 font-mono">Basis: {rule.basis_type}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {rule.calculation_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {rule.calculation_type === "PERCENTAGE" && rule.rate !== null ? (
                        <span className="font-semibold text-slate-900">{rule.rate}%</span>
                      ) : rule.fixed_amount !== null ? (
                        <span className="font-semibold text-slate-900">BDT {Number(rule.fixed_amount).toLocaleString("en-BD")}</span>
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

      {/* Modal: Create / Edit Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRule ? "Edit Tax Rebate Rule" : "Create Tax Rebate Rule"}
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
              {!editingRule && (
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">
                    Quick Preset:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PRESET_REBATE_RULES.map((preset) => (
                      <button
                        type="button"
                        key={preset.code}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2 rounded-lg border text-left text-xs transition ${
                          form.rule_code === preset.code
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-mono text-[11px] truncate">{preset.code}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{preset.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                    Rule Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="rule_code"
                    value={form.rule_code}
                    onChange={handleFormChange}
                    placeholder="e.g. REBATE_RATE"
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="rule_name"
                  value={form.rule_name}
                  onChange={handleFormChange}
                  placeholder="e.g. General Investment Rebate Rate"
                  required
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Description</label>
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Detailed description or statutory reference"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                />
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
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="LIMIT">LIMIT (Cap)</option>
                    <option value="FIXED">FIXED</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Basis Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="basis_type"
                    value={form.basis_type}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value="ALLOWABLE_INVESTMENT">ALLOWABLE_INVESTMENT</option>
                    <option value="TAXABLE_INCOME">TAXABLE_INCOME</option>
                    <option value="CONSTANT">CONSTANT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    name="rate"
                    value={form.rate}
                    onChange={handleFormChange}
                    placeholder="e.g. 15.00"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Fixed Amount / Limit (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="fixed_amount"
                    value={form.fixed_amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 1000000"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <label className="text-xs font-medium text-slate-700">Effective To</label>
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
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
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
            <h3 className="text-base font-semibold text-slate-900">Delete Tax Rebate Rule?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete rule <strong>{confirmDialog.rule_code}</strong> for {confirmDialog.tax_year}?
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

export default AdminTaxRebateRules;
