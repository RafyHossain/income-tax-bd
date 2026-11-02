import React, { useEffect, useState, useMemo } from "react";
import {
  Calculator,
  Search,
  Users,
  Calendar,
  Wallet,
  ArrowUpDown,
  FileText,
  Clock,
  Filter,
} from "lucide-react";
import AdminService from "@/services/adminService";
import LoadingState from "@/components/admin/LoadingState";
import ErrorState from "@/components/admin/ErrorState";

const AdminTaxCalculations = () => {
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("ALL");

  const loadCalculations = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await AdminService.getAllCalculations();
      if (res?.success) {
        setCalculations(res.data || []);
      } else {
        throw new Error(res?.message || "Failed to load calculations.");
      }
    } catch (err) {
      console.error("Admin tax calculations error:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load calculations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalculations();
  }, []);

  // Distinct tax years
  const availableYears = useMemo(() => {
    const years = new Set(calculations.map((c) => c.tax_year).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [calculations]);

  // Filtered calculations
  const filteredCalculations = useMemo(() => {
    return calculations.filter((calc) => {
      const matchesYear = selectedYear === "ALL" || calc.tax_year === selectedYear;
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (calc.user_name && calc.user_name.toLowerCase().includes(searchLower)) ||
        (calc.user_email && calc.user_email.toLowerCase().includes(searchLower)) ||
        String(calc.user_id).includes(searchLower) ||
        (calc.category && calc.category.toLowerCase().includes(searchLower));

      return matchesYear && matchesSearch;
    });
  }, [calculations, search, selectedYear]);

  if (loading && calculations.length === 0) {
    return <LoadingState message="Loading tax calculations oversight..." />;
  }

  if (error && calculations.length === 0) {
    return <ErrorState message={error} onRetry={loadCalculations} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calculator className="h-4 w-4 text-emerald-600" />
            <span>Calculation Simulation Oversight</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Tax Calculations
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Audit and view individual progressive tax calculations across all taxpayers ({calculations.length} total)
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by taxpayer name, email, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="ALL">All Assessment Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                AY {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculations Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">ID / User</th>
                <th className="px-4 py-3">Tax Year</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Total Income</th>
                <th className="px-4 py-3 text-right">Taxable Income</th>
                <th className="px-4 py-3 text-right">Net Tax</th>
                <th className="px-4 py-3 text-right">Final Payable</th>
                <th className="px-4 py-3 text-right">Refund</th>
                <th className="px-4 py-3">Calculated Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalculations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                    No tax calculations match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCalculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {calc.user_name || `User #${calc.user_id}`}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {calc.user_email || `ID: ${calc.user_id}`} • Calc #{calc.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {calc.tax_year}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {calc.category || "GENERAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      ৳{Number(calc.total_income || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      ৳{Number(calc.taxable_income || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      ৳{Number(calc.net_tax || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      ৳{Number(calc.final_payable || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {Number(calc.refund_amount || 0) > 0
                        ? `৳${Number(calc.refund_amount).toLocaleString("en-US")}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {calc.calculated_at || calc.created_at
                        ? new Date(calc.calculated_at || calc.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTaxCalculations;

