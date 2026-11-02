import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Receipt,
  Banknote,
  Building2,
  Send,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import TaxReturnService from "@/services/taxReturnService";
import RefundService from "@/services/refundService";
import PaymentReceiptModal from "@/components/tax-returns/PaymentReceiptModal";
import TaxCertificateModal from "@/components/tax-returns/TaxCertificateModal";
import { getIncomeYearFromAssessmentYear } from "@/utils/taxYearUtils";

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

const StatusBadge = ({ returnStatus, paymentStatus, refundAmount, activeRefundRequest }) => {
  if (Number(refundAmount || 0) > 0) {
    if (activeRefundRequest?.status === "REFUNDED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Refunded
        </span>
      );
    }
    if (activeRefundRequest?.status === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-800">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Refund Approved
        </span>
      );
    }
    if (activeRefundRequest?.status === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Refund Pending
        </span>
      );
    }
    if (activeRefundRequest?.status === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-0.5 text-xs font-semibold text-rose-800">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Refund Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-0.5 text-xs font-semibold text-sky-800">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        Refund Due
      </span>
    );
  }

  const isFiled =
    returnStatus === "FILED" ||
    returnStatus === "SUBMITTED" ||
    returnStatus === "ACKNOWLEDGED";

  const isPaid =
    paymentStatus === "SUCCESS" ||
    paymentStatus === "PAID" ||
    returnStatus === "PAID";

  let label = "Payment Pending";
  let badgeClass = "bg-amber-50 text-amber-800 border-amber-300";
  let dotClass = "bg-amber-500 animate-pulse";

  if (isFiled) {
    label = "Filed";
    badgeClass = "bg-teal-50 text-teal-800 border-teal-200";
    dotClass = "bg-teal-500";
  } else if (isPaid) {
    label = "Payment Successful";
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
    dotClass = "bg-emerald-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
};

const TaxReturnDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Document modals state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Return submission state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Refund request state
  const [activeRefundRequest, setActiveRefundRequest] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundForm, setRefundForm] = useState({
    account_holder_name: "",
    bank_name: "",
    bank_account_number: "",
    branch_name: "",
    reason: "",
  });

  const handleConfirmSubmit = async () => {
    if (!returnData?.id || submittingReturn) return;
    setSubmittingReturn(true);
    try {
      const res = await TaxReturnService.submitTaxReturn(returnData.id);
      if (res?.success) {
        toast.success(res.message || "Tax return successfully filed!");
        setShowSubmitModal(false);
        await fetchReturnDetails();
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

  const fetchReturnDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await TaxReturnService.getTaxReturnById(id);
      if (res?.success && res.data) {
        setReturnData(res.data);

        // If return has refund due, check for existing refund request
        const refundAmt = Number(res.data.refund_amount || 0);
        if (refundAmt > 0) {
          try {
            const refundRes = await RefundService.getByReturnId(res.data.id);
            if (refundRes?.success && refundRes.data?.activeRequest) {
              setActiveRefundRequest(refundRes.data.activeRequest);
            } else {
              setActiveRefundRequest(null);
            }
          } catch (refundErr) {
            console.error("fetch refund info error:", refundErr);
          }
        }
      } else {
        setError("Tax return record not found.");
      }
    } catch (err) {
      console.error("fetchReturnDetails error:", err);
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
    fetchReturnDetails();
  }, [id]);

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!returnData) return;

    if (!refundForm.account_holder_name.trim()) {
      toast.error("Account holder name is required.");
      return;
    }
    if (!refundForm.bank_name.trim()) {
      toast.error("Bank name is required.");
      return;
    }
    if (!refundForm.bank_account_number.trim()) {
      toast.error("Bank account number is required.");
      return;
    }
    if (!refundForm.branch_name.trim()) {
      toast.error("Branch name is required.");
      return;
    }

    try {
      setRefundSubmitting(true);
      const res = await RefundService.submitRefundRequest({
        returnId: returnData.id,
        account_holder_name: refundForm.account_holder_name.trim(),
        bank_name: refundForm.bank_name.trim(),
        bank_account_number: refundForm.bank_account_number.trim(),
        branch_name: refundForm.branch_name.trim(),
        reason: refundForm.reason.trim(),
      });

      toast.success(res?.message || "Refund request submitted successfully!");
      setShowRefundModal(false);
      setActiveRefundRequest(res?.data || null);
    } catch (err) {
      console.error("Refund submission error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to submit refund request."
      );
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="mt-3 text-xs font-medium text-slate-600">
          Loading tax return details...
        </p>
      </div>
    );
  }

  if (error || !returnData) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-xs max-w-xl mx-auto">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <h3 className="text-sm font-bold text-red-900">Failed to Load Tax Return</h3>
        <p className="mt-1 text-xs text-red-700 max-w-sm">
          {error || "Tax return record does not exist."}
        </p>
        <Link
          to="/dashboard/tax-returns"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Tax Returns</span>
        </Link>
      </div>
    );
  }

  const tp = returnData.taxpayer_info || {};
  const tax = returnData.tax_summary || {};

  // Taxpayer identity
  const taxpayerName =
    tp.taxpayer_name ||
    returnData.taxpayer_name ||
    tp.name ||
    "Taxpayer";

  const tinNumber =
    tp.tin ||
    tp.tin_number ||
    returnData.tin_number ||
    "Not Recorded";

  const assessmentYear =
    returnData.assessment_year ||
    returnData.tax_year ||
    tp.assessment_year ||
    "2026-27";

  const returnNumber =
    returnData.return_number ||
    returnData.returnNumber ||
    `TRN-${String(assessmentYear).replace("-", "")}-${String(returnData.id).padStart(6, "0")}`;

  // Tax Credits (TDS + Advance Tax)
  const tdsAmount = Number(
    returnData.tds_amount ?? tax.tds_amount ?? returnData.tdsAmount ?? 0
  );
  const advanceTaxAmount = Number(
    returnData.advance_tax_amount ?? tax.advance_tax_amount ?? returnData.advanceTaxAmount ?? 0
  );
  const totalTaxCredits = Number(
    tax.total_tax_credits ?? returnData.total_tax_credits ?? (tdsAmount + advanceTaxAmount)
  );

  // Total Tax Due before credits (Must use tax_liability which enforces minimum tax floor)
  const taxLiability = Number(
    returnData.tax_liability ??
    tax.tax_liability ??
    returnData.net_tax ??
    tax.net_tax ??
    0
  );
  const surcharge = Number(returnData.surcharge_amount ?? tax.surcharge_amount ?? 0);
  const totalTaxAssessed = Number(
    returnData.total_tax_payable ?? tax.total_tax_payable ?? (taxLiability + surcharge)
  );

  // Refund Amount
  const refundAmount = Number(returnData.refund_amount ?? tax.refund_amount ?? 0);

  // Remaining Net Payable (Never negative)
  const remainingPayable = Math.max(
    0,
    Number(returnData.payable_tax ?? returnData.final_payable ?? tax.final_payable ?? (totalTaxAssessed - totalTaxCredits))
  );

  const isPaid =
    returnData.payment_status === "PAID" ||
    returnData.payment_status === "SUCCESS" ||
    returnData.return_status === "PAID";

  const isFiled =
    returnData.return_status === "FILED" ||
    returnData.return_status === "SUBMITTED" ||
    returnData.return_status === "ACKNOWLEDGED";

  const canSubmit = !isFiled && (isPaid || remainingPayable === 0);

  const paymentReference =
    returnData.transaction_id ||
    returnData.payment_reference ||
    returnData.payment_id ||
    null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-0 space-y-6">
      {/* Printable Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              Income Tax Return Confirmation
            </h1>
            <p className="text-xs text-slate-600">
              Assessment Year: {assessmentYear} • Return #{returnNumber}
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold block">Taxpayer: {taxpayerName}</span>
            <span className="text-slate-500 text-[10px] tracking-tight">e-TIN: {tinNumber}</span>
          </div>
        </div>
      </div>

      {/* A. Header */}
      <div className="print:hidden border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-slate-800 transition">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/dashboard/tax-returns" className="hover:text-slate-800 transition">
            Tax Filing
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold tracking-tight">{returnNumber}</span>
        </div>

        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 tracking-tight">
              {returnNumber}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              AY {assessmentYear}
              <span className="text-slate-400 font-normal ml-1">
                (Income Year {returnData.income_year || getIncomeYearFromAssessmentYear(assessmentYear)})
              </span>
            </span>
            <StatusBadge
              returnStatus={returnData.return_status}
              paymentStatus={returnData.payment_status}
              refundAmount={refundAmount}
              activeRefundRequest={activeRefundRequest}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Tax Return
          </h1>
        </div>
      </div>

      {/* B. Taxpayer Information Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
          Taxpayer Information
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Taxpayer Name</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
              {taxpayerName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">e-TIN Number</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block tracking-tight">
              {tinNumber}
            </span>
          </div>
        </div>
      </div>

      {/* C. Payment & Refund Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
          Calculation & Settlement Summary
        </h2>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-slate-500 block text-[11px] font-medium">
              Final Net Tax Liability
            </span>
            <span className="font-bold tabular-nums text-slate-900 text-base mt-1 block">
              BDT {formatMoney(totalTaxAssessed)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Assessed Tax Liability
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-slate-500 block text-[11px] font-medium">
              Tax Already Paid (Credits)
            </span>
            <span className="font-bold tabular-nums text-slate-900 text-base mt-1 block">
              BDT {formatMoney(totalTaxCredits)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              TDS ({formatMoney(tdsAmount)}) + Advance ({formatMoney(advanceTaxAmount)})
            </span>
          </div>

          {/* Refund Due Card vs Remaining Payable Card */}
          {refundAmount > 0 ? (
            <div className="sm:col-span-2 rounded-xl border border-sky-300 bg-sky-50/70 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sky-900 font-bold block text-xs uppercase tracking-wider">
                  Eligible Tax Refund
                </span>
                {activeRefundRequest && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-sky-200 text-sky-800">
                    Claim Status: {activeRefundRequest.status}
                  </span>
                )}
              </div>
              <span className="font-extrabold tabular-nums text-sky-950 text-2xl mt-1 block">
                BDT {formatMoney(refundAmount)}
              </span>
              <span className="text-xs font-medium text-sky-700 mt-0.5 block">
                Total tax paid exceeds tax liability. You are eligible for an income tax refund from the government.
              </span>
            </div>
          ) : (
            <div className="sm:col-span-2 rounded-xl border border-emerald-300 bg-emerald-50/70 p-5">
              <span className="text-emerald-800 font-bold block text-xs uppercase tracking-wider">
                Remaining Amount Payable
              </span>
              <span className="font-extrabold tabular-nums text-emerald-950 text-2xl mt-1 block">
                {isPaid ? "BDT 0.00" : `BDT ${formatMoney(remainingPayable)}`}
              </span>
              <span className="text-xs font-medium text-emerald-700 mt-0.5 block">
                {isPaid ? "Paid in full • No outstanding balance" : "Net outstanding balance due for settlement"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active Refund Request Details Card (Shown if a claim exists) */}
      {refundAmount > 0 && activeRefundRequest && (
        <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-sky-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Refund Application Status (#REF-{activeRefundRequest.id})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Submitted: {formatDate(activeRefundRequest.created_at)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Account Title:</span>
              <span className="font-semibold text-slate-800">{activeRefundRequest.account_holder_name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Bank Name:</span>
              <span className="font-semibold text-slate-800">{activeRefundRequest.bank_name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Account Number:</span>
              <span className="font-bold text-slate-900 tracking-tight">{activeRefundRequest.bank_account_number}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Branch Name:</span>
              <span className="font-semibold text-slate-800">{activeRefundRequest.branch_name}</span>
            </div>
          </div>

          {activeRefundRequest.status === "REFUNDED" && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-950 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="block">Refund Payout Disbursed</strong>
                <span className="text-[11px] text-emerald-800 block">
                  Transaction Ref: <strong className="font-semibold tracking-tight">{activeRefundRequest.transaction_reference}</strong> • Date: {formatDate(activeRefundRequest.refunded_at)}
                </span>
              </div>
            </div>
          )}

          {activeRefundRequest.status === "REJECTED" && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-950 flex items-start gap-2.5">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Application Declined by Tax Authority</strong>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  {activeRefundRequest.rejection_reason || "Declined during tax authority review. You may re-submit with corrected credentials."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Filed Status Banner */}
      {isFiled && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-teal-950">
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Tax Return Officially Filed
              </h3>
              <p className="mt-0.5 text-xs text-teal-800">
                Filing Status: <strong className="font-semibold text-teal-950">Filed</strong>
                {returnData.submitted_at && (
                  <span>
                    {" "}• Submitted On:{" "}
                    <strong className="font-semibold text-teal-950">
                      {new Date(returnData.submitted_at).toLocaleString("en-BD", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                )}
                {returnData.acknowledgment?.acknowledgment_number && (
                  <span>
                    {" "}• Acknowledgment Ref:{" "}
                    <strong className="font-semibold text-teal-950 tracking-tight">
                      {returnData.acknowledgment.acknowledgment_number}
                    </strong>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Successfully Paid / Filed Details & Genuine Document Links (Shown when paid OR filed) */}
      {(isPaid || isFiled) && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {isFiled
                  ? "Tax Return Officially Filed"
                  : "Payment Completed Successfully"}
              </h3>
              {paymentReference ? (
                <p className="mt-0.5 text-xs text-emerald-800">
                  Transaction Reference: <span className="font-bold tracking-tight">{paymentReference}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-emerald-800">
                  {refundAmount > 0
                    ? `Eligible for tax refund of BDT ${refundAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}. Net tax payable is BDT 0.00.`
                    : "Zero tax liability verified."}
                </p>
              )}
            </div>
          </div>

          {/* Genuine Document Download Buttons */}
          <div className="pt-3 border-t border-emerald-200/60 flex flex-wrap gap-2.5">
            {paymentReference && (
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50 transition cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5 text-emerald-700" />
                <span>Download Payment Receipt (A-Challan)</span>
              </button>
            )}

            {isFiled && (
              <button
                type="button"
                onClick={() => setShowCertificateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-white" />
                <span>Download Tax Certificate</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* D. Action Buttons */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          to="/dashboard/tax-returns"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
          <span>Back to Returns</span>
        </Link>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
          {/* Submit Tax Return Button - shown only when paid/zero-tax and not already filed */}
          {canSubmit && (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={submittingReturn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs shadow-teal-600/30 hover:bg-teal-700 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Submit Tax Return</span>
            </button>
          )}

          {/* If Refund Due */}
          {refundAmount > 0 ? (
            !activeRefundRequest || activeRefundRequest.status === "REJECTED" ? (
              <button
                type="button"
                onClick={() => {
                  setRefundForm({
                    account_holder_name: taxpayerName !== "Taxpayer" ? taxpayerName : "",
                    bank_name: "",
                    bank_account_number: "",
                    branch_name: "",
                    reason: "",
                  });
                  setShowRefundModal(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs shadow-sky-600/30 hover:bg-sky-700 transition cursor-pointer"
              >
                <Banknote className="h-4 w-4" />
                <span>Submit Refund Request</span>
              </button>
            ) : (
              <Link
                to="/dashboard/refunds"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
              >
                <Banknote className="h-4 w-4" />
                <span>View My Refund Claims</span>
              </Link>
            )
          ) : (
            /* If Tax Payable */
            !isPaid && !isFiled && remainingPayable > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/dashboard/tax-returns/${returnData.id}/payment`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs shadow-emerald-600/30 hover:bg-emerald-700 transition cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>Proceed to Payment</span>
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* REFUND REQUEST FORM MODAL */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-sky-700">
                <Banknote className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Submit Refund Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRefund} className="mt-4 space-y-3.5 text-xs">
              {/* Read-only Refund Amount */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 block">
                  Refund Amount (Auto-Populated)
                </span>
                <span className="text-2xl font-extrabold text-sky-950 mt-1 block tabular-nums">
                  BDT {formatMoney(refundAmount)}
                </span>
                <span className="text-[10px] text-sky-600 mt-0.5 block">
                  Derived directly from Return #{returnNumber}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Account Holder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full name as in bank records"
                  value={refundForm.account_holder_name}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, account_holder_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Dutch-Bangla Bank PLC, Sonali Bank"
                  value={refundForm.bank_name}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, bank_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Bank Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 115103004567"
                  value={refundForm.bank_account_number}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, bank_account_number: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mohakhali Branch, Dhaka"
                  value={refundForm.branch_name}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, branch_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional notes for the tax refund officer"
                  value={refundForm.reason}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, reason: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  disabled={refundSubmitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition"
                >
                  {refundSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Submit Refund Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT TAX RETURN CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
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
                  <strong className="font-semibold text-slate-900">{assessmentYear}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxpayer:</span>
                  <strong className="font-semibold text-slate-900">{taxpayerName}</strong>
                </div>
                {paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Reference:</span>
                    <strong className="font-semibold text-slate-900 tracking-tight">{paymentReference}</strong>
                  </div>
                )}
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

export default TaxReturnDetails;
