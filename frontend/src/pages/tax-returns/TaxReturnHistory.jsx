import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import TaxReturnService from "@/services/taxReturnService";
import { getIncomeYearFromAssessmentYear } from "@/utils/taxYearUtils";
import PaymentReceiptModal from "@/components/tax-returns/PaymentReceiptModal";
import TaxCertificateModal from "@/components/tax-returns/TaxCertificateModal";
import {
  FileSpreadsheet,
  Eye,
  AlertCircle,
  Loader2,
  CreditCard,
  Trash2,
  X,
  Send,
  CheckCircle2,
  Receipt,
  FileText,
  Filter,
  Clock,
  Sparkles,
} from "lucide-react";

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

const formatMoney = (val) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const getStatusBadgeConfig = (returnStatus, paymentStatus, refundAmount) => {
  const isFiled =
    returnStatus === "FILED" ||
    returnStatus === "SUBMITTED" ||
    returnStatus === "ACKNOWLEDGED";

  const isPaid =
    paymentStatus === "SUCCESS" ||
    paymentStatus === "PAID" ||
    returnStatus === "PAID";

  if (isFiled) {
    return {
      label: "Filed",
      className: "bg-teal-50 text-teal-800 border-teal-200",
      dotClass: "bg-teal-500",
    };
  }

  if (Number(refundAmount || 0) > 0) {
    return {
      label: "Refund Due",
      className: "bg-sky-50 text-sky-800 border-sky-300",
      dotClass: "bg-sky-500",
    };
  }

  if (isPaid) {
    return {
      label: "Payment Successful",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }

  if (returnStatus === "REJECTED") {
    return {
      label: "Rejected",
      className: "bg-rose-50 text-rose-800 border-rose-200",
      dotClass: "bg-rose-500",
    };
  }

  if (returnStatus === "CANCELLED") {
    return {
      label: "Cancelled",
      className: "bg-slate-50 text-slate-700 border-slate-200",
      dotClass: "bg-slate-400",
    };
  }

  return {
    label: "Payment Pending",
    className: "bg-amber-50 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500 animate-pulse",
  };
};

const StatusBadge = ({ returnStatus, paymentStatus, refundAmount }) => {
  const config = getStatusBadgeConfig(returnStatus, paymentStatus, refundAmount);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
};

const TaxReturnHistory = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [deleteModalReturn, setDeleteModalReturn] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitModalReturn, setSubmitModalReturn] = useState(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [selectedReturnForDoc, setSelectedReturnForDoc] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const fetchHistoryData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await TaxReturnService.getTaxReturns();
      if (res?.success && Array.isArray(res.data)) {
        setReturns(res.data);
      } else {
        setReturns([]);
      }
    } catch (err) {
      console.error("fetchHistoryData error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load return filing history."
      );
      toast.error("Failed to load filing history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  // Stats calculation
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
        Number(r.payable_tax || 0) > 0 &&
        (!r.payment_status || !["SUCCESS", "PAID"].includes(r.payment_status)) &&
        (!r.return_status || ["DRAFT", "VALIDATED", "PAYMENT_PENDING", "PENDING"].includes(r.return_status))
    ).length;

    return { total, paymentPending, paymentSuccessful, filed };
  }, [returns]);

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PAYMENT_PENDING") {
        return (
          Number(r.payable_tax || 0) > 0 &&
          (!r.payment_status || !["SUCCESS", "PAID"].includes(r.payment_status)) &&
          (!r.return_status || ["DRAFT", "VALIDATED", "PAYMENT_PENDING", "PENDING"].includes(r.return_status))
        );
      }
      if (statusFilter === "PAYMENT_SUCCESSFUL") {
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

  const handleConfirmSubmit = async () => {
    if (!submitModalReturn?.id || submittingReturn) return;

    try {
      setSubmittingReturn(true);
      const res = await TaxReturnService.submitTaxReturn(submitModalReturn.id);
      if (res?.success) {
        toast.success(res.message || "Tax return successfully filed!");
        setSubmitModalReturn(null);
        await fetchHistoryData();
      } else {
        toast.error(res?.message || "Failed to submit tax return.");
      }
    } catch (err) {
      console.error("Submit return error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "An error occurred while submitting your tax return."
      );
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-0 space-y-6">
      {/* Header with Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-slate-800 transition">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/dashboard/tax-returns" className="hover:text-slate-800 transition">
            Tax Filing
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Filing History</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Filing History
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Comprehensive overview of your submitted tax returns, payment settlements, and statutory filing records.
            </p>
          </div>
          <Link
            to="/dashboard/tax-returns"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition w-fit"
          >
            <span>View All Returns</span>
          </Link>
        </div>
      </div>

      {/* 4 Clean Minimal Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Filings
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-400">All prepared returns</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Payment Pending
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats.paymentPending}</p>
          <p className="mt-1 text-xs text-slate-400">Awaiting tax payment</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Payment Settled
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.paymentSuccessful}</p>
          <p className="mt-1 text-xs text-slate-400">Paid, ready to file</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Officially Filed
          </p>
          <p className="mt-2 text-2xl font-bold text-teal-600">{stats.filed}</p>
          <p className="mt-1 text-xs text-slate-400">Completed submissions</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Records ({returns.length})</option>
            <option value="FILED">Officially Filed ({stats.filed})</option>
            <option value="PAYMENT_SUCCESSFUL">Payment Settled ({stats.paymentSuccessful})</option>
            <option value="PAYMENT_PENDING">Payment Pending ({stats.paymentPending})</option>
          </select>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs font-medium text-slate-500">
            Loading filing history...
          </p>
        </div>
      ) : error ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-xs">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h3 className="mt-2 text-sm font-bold text-red-900">
            Unable to Load Filing History
          </h3>
          <p className="mt-1 text-xs text-red-700 max-w-md">{error}</p>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Tax Returns Found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {statusFilter !== "ALL"
              ? "No returns match the selected status filter."
              : "You have not initialized any tax return filings yet."}
          </p>
          <Link
            to="/dashboard/tax-returns"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
          >
            <span>Go to Tax Returns</span>
          </Link>
        </div>
      ) : (
        /* Detailed Return History Cards */
        <div className="space-y-3">
          {filteredReturns.map((ret) => {
            const assessmentYear = ret.assessment_year || ret.tax_year || "2026-27";
            const returnNumber =
              ret.return_number ||
              ret.returnNumber ||
              `TRN-${String(assessmentYear).replace("-", "")}-${String(ret.id).padStart(6, "0")}`;

            const finalPayable = Math.max(0, Number(ret.payable_tax ?? ret.final_payable ?? 0));
            const refundAmount = Number(ret.refund_amount || 0);
            const isRefundDue = refundAmount > 0;

            const isPaid =
              ret.payment_status === "SUCCESS" ||
              ret.payment_status === "PAID" ||
              ret.return_status === "PAID";

            const isFiled =
              ret.return_status === "FILED" ||
              ret.return_status === "SUBMITTED" ||
              ret.return_status === "ACKNOWLEDGED";

            const canSubmit = isPaid && !isFiled;

            const isPaymentPending =
              !isRefundDue &&
              !isPaid &&
              !isFiled &&
              finalPayable > 0 &&
              ret.return_status !== "CANCELLED" &&
              ret.return_status !== "REJECTED";

            return (
              <div
                key={ret.id}
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-colors ${
                  isFiled
                    ? "border-teal-200/90 hover:border-teal-300"
                    : isPaid
                    ? "border-emerald-200/90 hover:border-emerald-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Return ID, Year, Status & Metadata */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 tracking-tight">
                        {returnNumber}
                      </span>
                      <StatusBadge
                        returnStatus={ret.return_status}
                        paymentStatus={ret.payment_status}
                        refundAmount={ret.refund_amount}
                      />
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="font-semibold text-slate-700">AY {assessmentYear}</span>
                      <span className="text-slate-300">•</span>
                      <span>IY {ret.income_year || getIncomeYearFromAssessmentYear(assessmentYear)}</span>
                      <span className="text-slate-300">•</span>
                      <span>Created: {formatDate(ret.created_at)}</span>

                      {isFiled && ret.submitted_at && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-teal-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-teal-600" />
                            Filed: {formatDate(ret.submitted_at)}
                          </span>
                        </>
                      )}

                      {ret.payment_reference && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-mono text-[11px]">
                            Ref: {ret.payment_reference}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right min-w-[110px]">
                      {isRefundDue ? (
                        <>
                          <span className="text-[11px] font-semibold text-sky-700 block uppercase tracking-wide">
                            Refund Due
                          </span>
                          <span className="font-bold tabular-nums text-base text-sky-950 block">
                            BDT {formatMoney(refundAmount)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                            {isPaid ? "Tax Paid" : "Tax Payable"}
                          </span>
                          <span className="font-extrabold tabular-nums text-base text-slate-900 block">
                            BDT {formatMoney(finalPayable)}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Pay Button if payment pending */}
                      {isPaymentPending && (
                        <Link
                          to={`/dashboard/tax-returns/${ret.id}/payment`}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay</span>
                        </Link>
                      )}

                      {/* Direct Submit Button if Paid & not yet filed */}
                      {canSubmit && (
                        <button
                          type="button"
                          onClick={() => setSubmitModalReturn(ret)}
                          className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition cursor-pointer"
                          title="Submit Tax Return"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Submit</span>
                        </button>
                      )}

                      {/* Document Download Buttons for Paid or Filed returns */}
                      {(isPaid || isFiled) && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReturnForDoc(ret);
                              setShowReceiptModal(true);
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition shadow-2xs cursor-pointer"
                            title="Download Payment Receipt (A-Challan)"
                          >
                            <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReturnForDoc(ret);
                              setShowCertificateModal(true);
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition shadow-2xs cursor-pointer"
                            title="Download Tax Certificate"
                          >
                            <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          </button>
                        </>
                      )}

                      {/* Details View */}
                      <Link
                        to={`/dashboard/tax-returns/${ret.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>Details</span>
                      </Link>

                      {/* Delete button (Disabled/hidden once officially filed) */}
                      {!isFiled && (
                        <button
                          type="button"
                          onClick={() => setDeleteModalReturn(ret)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition shadow-2xs cursor-pointer"
                          title="Delete Return"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBMIT TAX RETURN CONFIRMATION MODAL */}
      {submitModalReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-teal-700">
                <Send className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Submit Tax Return
                </h3>
              </div>
              <button
                type="button"
                disabled={submittingReturn}
                onClick={() => setSubmitModalReturn(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-sm text-slate-700">
                Are you sure you want to submit your tax return? Once submitted, the return will be marked as Filed.
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Return Number:</span>
                  <strong className="font-semibold text-slate-900">
                    {submitModalReturn.return_number || `Return #${submitModalReturn.id}`}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assessment Year:</span>
                  <strong className="font-semibold text-slate-900">
                    {submitModalReturn.assessment_year || submitModalReturn.tax_year}
                  </strong>
                </div>
                {submitModalReturn.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Reference:</span>
                    <strong className="font-semibold text-slate-900 tracking-tight">
                      {submitModalReturn.payment_reference}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={submittingReturn}
                onClick={() => setSubmitModalReturn(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReturn}
                onClick={handleConfirmSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition disabled:opacity-50 cursor-pointer"
              >
                {submittingReturn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{submittingReturn ? "Submitting..." : "Confirm Submission"}</span>
              </button>
            </div>
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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Tax Return{" "}
              <strong className="font-bold text-slate-900 tracking-tight">
                {deleteModalReturn.return_number || `Return #${deleteModalReturn.id}`}
              </strong>{" "}
              (AY {deleteModalReturn.assessment_year || deleteModalReturn.tax_year})?
              All snapshot data will be removed.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalReturn(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReturn}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Modals */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReturnForDoc(null);
        }}
        returnData={selectedReturnForDoc}
      />

      <TaxCertificateModal
        isOpen={showCertificateModal}
        onClose={() => {
          setShowCertificateModal(false);
          setSelectedReturnForDoc(null);
        }}
        returnData={selectedReturnForDoc}
      />
    </div>
  );
};

export default TaxReturnHistory;
