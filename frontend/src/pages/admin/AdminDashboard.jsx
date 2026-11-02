import React, { useEffect, useState } from "react";
import {
  Users,
  WalletCards,
  Receipt,
  ShieldCheck,
  FileText,
  Banknote,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
} from "lucide-react";
import { Link } from "react-router";

import AdminService from "@/services/adminService";
import AdminTaxYearService from "@/services/adminTaxYearService";
import DashboardStatCard from "@/components/admin/DashboardStatCard";
import LoadingState from "@/components/admin/LoadingState";
import ErrorState from "@/components/admin/ErrorState";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [taxYears, setTaxYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardRes, yearsRes] = await Promise.all([
        AdminService.getDashboardStats(),
        AdminTaxYearService.getAllTaxYears().catch(() => ({ data: [] })),
      ]);

      if (!dashboardRes?.success) {
        throw new Error(
          dashboardRes?.message || "Failed to load admin statistics."
        );
      }

      setStats(dashboardRes.data);
      setTaxYears(yearsRes?.data || []);
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard statistics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && !stats) {
    return <LoadingState message="Loading administration dashboard..." />;
  }

  if (error && !stats) {
    return <ErrorState message={error} onRetry={loadDashboardData} />;
  }

  const currentYearObj =
    taxYears.find((y) => y.is_current === 1) || taxYears[0];

  const statusConfig = {
    DRAFT: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
    VALIDATED: { label: "Validated", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    PAID: { label: "Paid", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    FILED: { label: "Filed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    SUBMITTED: { label: "Submitted", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    ACKNOWLEDGED: { label: "Acknowledged", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    REJECTED: { label: "Rejected", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const returnOverview = stats?.returnStatusOverview || [];
  const totalReturnCount = returnOverview.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0
  );

  const recentReturns = stats?.recentReturns || [];
  const pendingRefunds = stats?.pendingRefunds || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>National Board of Revenue Compliant Engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Admin System Overview
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Active assessment year:{" "}
            <strong className="font-semibold text-slate-800">
              {currentYearObj?.tax_year || "2026-27"}
            </strong>{" "}
            (Income Year: {currentYearObj?.income_year || "2025-26"})
          </p>
        </div>
      </div>

      {/* Primary Summary Cards (Clean & Minimal) */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* 1. Total Users */}
          <DashboardStatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            description="Registered taxpayers"
            icon={Users}
            link="/admin/users"
            accent="emerald"
          />

          {/* 2. Total Tax Returns */}
          <DashboardStatCard
            title="Tax Returns"
            value={stats?.totalTaxReturns ?? 0}
            description="Draft & filed returns"
            icon={FileText}
            link="/admin/tax-returns"
            accent="purple"
          />

          {/* 3. Pending Payments */}
          <DashboardStatCard
            title="Pending Payments"
            value={stats?.pendingPayments ?? 0}
            description="Awaiting settlement"
            icon={Banknote}
            link="/admin/tax-returns"
            accent="rose"
          />

          {/* 4. Pending Refunds */}
          <DashboardStatCard
            title="Pending Refunds"
            value={stats?.pendingRefundsCount ?? (pendingRefunds.length || 0)}
            description="Claims awaiting review"
            icon={Clock}
            link="/admin/refunds"
            accent="amber"
          />

          {/* 5. Income Records */}
          <DashboardStatCard
            title="Income Records"
            value={stats?.totalIncomeRecords ?? 0}
            description="Recorded incomes"
            icon={WalletCards}
            accent="indigo"
          />

          {/* 6. Expense Records */}
          <DashboardStatCard
            title="Expense Records"
            value={stats?.totalExpenseRecords ?? 0}
            description="Claimed expenses"
            icon={Receipt}
            accent="blue"
          />
        </div>
      </section>

      {/* Minimal & Clear Information Sections (Zero Graphical Visualizations) */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Tax Return Status Breakdown (Pure Clean Table) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tax Return Status Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Summary of returns across filing lifecycle stages
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Total: {totalReturnCount}
            </span>
          </div>

          <div className="mt-4">
            {returnOverview.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No tax return records yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="py-2">Lifecycle Status</th>
                      <th className="py-2 text-right">Returns</th>
                      <th className="py-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnOverview.map((item) => {
                      const cfg =
                        statusConfig[item.status] || {
                          label: item.status,
                          bg: "bg-slate-100",
                          text: "text-slate-700",
                          border: "border-slate-200",
                        };
                      const pct =
                        totalReturnCount > 0
                          ? Math.round((Number(item.count) / totalReturnCount) * 100)
                          : 0;

                      return (
                        <tr key={item.status} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-800">
                            {Number(item.count).toLocaleString("en-US")}
                          </td>
                          <td className="py-2.5 text-right font-medium text-slate-500">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Live filing status registry
            </span>
            <Link
              to="/admin/tax-returns"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              <span>Manage Tax Returns</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Section 2: Recent Tax Returns (Clean Table) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Recent Tax Returns
              </h2>
              <p className="text-xs text-slate-500">
                Latest tax returns initiated and submitted
              </p>
            </div>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4">
            {recentReturns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent tax return activity.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="py-2">Taxpayer / Return</th>
                      <th className="py-2">Year</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Tax Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentReturns.map((ret) => {
                      const cfg =
                        statusConfig[ret.return_status] || {
                          label: ret.return_status || "DRAFT",
                          bg: "bg-slate-100",
                          text: "text-slate-700",
                          border: "border-slate-200",
                        };

                      return (
                        <tr key={ret.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5">
                            <p className="font-semibold text-slate-900 truncate">
                              {ret.user_name || `User #${ret.user_id}`}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Return #{ret.id}
                            </p>
                          </td>
                          <td className="py-2.5 font-medium text-slate-700">
                            {ret.tax_year}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-900">
                            ৳{Number(ret.payable_tax || 0).toLocaleString("en-US")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Real-time taxpayer submissions
            </span>
            <Link
              to="/admin/tax-returns"
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition"
            >
              <span>View All Returns</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Section 3: Pending Refund Requests (Clean Table) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Pending Refund Requests
              </h2>
              <p className="text-xs text-slate-500">
                Claims awaiting administrative approval & payout
              </p>
            </div>
            <Banknote className="h-4 w-4 text-amber-600" />
          </div>

          <div className="mt-4">
            {pendingRefunds.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-1" />
                <p className="font-medium text-slate-600">No pending refund requests</p>
                <p className="text-[11px] text-slate-400">All submitted claims have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="py-2">Taxpayer</th>
                      <th className="py-2">Bank</th>
                      <th className="py-2 text-right">Claim Amount</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingRefunds.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5">
                          <p className="font-semibold text-slate-900 truncate">
                            {ref.user_name || `Taxpayer #${ref.user_id}`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Claim #{ref.id}
                          </p>
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {ref.bank_name || "Bank transfer"}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">
                          ৳{Number(ref.refund_amount || 0).toLocaleString("en-US")}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            to="/admin/refunds"
                            className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Direct refund claim management
            </span>
            <Link
              to="/admin/refunds"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 transition"
            >
              <span>Manage Refunds</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
