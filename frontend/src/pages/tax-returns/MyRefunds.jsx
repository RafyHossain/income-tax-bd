import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Building2,
  ArrowRight,
  Loader2,
  Calendar,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import RefundService from "@/services/refundService";

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

const formatDateTime = (val) => {
  if (!val) return "N/A";
  const date = new Date(val);
  if (isNaN(date.getTime())) return val;
  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-300",
    APPROVED: "bg-blue-50 text-blue-800 border-blue-300",
    REFUNDED: "bg-emerald-50 text-emerald-800 border-emerald-300",
    REJECTED: "bg-rose-50 text-rose-800 border-rose-300",
  };

  const dots = {
    PENDING: "bg-amber-500 animate-pulse",
    APPROVED: "bg-blue-500",
    REFUNDED: "bg-emerald-500",
    REJECTED: "bg-rose-500",
  };

  const labels = {
    PENDING: "Pending Review",
    APPROVED: "Approved",
    REFUNDED: "Refunded",
    REJECTED: "Rejected",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] || "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status] || "bg-slate-400"}`} />
      {labels[status] || status}
    </span>
  );
};

const MyRefunds = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsModalItem, setDetailsModalItem] = useState(null);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      const res = await RefundService.getMyRefundRequests();
      if (res?.success && res.data) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error("loadMyRequests error:", err);
      toast.error(err?.response?.data?.message || "Failed to load refund requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-slate-800 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">My Tax Refunds</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Tax Refund Claims
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track the progress and payout status of your income tax refund applications.
            </p>
          </div>

          <Link
            to="/dashboard/tax-returns"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition w-fit"
          >
            <span>View Tax Returns</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs font-medium text-slate-600">Loading your refund requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Banknote className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Refund Claims Yet</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            You do not currently have any active or past refund requests. When your tax calculation produces a refundable surplus, you can submit claims directly from your Tax Return details.
          </p>
          <Link
            to="/dashboard/tax-returns"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <span>Check My Tax Returns</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((item) => {
            const maskedAcc = item.bank_account_number
              ? `•••• ${item.bank_account_number.slice(-4)}`
              : "N/A";

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.return_number}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 ml-2">
                      AY {item.assessment_year}
                    </span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wide">
                      Claimed Refund
                    </span>
                    <span className="font-mono text-xl font-extrabold text-emerald-950 mt-0.5 block">
                      BDT {formatMoney(item.refund_amount)}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-white/80 border border-emerald-200 px-2 py-1 rounded-lg">
                    Applied: {formatDate(item.created_at)}
                  </span>
                </div>

                {/* Bank Preview */}
                <div className="text-xs space-y-1 text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bank & Branch:</span>
                    <span className="font-medium text-slate-800">
                      {item.bank_name} ({item.branch_name})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {maskedAcc} ({item.account_holder_name})
                    </span>
                  </div>
                </div>

                {/* Status Notice */}
                {item.status === "REFUNDED" && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span>Disbursed via </span>
                      <strong className="font-mono">{item.transaction_reference || "Direct Transfer"}</strong>
                      <span className="text-emerald-700 text-[10px] block">
                        Date: {formatDate(item.refunded_at)}
                      </span>
                    </div>
                  </div>
                )}

                {item.status === "REJECTED" && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-900 flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Application Declined</strong>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        {item.rejection_reason || "Declined during tax authority verification."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Claim #REF-{item.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailsModalItem(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>View Full Details</span>
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {detailsModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Refund Request Details
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    #REF-{detailsModalItem.id} • {detailsModalItem.return_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <span className="font-semibold text-slate-600">Status:</span>
                <StatusBadge status={detailsModalItem.status} />
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Eligible Refund Amount
                </span>
                <span className="font-mono text-2xl font-extrabold text-emerald-950 mt-1 block">
                  BDT {formatMoney(detailsModalItem.refund_amount)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  Bank Account Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Account Title:</span>
                    <span className="font-semibold text-slate-800">{detailsModalItem.account_holder_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Bank Name:</span>
                    <span className="font-semibold text-slate-800">{detailsModalItem.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Account Number:</span>
                    <span className="font-mono font-bold text-slate-900">{detailsModalItem.bank_account_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Branch:</span>
                    <span className="font-semibold text-slate-800">{detailsModalItem.branch_name}</span>
                  </div>
                  {detailsModalItem.reason && (
                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-400 block">Application Reason:</span>
                      <p className="text-slate-700 italic mt-0.5">{detailsModalItem.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {detailsModalItem.status === "REFUNDED" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-1">
                  <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Payout Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-emerald-700 block">Txn Reference:</span>
                      <span className="font-mono font-bold text-emerald-950">
                        {detailsModalItem.transaction_reference}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Refund Date:</span>
                      <span className="font-semibold text-emerald-950">
                        {formatDate(detailsModalItem.refunded_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {detailsModalItem.status === "REJECTED" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1">
                  <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    Rejection Reason
                  </h4>
                  <p className="text-[11px] font-semibold text-rose-950 pt-1 border-t border-rose-200/60">
                    {detailsModalItem.rejection_reason || "Declined during tax officer review."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDetailsModalItem(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRefunds;

