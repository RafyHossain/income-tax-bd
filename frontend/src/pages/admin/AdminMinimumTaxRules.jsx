import { useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  RefreshCw,
  Pencil,
  X,
  Power,
  ShieldCheck,
  Trash2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminMinimumTaxRuleService from "@/services/adminMinimumTaxRuleService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

const emptyForm = {
  tax_year: "2026-27",
  rule_type: "TAXPAYER_TYPE",
  area_code: "REGULAR_TAXPAYER",
  area_name: "",
  minimum_tax_amount: "5000",
  status: "ACTIVE",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
};

const RULE_TYPES = [
  { value: "TAXPAYER_TYPE", label: "Taxpayer Type Based (Regular vs New Taxpayer)" },
  { value: "AREA_BASED", label: "Area Based" },
];

const PRESET_CODES = {
  TAXPAYER_TYPE: [
    { code: "REGULAR_TAXPAYER", name: "Regular Taxpayer", amount: 5000 },
    { code: "NEW_TAXPAYER", name: "New / First-Time Taxpayer", amount: 1000 },
  ],
  AREA_BASED: [
    { code: "DHAKA_NORTH", name: "Dhaka North City Corporation", amount: 5000 },
    { code: "DHAKA_SOUTH", name: "Dhaka South City Corporation", amount: 5000 },
    { code: "CHATTOGRAM", name: "Chattogram City Corporation", amount: 5000 },
    { code: "OTHER_CITY", name: "Other City Corporations", amount: 4000 },
    { code: "POURASHAVA", name: "District Municipalities (Pourashava)", amount: 3000 },
    { code: "OTHER_AREA", name: "Other Areas / Rural Regions", amount: 3000 },
  ],
};

const AdminMinimumTaxRules = () => {
  const [rules, setRules] = useState([]);
  const [taxYears, setTaxYears] = useState([]);

  const [selectedTaxYear, setSelectedTaxYear] = useState("");
  const [selectedRuleType, setSelectedRuleType] = useState("");
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
      const res = await AdminMinimumTaxRuleService.getAvailableTaxYears();
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
      if (selectedRuleType) filters.rule_type = selectedRuleType;
      if (selectedStatus) filters.status = selectedStatus;

      const res = await AdminMinimumTaxRuleService.getAllRules(filters);
      setRules(res?.data || []);
    } catch (err) {
      console.error("Error loading minimum tax rules:", err);
      setRules([]);
      setError(err?.response?.data?.message || "Failed to load minimum tax rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxYears();
  }, []);

  useEffect(() => {
    loadRules();
  }, [selectedTaxYear, selectedRuleType, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setForm({
      ...emptyForm,
      tax_year: selectedTaxYear || (taxYears[0] || "2026-27"),
      area_name: PRESET_CODES.TAXPAYER_TYPE[0].name,
      area_code: PRESET_CODES.TAXPAYER_TYPE[0].code,
      minimum_tax_amount: String(PRESET_CODES.TAXPAYER_TYPE[0].amount),
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      tax_year: rule.tax_year,
      rule_type: rule.rule_type || "TAXPAYER_TYPE",
      area_code: rule.area_code,
      area_name: rule.area_name,
      minimum_tax_amount: String(rule.minimum_tax_amount),
      status: rule.status,
      effective_from: rule.effective_from ? String(rule.effective_from).slice(0, 10) : "",
      effective_to: rule.effective_to ? String(rule.effective_to).slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // Auto-fill area name & default amount when selecting preset code
      if (name === "rule_type") {
        const presets = PRESET_CODES[value] || [];
        if (presets.length > 0) {
          next.area_code = presets[0].code;
          next.area_name = presets[0].name;
          next.minimum_tax_amount = String(presets[0].amount);
        }
      } else if (name === "area_code") {
        const presets = PRESET_CODES[next.rule_type] || [];
        const found = presets.find((p) => p.code === value);
        if (found) {
          next.area_name = found.name;
          next.minimum_tax_amount = String(found.amount);
        }
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tax_year || !form.area_code || !form.area_name || !form.minimum_tax_amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      tax_year: form.tax_year,
      rule_type: form.rule_type,
      area_code: form.area_code.trim().toUpperCase(),
      area_name: form.area_name.trim(),
      minimum_tax_amount: Number(form.minimum_tax_amount),
      status: form.status,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
    };

    try {
      setSaving(true);
      if (editingRule) {
        await AdminMinimumTaxRuleService.updateRule(editingRule.id, payload);
        toast.success("Minimum tax rule updated successfully.");
      } else {
        await AdminMinimumTaxRuleService.createRule(payload);
        toast.success("Minimum tax rule created successfully.");
      }
      setShowModal(false);
      loadRules();
      loadTaxYears();
    } catch (err) {
      console.error("Save minimum tax rule error:", err);
      toast.error(err?.response?.data?.message || "Failed to save minimum tax rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (rule) => {
    const nextStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await AdminMinimumTaxRuleService.toggleStatus(rule.id, nextStatus);
      toast.success(`Rule marked as ${nextStatus}`);
      loadRules();
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (rule) => {
    try {
      await AdminMinimumTaxRuleService.deleteRule(rule.id);
      toast.success("Minimum tax rule deleted successfully.");
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
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Minimum Tax Rules
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
            <label className="text-xs font-medium text-slate-600">Rule Type</label>
            <select
              value={selectedRuleType}
              onChange={(e) => setSelectedRuleType(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Rule Types</option>
              <option value="TAXPAYER_TYPE">Taxpayer Type (Regular / New)</option>
              <option value="AREA_BASED">Area Based (City Corp / Pourashava)</option>
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
                <th className="px-4 py-3">Rule Type</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Description / Area Name</th>
                <th className="px-4 py-3 text-right">Min Tax Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm">Loading minimum tax rules...</p>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">No minimum tax rules found</p>
                    <p className="text-xs text-slate-400">Click &ldquo;Add Rule&rdquo; to create a new minimum tax rule.</p>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{rule.tax_year}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          rule.rule_type === "TAXPAYER_TYPE"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {rule.rule_type === "TAXPAYER_TYPE" ? "Taxpayer Type" : "Area Based"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 font-semibold">{rule.area_code}</td>
                    <td className="px-4 py-3 text-slate-800">{rule.area_name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      BDT {Number(rule.minimum_tax_amount).toLocaleString("en-BD")}
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
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRule ? "Edit Minimum Tax Rule" : "Create Minimum Tax Rule"}
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
                    Rule Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="rule_type"
                    value={form.rule_type}
                    onChange={handleFormChange}
                    required
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {RULE_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Select Preset or Enter Code <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    name="area_code"
                    value={form.area_code}
                    onChange={handleFormChange}
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    {(PRESET_CODES[form.rule_type] || []).map((p) => (
                      <option key={p.code} value={p.code}>{p.code} ({p.name})</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  name="area_code"
                  value={form.area_code}
                  onChange={handleFormChange}
                  placeholder="Custom code (e.g. REGULAR_TAXPAYER)"
                  required
                  className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Area / Taxpayer Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="area_name"
                  value={form.area_name}
                  onChange={handleFormChange}
                  placeholder="e.g. Regular Taxpayer"
                  required
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Minimum Tax (BDT) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="minimum_tax_amount"
                    value={form.minimum_tax_amount}
                    onChange={handleFormChange}
                    required
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
            <h3 className="text-base font-semibold text-slate-900">Delete Minimum Tax Rule?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete rule <strong>{confirmDialog.area_code}</strong> for {confirmDialog.tax_year}?
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

export default AdminMinimumTaxRules;
