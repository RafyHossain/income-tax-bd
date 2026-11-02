import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Calculator,
  Plus,
  FileCheck,
  ChevronRight,
  CalendarDays,
  Clock,
} from "lucide-react";

import FinancialService from "@/services/financialService";
import TaxCalculationService from "@/services/taxCalculationService";

const Dashboard = () => {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });

  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [taxCalculations, setTaxCalculations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        summaryResponse,
        incomeResponse,
        expenseResponse,
        taxResponse,
      ] = await Promise.all([
        FinancialService.getFinancialSummary(),
        FinancialService.getIncome(),
        FinancialService.getExpense(),
        TaxCalculationService.getCalculations(),
      ]);

      setSummary(
        summaryResponse?.data || {
          totalIncome: 0,
          totalExpense: 0,
          netBalance: 0,
        }
      );

      const incList = Array.isArray(incomeResponse?.data)
        ? incomeResponse.data
        : [];
      const expList = Array.isArray(expenseResponse?.data)
        ? expenseResponse.data
        : [];
      const taxList = Array.isArray(taxResponse?.data)
        ? taxResponse.data
        : [];

      // Sort recent records
      setIncomes(
        [...incList].sort(
          (a, b) =>
            new Date(b.income_date || b.created_at || 0) -
            new Date(a.income_date || a.created_at || 0)
        )
      );

      setExpenses(
        [...expList].sort(
          (a, b) =>
            new Date(b.expense_date || b.created_at || 0) -
            new Date(a.expense_date || a.created_at || 0)
        )
      );

      setTaxCalculations(
        [...taxList].sort(
          (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
      );
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
      setSummary({
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
      });
      setIncomes([]);
      setExpenses([]);
      setTaxCalculations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const latestTax = taxCalculations[0] || null;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A clean overview of your income, expenses, and tax filing status.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/dashboard/tax-calculation"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <Calculator className="h-4 w-4" />
            Calculate Tax
          </Link>
          <Link
            to="/dashboard/tax-returns"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <FileCheck className="h-4 w-4 text-emerald-600" />
            My Tax Returns
          </Link>
        </div>
      </div>

      {/* 4 Essential Financial Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Income
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowUpCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            BDT {formatAmount(summary.totalIncome)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{incomes.length} recorded entries</span>
            <Link
              to="/dashboard/income"
              className="font-medium text-emerald-600 hover:underline"
            >
              Add +
            </Link>
          </div>
        </div>

        {/* Total Expense */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <ArrowDownCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            BDT {formatAmount(summary.totalExpense)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{expenses.length} recorded entries</span>
            <Link
              to="/dashboard/expense"
              className="font-medium text-emerald-600 hover:underline"
            >
              Add +
            </Link>
          </div>
        </div>

        {/* Net Savings / Balance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Savings
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            BDT {formatAmount(summary.netBalance)}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Income minus allowable expenses
          </p>
        </div>

        {/* Latest Tax Calculation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Latest Tax Liability
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {latestTax
              ? `BDT ${formatAmount(
                  latestTax.tax_liability ?? latestTax.taxLiability ?? 0
                )}`
              : "BDT 0.00"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              {latestTax
                ? `AY ${latestTax.tax_year ?? latestTax.taxYear}`
                : "Not calculated"}
            </span>
            <Link
              to="/dashboard/tax-calculation"
              className="font-medium text-emerald-600 hover:underline"
            >
              Recalculate →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity: 2 Clean Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Income */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Recent Income Entries
              </h2>
              <p className="text-xs text-slate-500">
                Latest earnings recorded in your account
              </p>
            </div>
            <Link
              to="/dashboard/income"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              View all ({incomes.length})
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {incomes.slice(0, 5).map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between py-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {inc.source_name || inc.income_type}
                  </p>
                  <p className="text-slate-400">
                    {inc.income_type} • {formatDate(inc.income_date)}
                  </p>
                </div>
                <span className="font-bold text-slate-900">
                  + BDT {formatAmount(inc.amount)}
                </span>
              </div>
            ))}

            {incomes.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No income records yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Recent Expense Entries
              </h2>
              <p className="text-xs text-slate-500">
                Latest deductible & personal expenses
              </p>
            </div>
            <Link
              to="/dashboard/expense"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              View all ({expenses.length})
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {expenses.slice(0, 5).map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between py-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {exp.expense_category_name ||
                      exp.expense_category ||
                      "Expense"}
                  </p>
                  <p className="text-slate-400">
                    {exp.description || "General"} • {formatDate(exp.expense_date)}
                  </p>
                </div>
                <span className="font-bold text-slate-900">
                  − BDT {formatAmount(exp.amount)}
                </span>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No expense records yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
