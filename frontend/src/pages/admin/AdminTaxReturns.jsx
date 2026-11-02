import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Banknote,
  AlertCircle,
  Eye,
} from "lucide-react";
import AdminService from "@/services/adminService";
import LoadingState from "@/components/admin/LoadingState";
import ErrorState from "@/components/admin/ErrorState";

const AdminTaxReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await AdminService.getAllTaxReturns();
      if (res?.success) {
        setReturns(res.data || []);
      } else {
        throw new Error(res?.message || "Failed to load tax returns.");
      }
    } catch (err) {
      console.error("Admin tax returns error:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load tax returns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  // Distinct tax years
  const availableYears = useMemo(() => {
    const years = new Set(returns.map((r) => r.tax_year).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [returns]);

  // Status badge styling map
  const statusStyles = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    VALIDATED: "bg-blue-50 text-blue-700 border-blue-200",
    PAID: "bg-indigo-50 text-indigo-700 border-indigo-200",
    FILED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
    ACKNOWLEDGED: "bg-teal-50 text-teal-700 border-teal-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((ret) => {
      const matchesYear = selectedYear === "ALL" || ret.tax_year === selectedYear;
      const matchesStatus = selectedStatus === "ALL" || ret.return_status === selectedStatus;
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (ret.taxpayer_name && ret.taxpayer_name.toLowerCase().includes(searchLower)) ||
        (ret.taxpayer_email && ret.taxpayer_email.toLowerCase().includes(searchLower)) ||
        String(ret.id).includes(searchLower) ||
        String(ret.user_id).includes(searchLower);

      return matchesYear && matchesStatus && matchesSearch;
    });
  }, [returns, search, selectedYear, selectedStatus]);

  if (loading && returns.length === 0) {
    return <LoadingState message="Loading tax returns oversight..." />;
  }

  if (error && returns.length === 0) {
    return <ErrorState message={error} onRetry={loadReturns} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span>Tax Filing Lifecycle Oversight</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Tax Returns
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Audit draft, validated, paid, and filed tax returns across all registered taxpayers ({returns.length} total)
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by taxpayer name, email, or return ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="ALL">All Return Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="VALIDATED">Validated</option>
            <option value="PAID">Paid</option>
            <option value="FILED">Filed</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Year filter */}
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

      {/* Tax Returns Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Return / Taxpayer</th>
                <th className="px-4 py-3">Tax Year</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Taxable Income</th>
                <th className="px-4 py-3 text-right">Payable Tax</th>
                <th className="px-4 py-3 text-right">Refund</th>
                <th className="px-4 py-3">Submitted / Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                    No tax returns match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => {
                  const statusClass =
                    statusStyles[ret.return_status] || "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {ret.taxpayer_name || `User #${ret.user_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {ret.taxpayer_email || `ID: ${ret.user_id}`} • Return #{ret.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {ret.tax_year}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold border ${statusClass}`}
                        >
                          {ret.return_status || "DRAFT"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {Number(ret.payable_tax || 0) === 0 ? (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            {Number(ret.refund_amount || 0) > 0 ? "REFUND DUE" : "N/A"}
                          </span>
                        ) : ret.payment_status === "PAID" ? (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        ৳{Number(ret.taxable_income || 0).toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ৳{Number(ret.payable_tax || 0).toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {Number(ret.refund_amount || 0) > 0
                          ? `৳${Number(ret.refund_amount).toLocaleString("en-US")}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {ret.submitted_at || ret.created_at
                          ? new Date(ret.submitted_at || ret.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Draft"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTaxReturns;

