import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import TaxReturnService from "@/services/taxReturnService";
import { getIncomeYearFromAssessmentYear } from "@/utils/taxYearUtils";
import {
  FileText,
  FilePlus,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Filter,
  ArrowRight,
  CreditCard,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

const formatMoney = (val) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (val) => {
  if (!val) return "N/A";
  const date = new Date(val);
  if (isNaN(date.getTime())) return val;
  return date.toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StatusBadge = ({ status, paymentStatus, refundAmount }) => {
  const isRefundDue = Number(refundAmount || 0) > 0;
  if (isRefundDue) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-sky-800">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        Refund Due
      </span>
    );
  }

  const isFiled = ["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(status);
  const isPaid =
    paymentStatus === "SUCCESS" ||
    paymentStatus === "PAID" ||
    status === "PAID";
  const isPending =
    !isPaid &&
    !isFiled &&
    (!status || ["DRAFT", "VALIDATED", "PAYMENT_PENDING", "PENDING"].includes(status));

  if (isFiled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-teal-800">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
        Filed
      </span>
    );
  }

  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Payment Successful
      </span>
    );
  }

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Payment Pending
      </span>
    );
  }

  const styles = {
    FILED: "bg-teal-50 text-teal-800 border-teal-300",
    SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
    ACKNOWLEDGED: "bg-purple-50 text-purple-700 border-purple-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    AMENDED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    CANCELLED: "bg-slate-50 text-slate-600 border-slate-200",
  };

  const labels = {
    FILED: "Filed",
    SUBMITTED: "Submitted",
    ACKNOWLEDGED: "Acknowledged",
    REJECTED: "Rejected",
    AMENDED: "Amended",
    CANCELLED: "Cancelled",
  };

  const currentStyle = styles[status] || "bg-slate-50 text-slate-600 border-slate-200";
  const label = labels[status] || status || "Payment Pending";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${currentStyle}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

const TaxReturnsList = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteModalReturn, setDeleteModalReturn] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await TaxReturnService.getTaxReturns();
      if (res.success && Array.isArray(res.data)) {
        setReturns(res.data);
      } else {
        setReturns([]);
      }
    } catch (err) {
      console.error("fetchReturns error:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load tax returns.");
      toast.error("Failed to load tax returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleDeleteReturn = async () => {
    if (!deleteModalReturn) return;

    try {
      setDeleting(true);
      const res = await TaxReturnService.deleteTaxReturn(deleteModalReturn.id);
      if (res?.success) {
        toast.success(`Tax return #${deleteModalReturn.id} deleted successfully.`);
        setReturns((prev) => prev.filter((r) => r.id !== deleteModalReturn.id));
        setDeleteModalReturn(null);
      } else {
        toast.error(res?.message || "Failed to delete tax return.");
      }
    } catch (err) {
      console.error("Delete return error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "An error occurred while deleting tax return."
      );
    } finally {
      setDeleting(false);
    }
  };

  // Statistics calculation reflecting actual return and payment statuses from database
  const stats = useMemo(() => {
    const total = returns.length;
    const filed = returns.filter((r) =>
      ["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(r.return_status)
    ).length;
    const paymentSuccessful = returns.filter(
      (r) =>
        (["SUCCESS", "PAID"].includes(r.payment_status) || r.return_status === "PAID") &&
        !["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(r.return_status)
    ).length;
    const paymentPending = returns.filter(
      (r) =>
        (!r.payment_status || !["SUCCESS", "PAID"].includes(r.payment_status)) &&
        (!r.return_status || ["DRAFT", "VALIDATED", "PAYMENT_PENDING", "PENDING"].includes(r.return_status))
    ).length;

    return { total, paymentPending, paymentSuccessful, filed };
  }, [returns]);

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      if (statusFilter === "ALL") {
        return true;
      }
      if (statusFilter === "PAYMENT_PENDING" || statusFilter === "DRAFT") {
        return (
          (!r.payment_status || !["SUCCESS", "PAID"].includes(r.payment_status)) &&
          (!r.return_status || ["DRAFT", "VALIDATED", "PAYMENT_PENDING", "PENDING"].includes(r.return_status))
        );
      }
      if (statusFilter === "PAYMENT_SUCCESSFUL" || statusFilter === "PAID") {
        return (
          (["SUCCESS", "PAID"].includes(r.payment_status) || r.return_status === "PAID") &&
          !["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(r.return_status)
        );
      }
      if (statusFilter === "FILED") {
        return ["FILED", "SUBMITTED", "ACKNOWLEDGED"].includes(r.return_status);
      }
      return r.return_status === statusFilter;
    });
  }, [returns, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Tax Returns
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review, verify, and track your annual Bangladesh income tax returns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/dashboard/tax-returns/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <FilePlus className="h-4 w-4" />
            <span>Create Return</span>
          </Link>
        </div>
      </div>

      {/* Clean 4 Minimal Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Card 1: Total Returns */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Returns
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-400">All prepared returns</p>
        </div>

        {/* Card 2: Payment Pending */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Payment Pending
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats.paymentPending}</p>
          <p className="mt-1 text-xs text-slate-400">Awaiting tax payment</p>
        </div>

        {/* Card 3: Payment Successful */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Payment Successful
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.paymentSuccessful}</p>
          <p className="mt-1 text-xs text-slate-400">Settled tax payments</p>
        </div>

        {/* Card 4: Filed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Filed
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.filed}</p>
          <p className="mt-1 text-xs text-slate-400">Completed returns</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Statuses ({returns.length})</option>
            <option value="PAYMENT_PENDING">Payment Pending ({stats.paymentPending})</option>
            <option value="PAYMENT_SUCCESSFUL">Payment Successful ({stats.paymentSuccessful})</option>
            <option value="FILED">Filed ({stats.filed})</option>
          </select>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredReturns.length} of {returns.length} returns
        </span>
      </div>

      {/* Returns Content Section */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="mt-3 text-xs font-medium text-slate-500">Loading tax returns...</p>
        </div>
      ) : error ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/40 p-8 text-center shadow-xs">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h3 className="mt-2 text-sm font-bold text-red-900">Failed to Load Returns</h3>
          <p className="mt-1 text-xs text-red-700 max-w-md">{error}</p>
          <button
            type="button"
            onClick={fetchReturns}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {statusFilter !== "ALL" ? "No Matching Tax Returns" : "No Tax Returns Found"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md">
            {statusFilter !== "ALL"
              ? "Try adjusting your status filter to locate existing returns."
              : "You have not initialized any tax returns yet. Create a return directly from your tax calculation."}
          </p>
          {statusFilter !== "ALL" ? (
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="mt-3 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset Filter
            </button>
          ) : (
            <Link
              to="/dashboard/tax-returns/create"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <FilePlus className="h-3.5 w-3.5" />
              <span>Create Return</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 pl-5 pr-3">Return ID</th>
                  <th className="py-3 px-3">Assessment Year</th>
                  <th className="py-3 px-3 text-right">Taxable Income</th>
                  <th className="py-3 px-3 text-right">Payable Tax</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 pl-3 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((item) => {
                  const returnNumber =
                    item.return_number ||
                    item.returnNumber ||
                    `TRN-${String(item.tax_year || "2026-27").replace("-", "")}-${String(item.id).padStart(6, "0")}`;

                  const isPaid =
                    item.payment_status === "SUCCESS" ||
                    item.payment_status === "PAID" ||
                    item.return_status === "PAID";

                  const isFiled =
                    item.return_status === "FILED" ||
                    item.return_status === "SUBMITTED" ||
                    item.return_status === "ACKNOWLEDGED";

                  const isRefundDue = Number(item.refund_amount || 0) > 0;

                  const isPaymentPending =
                    !isRefundDue &&
                    !isPaid &&
                    !isFiled &&
                    Math.max(0, Number(item.payable_tax || item.final_payable || 0)) > 0 &&
                    item.return_status !== "CANCELLED" &&
                    item.return_status !== "REJECTED";

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="py-3.5 pl-5 pr-3 font-semibold text-slate-900">
                        <span
                          className="font-bold tracking-tight text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 block truncate max-w-[180px]"
                          title={returnNumber}
                        >
                          {returnNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-800">
                        <div>AY {item.assessment_year || item.tax_year}</div>
                        <div className="text-[10px] text-slate-400">
                          IY {item.income_year || getIncomeYearFromAssessmentYear(item.assessment_year || item.tax_year)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-800 tabular-nums">
                        BDT {formatMoney(item.taxable_income)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        BDT {formatMoney(Math.max(0, Number(item.payable_tax || item.final_payable || 0)))}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <StatusBadge
                          status={item.return_status}
                          paymentStatus={item.payment_status}
                          refundAmount={item.refund_amount}
                        />
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">{formatDate(item.created_at)}</td>
                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isPaymentPending && (
                            <Link
                              to={`/dashboard/tax-returns/${item.id}/payment`}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Pay</span>
                            </Link>
                          )}
                          <Link
                            to={`/dashboard/tax-returns/${item.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            <span>Details</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteModalReturn(item)}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-200 shadow-2xs cursor-pointer"
                            title="Delete Return"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-5 py-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredReturns.length}</strong> of{" "}
              <strong className="text-slate-800">{returns.length}</strong> returns
            </span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Delete Tax Return
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalReturn(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Tax Return{" "}
              <strong className="font-bold text-slate-900 tracking-tight">
                {deleteModalReturn.return_number || `Return #${deleteModalReturn.id}`}
              </strong>{" "}
              (Assessment Year: {deleteModalReturn.assessment_year || deleteModalReturn.tax_year})?
              All snapshot details for this return will be permanently removed.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalReturn(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReturn}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReturnsList;
