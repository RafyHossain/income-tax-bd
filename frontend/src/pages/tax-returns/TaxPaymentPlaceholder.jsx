import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  Clock,
  Receipt,
  User,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Smartphone,
  Landmark,
  History,
  Send,
  X,
} from "lucide-react";
import TaxReturnService from "@/services/taxReturnService";
import PaymentReceiptModal from "@/components/tax-returns/PaymentReceiptModal";
import TaxCertificateModal from "@/components/tax-returns/TaxCertificateModal";

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
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TaxPaymentPlaceholder = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("A-CHALLAN");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchReturn = async () => {
    setLoading(true);
    setError("");
    try {
      if (!id) {
        const res = await TaxReturnService.getTaxReturns();
        if (res.success && res.data?.length > 0) {
          setReturnData(res.data[0]);
        } else {
          setReturnData(null);
        }
      } else {
        const res = await TaxReturnService.getTaxReturnById(id);
        if (res.success && res.data) {
          setReturnData(res.data);
        } else {
          setError("Tax return record not found.");
        }
      }
    } catch (err) {
      console.error("fetchReturn error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load tax return details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
  }, [id]);

  const payableAmount = Math.max(
    0,
    Number(returnData?.payable_tax ?? returnData?.final_payable ?? 0)
  );

  const isPaid =
    returnData?.payment_status === "PAID" ||
    returnData?.payment_status === "SUCCESS" ||
    returnData?.return_status === "PAID" ||
    returnData?.return_status === "FILED";

  const isFiled =
    returnData?.return_status === "FILED" ||
    returnData?.return_status === "SUBMITTED" ||
    returnData?.return_status === "ACKNOWLEDGED";

  const canSubmit = isPaid && !isFiled;

  const returnNumber =
    returnData?.return_number ||
    returnData?.returnNumber ||
    (returnData?.id
      ? `TRN-${String(returnData?.tax_year || "2026-27").replace("-", "")}-${String(returnData.id).padStart(6, "0")}`
      : "N/A");

  const handleConfirmSubmit = async () => {
    if (!returnData?.id || submittingReturn) return;
    setSubmittingReturn(true);
    try {
      const res = await TaxReturnService.submitTaxReturn(returnData.id);
      if (res?.success) {
        toast.success(res.message || "Tax return successfully filed!");
        setShowSubmitModal(false);
        if (res.data) {
          setReturnData(res.data);
        } else {
          await fetchReturn();
        }
      } else {
        toast.error(res?.message || "Failed to submit tax return.");
      }
    } catch (err) {
      console.error("Submit tax return error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "An error occurred while submitting your tax return."
      );
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!returnData?.id) return;

    try {
      setPaying(true);
      const res = await TaxReturnService.payTaxReturn(returnData.id, {
        paymentMethod,
      });

      if (res.success) {
        toast.success("Payment successful! Return status updated to Paid.");
        if (res.data) {
          setReturnData(res.data);
        } else {
          setReturnData((prev) => ({
            ...prev,
            payment_status: "PAID",
            return_status: "PAID",
            payment_method: paymentMethod,
            paid_at: new Date().toISOString(),
          }));
        }
      } else {
        toast.error(res.message || "Failed to complete payment.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "An error occurred while processing payment."
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Loading tax payment overview...
        </p>
      </div>
    );
  }

  if (error || !returnData) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <CreditCard className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Tax Return Not Found</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {error || "Please select an existing tax return to view payment options."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/dashboard/tax-returns"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <FileText className="h-4 w-4" />
              <span>Go to Tax Returns</span>
            </Link>
            <Link
              to="/dashboard/tax-calculation"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Calculate Tax</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-emerald-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/dashboard/tax-returns" className="hover:text-emerald-600 transition">
            Tax Filing
          </Link>
          <span>/</span>
          <Link
            to={`/dashboard/tax-returns/${returnData.id}`}
            className="hover:text-emerald-600 transition tracking-tight font-medium"
          >
            {returnNumber}
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Payment</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border font-bold ${
              isFiled
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : isPaid
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {isFiled ? (
                <CheckCircle2 className="h-6 w-6 text-teal-600" />
              ) : isPaid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <CreditCard className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {isFiled
                    ? "Tax Return Filed"
                    : isPaid
                    ? "Payment Successful"
                    : "Tax Payment Stage"}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  isFiled
                    ? "bg-teal-50 text-teal-800 border-teal-200"
                    : isPaid
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    isFiled
                      ? "bg-teal-500"
                      : isPaid
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse"
                  }`} />
                  {isFiled
                    ? "Filed"
                    : isPaid
                    ? "Payment Successful"
                    : "Payment Status: Pending"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Return: <strong className="text-slate-800 font-semibold tracking-tight">{returnNumber}</strong> • Assessment Year: <strong>{returnData.tax_year || returnData.assessment_year}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/dashboard/tax-returns/${returnData.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              <span>View Return Details</span>
            </Link>
            <Link
              to="/dashboard/tax-returns/history"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <History className="h-4 w-4" />
              <span>Filing History</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Workflow Step Tracker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Tax Filing Workflow Progression
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>1. Tax Calculation</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>2. Return Created</span>
          </div>
          <div className={`flex items-center gap-2.5 p-3 rounded-xl border-2 font-bold ${
            isPaid
              ? "border-emerald-500 bg-emerald-50 text-emerald-950"
              : "border-amber-500 bg-amber-50/70 text-amber-950"
          }`}>
            {isPaid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span>3. Payment {isPaid ? "Settled" : "Pending"}</span>
          </div>
          <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
            isFiled
              ? "border-teal-500 bg-teal-50 text-teal-950 font-bold border-2"
              : isPaid
              ? "border-emerald-300 bg-emerald-50/70 text-emerald-950 font-semibold"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}>
            {isFiled ? (
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
            ) : isPaid ? (
              <Clock className="h-4 w-4 text-emerald-600 shrink-0 animate-pulse" />
            ) : (
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            )}
            <span>4. {isFiled ? "Filed & Acknowledged" : "Submission Pending"}</span>
          </div>
        </div>
      </div>

      {/* Return & Liability Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            <span>Tax Return & Liability Overview</span>
          </h3>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 tracking-tight">
            {returnNumber}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Return Number</span>
            <span className="font-bold text-slate-900 text-xs mt-0.5 block truncate tracking-tight">
              {returnNumber}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Assessment Year</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {returnData.tax_year || returnData.assessment_year}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Payment Status</span>
            <span className={`font-bold text-sm mt-0.5 block flex items-center gap-1.5 ${
              isPaid ? "text-emerald-700" : "text-amber-700"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isPaid ? "Paid" : "Pending"}
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border ${
            isPaid
              ? "bg-emerald-50 border-emerald-200"
              : "bg-emerald-50 border-emerald-200"
          }`}>
            <span className="text-emerald-800 font-bold block text-[11px] uppercase tracking-wide">
              {isPaid ? "Amount Paid" : "Tax Payable"}
            </span>
            <span className="font-extrabold tabular-nums text-emerald-950 text-base mt-0.5 block">
              BDT {formatMoney(payableAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Conditionally Render Paid Screen vs Payment Actions */}
      {isPaid ? (
        /* ================= PAID SUCCESS VIEW ================= */
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Payment Completed Successfully
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
              Your tax payment of <strong className="text-slate-800 font-bold tabular-nums">BDT {formatMoney(payableAmount)}</strong> for return <strong className="text-slate-800 font-bold tracking-tight">{returnNumber}</strong> has been received and verified.
            </p>
          </div>

          {/* Receipt Info Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 max-w-md mx-auto text-xs text-left space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Transaction Reference</span>
              <span className="font-bold text-slate-800 tracking-tight">
                {returnData.payment_reference || `PAY-${returnData.id}-${Date.now().toString().slice(-6)}`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Payment Channel</span>
              <span className="font-semibold text-slate-800">
                {returnData.payment_method || "Automated A-Challan"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Paid Date & Time</span>
              <span className="font-medium text-slate-700">
                {formatDate(returnData.paid_at || returnData.updated_at || new Date())}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-semibold">Total Settled</span>
              <span className="font-extrabold tabular-nums text-emerald-700">
                BDT {formatMoney(payableAmount)}
              </span>
            </div>
          </div>

          {/* Official Filed Status Banner */}
          {isFiled && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 text-left space-y-2 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-teal-900">
                <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Tax Return Officially Filed
                </h3>
              </div>
              <p className="text-xs text-teal-800">
                Filing Status: <strong className="font-semibold text-teal-950">Filed</strong>
                {returnData.submitted_at && (
                  <span> • Submitted On: <strong className="font-semibold text-teal-950">{formatDate(returnData.submitted_at)}</strong></span>
                )}
                {returnData.acknowledgment?.acknowledgment_number && (
                  <span> • Acknowledgment Ref: <strong className="font-semibold text-teal-950 tracking-tight">{returnData.acknowledgment.acknowledgment_number}</strong></span>
                )}
              </p>
            </div>
          )}

          {/* Action & Downloadable Document Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            {canSubmit && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={submittingReturn}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>Submit Tax Return</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-300 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50 transition cursor-pointer"
            >
              <Receipt className="h-4 w-4 text-emerald-700" />
              <span>Download Payment Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCertificateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Download Tax Certificate</span>
            </button>

            <Link
              to={`/dashboard/tax-returns/${returnData.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              <span>View Full Details</span>
            </Link>

            <Link
              to="/dashboard/tax-returns/history"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <History className="h-4 w-4 text-slate-500" />
              <span>Filing History</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ================= PAYMENT PENDING VIEW ================= */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Select Payment Method</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose your preferred treasury deposit channel to complete statutory tax settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* A-Challan */}
            <label
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition ${
                paymentMethod === "A-CHALLAN"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="A-CHALLAN"
                    checked={paymentMethod === "A-CHALLAN"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    Automated A-Challan
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Government Treasury e-Challan deposit (Bangladesh Bank verified).
                  </p>
                </div>
              </div>
              <span className="mt-3 inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 rounded px-2 py-0.5 w-fit">
                Instant Settlement
              </span>
            </label>

            {/* MFS */}
            <label
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition ${
                paymentMethod === "MFS"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700 font-bold">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="MFS"
                    checked={paymentMethod === "MFS"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    bKash / Nagad / Rocket
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Fast mobile financial services digital checkout.
                  </p>
                </div>
              </div>
              <span className="mt-3 inline-block text-[10px] font-semibold text-pink-700 bg-pink-50 rounded px-2 py-0.5 w-fit">
                MFS Payment
              </span>
            </label>

            {/* Online Banking / Cards */}
            <label
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition ${
                paymentMethod === "BANK"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANK"
                    checked={paymentMethod === "BANK"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    Internet Banking / Cards
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sonali Bank, Janata Bank, Visa, and Mastercard payment gateway.
                  </p>
                </div>
              </div>
              <span className="mt-3 inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 rounded px-2 py-0.5 w-fit">
                Bank Gateway
              </span>
            </label>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block">Total Amount to Pay</span>
              <span className="font-extrabold tabular-nums text-xl text-slate-900 block">
                BDT {formatMoney(payableAmount)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/dashboard/tax-returns/${returnData.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>Cancel</span>
              </Link>

              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={paying}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
              >
                {paying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Pay BDT {formatMoney(payableAmount)} Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT TAX RETURN CONFIRMATION MODAL */}
      {showSubmitModal && (
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
                onClick={() => setShowSubmitModal(false)}
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
                  <strong className="font-semibold text-slate-900">{returnNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assessment Year:</span>
                  <strong className="font-semibold text-slate-900">{returnData.tax_year || returnData.assessment_year}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Reference:</span>
                  <strong className="font-semibold text-slate-900 tracking-tight">
                    {returnData.payment_reference || "Verified"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={submittingReturn}
                onClick={() => setShowSubmitModal(false)}
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

      {/* Document Modals */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        returnData={returnData}
      />

      <TaxCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        returnData={returnData}
      />
    </div>
  );
};

export default TaxPaymentPlaceholder;