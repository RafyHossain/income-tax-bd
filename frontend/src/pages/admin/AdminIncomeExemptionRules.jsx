import { useEffect, useState } from "react";
import {
  PiggyBank,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Power,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminIncomeExemptionRuleService from "@/services/adminIncomeExemptionRuleService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "2026-27",
  income_type: "SALARY",
  exemption_code: "",
  exemption_name: "",
  exemption_type: "MAX_AMOUNT",
  percentage: "0",
  max_exemption_amount: "500000",
  fraction_numerator: "1",
  fraction_denominator: "3",
  description: "",
  status: "ACTIVE",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
};

const INCOME_TYPES = [
  { value: "SALARY", label: "Salary Income" },
  { value: "AGRICULTURE", label: "Agricultural Income" },
  { value: "BUSINESS", label: "Business / Profession" },
  { value: "HOUSE_PROPERTY", label: "House Property" },
  { value: "CAPITAL_GAINS", label: "Capital Gains" },
  { value: "OTHER", label: "Other Sources" },
];

const EXEMPTION_TYPES = [
  { value: "MAX_AMOUNT", label: "Fixed Maximum Cap (BDT)" },
  { value: "PERCENTAGE", label: "Percentage of Income" },
  { value: "PORTION", label: "Fractional Portion (e.g. 1/3)" },
  { value: "RATIO", label: "Ratio Based" },
];

const formatBDT = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return "BDT 0.00";
  return `BDT ${num.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const AdminIncomeExemptionRules = () => {
  const [rules, setRules] = useState([]);
  const [taxYears, setTaxYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTaxYear, setSelectedTaxYear] = useState("");
  const [selectedIncomeType, setSelectedIncomeType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadTaxYears = async () => {
    try {
      const res = await AdminIncomeExemptionRuleService.getAvailableTaxYears();
      if (res?.data && res.data.length > 0) {
        setTaxYears(res.data);
      }
    } catch (err) {
      console.error("Failed to load tax years:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (selectedTaxYear) params.tax_year = selectedTaxYear;
      if (selectedIncomeType) params.income_type = selectedIncomeType;
      if (selectedStatus) params.status = selectedStatus;

      const res = await AdminIncomeExemptionRuleService.getAllRules(params);
      if (res?.success) {
        setRules(res.data || []);
      } else {
        throw new Error(res?.message || "Failed to load income exemption rules.");
      }
    } catch (err) {
      console.error(err);
      setRules([]);
      setError(err?.response?.data?.message || err?.message || "Failed to load rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxYears();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedTaxYear, selectedIncomeType, selectedStatus]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm,
      tax_year: selectedTaxYear || taxYears[0] || "2026-27",
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      tax_year: item.tax_year || "2026-27",
      income_type: item.income_type || "SALARY",
      exemption_code: item.exemption_code || "",
      exemption_name: item.exemption_name || "",
      exemption_type: item.exemption_type || "MAX_AMOUNT",
      percentage: item.percentage ? String(item.percentage) : "0",
      max_exemption_amount: item.max_exemption_amount ? String(item.max_exemption_amount) : "0",
      fraction_numerator: item.fraction_numerator ? String(item.fraction_numerator) : "1",
      fraction_denominator: item.fraction_denominator ? String(item.fraction_denominator) : "3",
      description: item.description || "",
      status: item.status || "ACTIVE",
      effective_from: item.effective_from ? item.effective_from.split("T")[0] : "",
      effective_to: item.effective_to ? item.effective_to.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.tax_year || !form.income_type) {
      toast.error("Tax year and income type are required.");
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        const res = await AdminIncomeExemptionRuleService.updateRule(editingItem.id, form);
        if (res.success) {
          toast.success(res.message || "Exemption rule updated successfully.");
          setShowModal(false);
          loadData();
        }
      } else {
        const res = await AdminIncomeExemptionRuleService.createRule(form);
        if (res.success) {
          toast.success(res.message || "Exemption rule created successfully.");
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

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await AdminIncomeExemptionRuleService.toggleStatus(item.id, nextStatus);
      toast.success(res?.message || `Rule status updated to ${nextStatus}.`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async (item) => {
    try {
      const res = await AdminIncomeExemptionRuleService.deleteRule(item.id);
      toast.success(res?.message || "Exemption rule deleted successfully.");
      setConfirmDialog(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete exemption rule.");
    }
  };

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
              Income Exemption Rules
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
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
            <label className="text-xs font-medium text-slate-600">Income Type</label>
            <select
              value={selectedIncomeType}
              onChange={(e) => setSelectedIncomeType(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Income Types</option>
              {INCOME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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

      {/* Exemption Rules Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Tax Year</th>
                <th className="px-4 py-3">Income Type</th>
                <th className="px-4 py-3">Rule Code & Name</th>
                <th className="px-4 py-3">Calculation / Cap</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm">Loading income exemption rules...</p>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <PiggyBank className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">No exemption rules found</p>
                    <p className="text-xs text-slate-400">Click &ldquo;Add Exemption Rule&rdquo; to configure statutory limit.</p>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{rule.tax_year}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                        {rule.income_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-bold text-slate-800">{rule.exemption_code || "—"}</div>
                      {rule.exemption_name && (
                        <div className="text-xs text-slate-500 font-medium">{rule.exemption_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-slate-700">{rule.exemption_type}</span>
                      {Number(rule.max_exemption_amount) > 0 && (
                        <p className="text-emerald-700 font-medium">Max: {formatBDT(rule.max_exemption_amount)}</p>
                      )}
                      {rule.exemption_type === "PERCENTAGE" && Number(rule.percentage) > 0 && (
                        <p className="text-slate-500">{rule.percentage}% of income</p>
                      )}
                      {rule.exemption_type === "PORTION" && (
                        <p className="text-slate-500">
                          Portion: {rule.fraction_numerator || 1}/{rule.fraction_denominator || 3}
                        </p>
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
                          onClick={() => openEditModal(rule)}
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

      {/* Modal: Create / Edit Exemption Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingItem ? "Edit Exemption Rule" : "Create Exemption Rule"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Tax Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tax_year"
                    value={form.tax_year}
                    onChange={(e) => setForm({ ...form, tax_year: e.target.value })}
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
                    Income Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="income_type"
                    value={form.income_type}
                    onChange={(e) => setForm({ ...form, income_type: e.target.value })}
                    required
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
                    Exemption Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.exemption_code}
                    onChange={(e) => setForm({ ...form, exemption_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SALARY_ONE_THIRD"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Exemption Name
                  </label>
                  <input
                    type="text"
                    value={form.exemption_name}
                    onChange={(e) => setForm({ ...form, exemption_name: e.target.value })}
                    placeholder="e.g. Statutory Salary Exemption"
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
                    value={form.exemption_type}
                    onChange={(e) => setForm({ ...form, exemption_type: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {EXEMPTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Maximum Cap (BDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.max_exemption_amount}
                    onChange={(e) => setForm({ ...form, max_exemption_amount: e.target.value })}
                    placeholder="500000"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {form.exemption_type === "PERCENTAGE" && (
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Exemption Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.percentage}
                    onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                    placeholder="e.g. 33.33"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              )}

              {form.exemption_type === "PORTION" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Numerator</label>
                    <input
                      type="number"
                      min="1"
                      value={form.fraction_numerator}
                      onChange={(e) => setForm({ ...form, fraction_numerator: e.target.value })}
                      placeholder="1"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Denominator</label>
                    <input
                      type="number"
                      min="1"
                      value={form.fraction_denominator}
                      onChange={(e) => setForm({ ...form, fraction_denominator: e.target.value })}
                      placeholder="3"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Description / Law Reference</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Section 32(1) of Bangladesh Income Tax Act 2023"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none"
                />
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
                  {saving ? "Saving..." : editingItem ? "Update Rule" : "Create Rule"}
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
            <h3 className="text-base font-semibold text-slate-900">Delete Exemption Rule?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete rule <strong>{confirmDialog.exemption_code || confirmDialog.exemption_name}</strong> for {confirmDialog.tax_year}?
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

export default AdminIncomeExemptionRules;
