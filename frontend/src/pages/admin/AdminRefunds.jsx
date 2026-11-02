import { useEffect, useState, useMemo } from "react";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  User,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import RefundService from "@/services/refundService";
import { formatTaxYearLabel } from "@/utils/taxYearUtils";

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

const AdminRefunds = () => {
  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    refunded: 0,
    totalRefundedAmount: 0,
    totalPendingAmount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedTaxYear, setSelectedTaxYear] = useState("");

  // Modals state
  const [detailsModalItem, setDetailsModalItem] = useState(null);
  const [approveModalItem, setApproveModalItem] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [refundModalItem, setRefundModalItem] = useState(null);
  const [refundForm, setRefundForm] = useState({
    transactionReference: "",
    refundedAt: new Date().toISOString().split("T")[0],
  });
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await RefundService.getAllAdmin({
        status: selectedStatus,
        tax_year: selectedTaxYear || undefined,
      });

      if (res?.success && res.data) {
        setRequests(res.data.requests || []);
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }
    } catch (err) {
      console.error("loadRequests error:", err);
      toast.error(err?.response?.data?.message || "Failed to load refund requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [selectedStatus, selectedTaxYear]);

  // Handle Approve
  const handleApprove = async () => {
    if (!approveModalItem) return;
    try {
      setActionLoading(true);
      const res = await RefundService.approve(approveModalItem.id);
      toast.success(res?.message || "Refund request approved successfully.");
      setApproveModalItem(null);
      loadRequests();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error(err?.response?.data?.message || "Failed to approve refund request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!rejectModalItem) return;
    try {
      setActionLoading(true);
      const res = await RefundService.reject(rejectModalItem.id, rejectionReason.trim());
      toast.success(res?.message || "Refund request rejected.");
      setRejectModalItem(null);
      setRejectionReason("");
      loadRequests();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(err?.response?.data?.message || "Failed to reject refund request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mark Refunded
  const handleMarkRefunded = async () => {
    if (!refundModalItem) return;
    try {
      setActionLoading(true);
      const res = await RefundService.markRefunded(refundModalItem.id, {
        transactionReference: refundForm.transactionReference.trim(),
        refundedAt: refundForm.refundedAt,
      });
      toast.success(res?.message || "Refund marked as completed.");
      setRefundModalItem(null);
      loadRequests();
    } catch (err) {
      console.error("Mark refunded error:", err);
      toast.error(err?.response?.data?.message || "Failed to record refund payout.");
    } finally {
      setActionLoading(false);
    }
  };

  const openRefundModal = (item) => {
    setRefundModalItem(item);
    setRefundForm({
      transactionReference: `BEFTN-${Date.now().toString().slice(-8)}`,
      refundedAt: new Date().toISOString().split("T")[0],
    });
  };

  const availableTaxYears = useMemo(() => {
    const years = new Set();
    requests.forEach((r) => {
      if (r.tax_year) years.add(r.tax_year);
    });
    return Array.from(years);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Refund Management
            </h1>
            <p className="text-xs text-slate-500">
              Review, verify bank credentials, approve, reject, and record taxpayer refund payouts.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Requests</span>
          <span className="font-mono text-2xl font-bold text-slate-900 mt-1 block">
            {metrics.total}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">All submissions</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800 block">Pending Review</span>
          <span className="font-mono text-2xl font-bold text-amber-950 mt-1 block">
            {metrics.pending}
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block font-mono">
            BDT {formatMoney(metrics.totalPendingAmount)}
          </span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-800 block">Approved</span>
          <span className="font-mono text-2xl font-bold text-blue-950 mt-1 block">
            {metrics.approved}
          </span>
          <span className="text-[10px] text-blue-700 mt-0.5 block">Awaiting payout</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 block">Refunded</span>
          <span className="font-mono text-2xl font-bold text-emerald-950 mt-1 block">
            {metrics.refunded}
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-mono">
            BDT {formatMoney(metrics.totalRefundedAmount)}
          </span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-rose-800 block">Rejected</span>
          <span className="font-mono text-2xl font-bold text-rose-950 mt-1 block">
            {metrics.rejected}
          </span>
          <span className="text-[10px] text-rose-700 mt-0.5 block">Declined applications</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All", count: metrics.total },
              { id: "PENDING", label: "Pending", count: metrics.pending },
              { id: "APPROVED", label: "Approved", count: metrics.approved },
              { id: "REFUNDED", label: "Refunded", count: metrics.refunded },
              { id: "REJECTED", label: "Rejected", count: metrics.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedStatus === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    selectedStatus === tab.id
                      ? "bg-slate-700 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tax Year Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Tax Year:</label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Tax Years</option>
              {availableTaxYears.map((yr) => (
                <option key={yr} value={yr}>
                  {formatTaxYearLabel(yr)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs font-medium text-slate-600">Loading refund requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Banknote className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Refund Requests Found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {selectedStatus !== "ALL"
              ? `There are no refund requests with status "${selectedStatus}".`
              : "No taxpayers have submitted refund requests yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-5 pr-3">Request ID & Return</th>
                  <th className="py-3 px-3">Taxpayer</th>
                  <th className="py-3 px-3">Bank Details</th>
                  <th className="py-3 px-3 text-right">Refund Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Submitted</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((item) => {
                  const maskedAcc = item.bank_account_number
                    ? `•••• ${item.bank_account_number.slice(-4)}`
                    : "N/A";

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="font-mono font-bold text-slate-900">#REF-{item.id}</div>
                        <div className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 inline-block mt-0.5">
                          {item.return_number}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">AY {item.assessment_year}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900">{item.taxpayer_name}</div>
                        <div className="text-[11px] text-slate-500">{item.taxpayer_email}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-800">{item.bank_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {maskedAcc} • {item.branch_name}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.account_holder_name}</div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                        BDT {formatMoney(item.refund_amount)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setDetailsModalItem(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            <span>Details</span>
                          </button>

                          {item.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveModalItem(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
                                title="Approve Request"
                              >
                                <Check className="h-3 w-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalItem(item);
                                  setRejectionReason("");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition cursor-pointer"
                                title="Reject Request"
                              >
                                <X className="h-3 w-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {item.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => openRefundModal(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition cursor-pointer"
                              title="Mark as Paid"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Mark Refunded</span>
                            </button>
                          )}
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
              Showing <strong className="text-slate-800">{requests.length}</strong> refund application(s)
            </span>
          </div>
        </div>
      )}

      {/* 1. VIEW DETAILS MODAL */}
      {detailsModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
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

            <div className="mt-5 space-y-4 text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="font-semibold text-slate-600">Application Status:</span>
                <StatusBadge status={detailsModalItem.status} />
              </div>

              {/* Amount Highlight */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Eligible Refund Amount
                </span>
                <span className="font-mono text-2xl font-extrabold text-emerald-950 mt-1 block">
                  BDT {formatMoney(detailsModalItem.refund_amount)}
                </span>
              </div>

              {/* Taxpayer Information */}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  Taxpayer Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Name:</span>
                    <span className="font-semibold text-slate-800">{detailsModalItem.taxpayer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email:</span>
                    <span className="font-semibold text-slate-800">{detailsModalItem.taxpayer_email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assessment Year:</span>
                    <span className="font-semibold text-slate-800">AY {detailsModalItem.assessment_year}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Submitted At:</span>
                    <span className="font-semibold text-slate-800">{formatDateTime(detailsModalItem.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Account Information */}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
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
                    <span className="text-slate-400 block">Branch Name:</span>
                    <span className="font-semibold text-slate-800">{detailsModalItem.branch_name}</span>
                  </div>
                  {detailsModalItem.reason && (
                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-400 block">Taxpayer Note:</span>
                      <p className="text-slate-700 italic mt-0.5">{detailsModalItem.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settlement / Review Info */}
              {detailsModalItem.status === "REFUNDED" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1.5">
                  <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Refund Payout Settlement
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-emerald-700 block">Transaction Reference:</span>
                      <span className="font-mono font-bold text-emerald-950">{detailsModalItem.transaction_reference}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Settlement Date:</span>
                      <span className="font-semibold text-emerald-950">{formatDate(detailsModalItem.refunded_at)}</span>
                    </div>
                    {detailsModalItem.reviewer_name && (
                      <div className="col-span-2">
                        <span className="text-emerald-700 block">Processed By:</span>
                        <span className="font-semibold text-emerald-950">{detailsModalItem.reviewer_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailsModalItem.status === "REJECTED" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-1.5">
                  <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    Rejection Details
                  </h4>
                  <div className="text-[11px] pt-1 border-t border-rose-200/60">
                    <span className="text-rose-700 block">Reason for Rejection:</span>
                    <p className="font-semibold text-rose-950 mt-0.5">
                      {detailsModalItem.rejection_reason || "Declined by tax officer review."}
                    </p>
                    {detailsModalItem.reviewer_name && (
                      <span className="text-rose-600 text-[10px] block mt-1">
                        Reviewed by: {detailsModalItem.reviewer_name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end">
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

      {/* 2. APPROVE CONFIRMATION MODAL */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Refund Request</h3>
                <p className="text-xs text-slate-500 font-mono">
                  #REF-{approveModalItem.id} • {approveModalItem.return_number}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to approve this refund request for{" "}
                <strong className="text-slate-900">{approveModalItem.taxpayer_name}</strong>?
              </p>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 font-mono text-center">
                <span className="text-xs text-emerald-800 block font-medium">Refund Amount</span>
                <span className="text-lg font-bold text-emerald-950">
                  BDT {formatMoney(approveModalItem.refund_amount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Once approved, the status will change to <strong>APPROVED</strong>, allowing the finance officer to record payout settlement.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <X className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Refund Request</h3>
                <p className="text-xs text-slate-500 font-mono">
                  #REF-{rejectModalItem.id} • {rejectModalItem.return_number}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                You are about to reject the refund request of{" "}
                <strong className="text-slate-900">{rejectModalItem.taxpayer_name}</strong> for BDT{" "}
                {formatMoney(rejectModalItem.refund_amount)}.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Rejection Reason (Optional):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Bank account title does not match taxpayer NID name, or branch routing invalid."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MARK AS REFUNDED MODAL */}
      {refundModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-blue-600 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Refund Payout</h3>
                <p className="text-xs text-slate-500 font-mono">
                  #REF-{refundModalItem.id} • {refundModalItem.return_number}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-blue-50/60 border border-blue-200 p-3">
                <div className="flex items-center justify-between text-[11px] text-blue-800">
                  <span>Payee:</span>
                  <strong className="text-blue-950">{refundModalItem.account_holder_name}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-blue-800 mt-1">
                  <span>Bank & Account:</span>
                  <span className="font-mono text-blue-950">
                    {refundModalItem.bank_name} ({refundModalItem.bank_account_number})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-blue-900 font-bold mt-2 pt-1 border-t border-blue-200/60">
                  <span>Disbursed Amount:</span>
                  <span className="font-mono text-sm">BDT {formatMoney(refundModalItem.refund_amount)}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Transaction Reference (EFT / BEFTN / Challan):
                </label>
                <input
                  type="text"
                  value={refundForm.transactionReference}
                  onChange={(e) =>
                    setRefundForm((prev) => ({ ...prev, transactionReference: e.target.value }))
                  }
                  required
                  placeholder="e.g., BEFTN-20261102-0045"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Payout Settlement Date:
                </label>
                <input
                  type="date"
                  value={refundForm.refundedAt}
                  onChange={(e) =>
                    setRefundForm((prev) => ({ ...prev, refundedAt: e.target.value }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRefundModalItem(null)}
                disabled={actionLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkRefunded}
                disabled={actionLoading || !refundForm.transactionReference.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Mark as REFUNDED</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRefunds;

