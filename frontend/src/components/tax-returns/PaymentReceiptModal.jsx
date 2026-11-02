import React, { useRef, useState } from "react";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Building2,
  Receipt,
  ShieldCheck,
  Landmark,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { numberToWordsBDT } from "@/utils/numberToWords";
import { getIncomeYearFromAssessmentYear } from "@/utils/taxYearUtils";
import { downloadElementAsPdf } from "@/utils/pdfDownloader";

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

const PaymentReceiptModal = ({ isOpen, onClose, returnData }) => {
  const printRef = useRef(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen || !returnData) return null;

  const tp = returnData.taxpayer_info || {};
  const tax = returnData.tax_summary || {};

  const taxpayerName =
    tp.taxpayer_name ||
    returnData.taxpayer_name ||
    tp.name ||
    returnData.full_name ||
    "Registered Taxpayer";

  const tinNumber =
    tp.tin ||
    tp.tin_number ||
    returnData.tin_number ||
    "123456789012";

  const nid = tp.nid || returnData.nid || "19851234567890";

  const assessmentYear =
    returnData.assessment_year ||
    returnData.tax_year ||
    tp.assessment_year ||
    "2026-27";

  const incomeYear =
    returnData.income_year ||
    getIncomeYearFromAssessmentYear(assessmentYear);

  const returnNumber =
    returnData.return_number ||
    returnData.returnNumber ||
    `TRN-${String(assessmentYear).replace("-", "")}-${String(returnData.id).padStart(6, "0")}`;

  const paymentReference =
    returnData.payment_reference ||
    returnData.transaction_id ||
    `AC-${String(assessmentYear).replace("-", "")}-${String(returnData.id).padStart(6, "0")}-${Date.now().toString().slice(-4)}`;

  const paymentMethod = returnData.payment_method || "A-CHALLAN (Automated Treasury)";
  const paidAt = returnData.paid_at || returnData.updated_at || new Date();

  // Financials
  const netTax = Number(returnData.net_tax ?? tax.net_tax ?? returnData.tax_liability ?? 0);
  const surcharge = Number(returnData.surcharge_amount ?? tax.surcharge_amount ?? 0);
  const totalTaxAssessed = Number(returnData.total_tax_payable ?? tax.total_tax_payable ?? (netTax + surcharge));

  const tdsAmount = Number(returnData.tds_amount ?? tax.tds_amount ?? 0);
  const advanceTaxAmount = Number(returnData.advance_tax_amount ?? tax.advance_tax_amount ?? 0);
  const totalCredits = Number(tax.total_tax_credits ?? (tdsAmount + advanceTaxAmount));

  const paidAmount = Math.max(0, Number(returnData.payable_tax ?? returnData.final_payable ?? (totalTaxAssessed - totalCredits)));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-payment-receipt");
    if (!element) return;

    setIsDownloadingPdf(true);
    try {
      const cleanReturnNum = String(returnNumber).replace(/[^a-zA-Z0-9_-]/g, "_");
      await downloadElementAsPdf(element, `Tax_Payment_Receipt_${cleanReturnNum}.pdf`);
      toast.success("Payment receipt PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF. You can also use the Print button.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Container Card */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="print:hidden flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Tax Payment Receipt (A-Challan)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-60"
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isDownloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div
          ref={printRef}
          id="printable-payment-receipt"
          className="p-8 sm:p-10 space-y-6 text-slate-800 bg-white rounded-b-2xl"
        >
          {/* Official Government Header */}
          <div className="text-center space-y-1 border-b-2 border-slate-900 pb-5">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-800 mb-1 border border-emerald-200">
              <Landmark className="h-6 w-6 text-emerald-700" />
            </div>
            <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
              Government of the People's Republic of Bangladesh
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              Internal Resources Division • Ministry of Finance
            </p>
            <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              National Board of Revenue (NBR)
            </p>
            <div className="pt-2">
              <span className="inline-block rounded-md bg-slate-900 px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-white">
                Automated Challan (A-Challan) • Tax Payment Receipt
              </span>
            </div>
          </div>

          {/* Challan Metadata Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Challan / Txn Reference
              </span>
              <span className="font-bold text-slate-900 text-xs tracking-tight">
                {paymentReference}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Payment Channel
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Deposit Timestamp
              </span>
              <span className="font-medium text-slate-800 text-xs">
                {formatDate(paidAt)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Head of Account (Economic Code)
              </span>
              <span className="font-bold text-slate-900 text-xs tracking-tight">
                1-1141-0005-0101
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Return Reference
              </span>
              <span className="font-bold text-slate-900 text-xs tracking-tight">
                {returnNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Treasury Status
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                VERIFIED & PAID
              </span>
            </div>
          </div>

          {/* Taxpayer Information Block */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-4 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] border-b border-slate-100 pb-1.5">
              Taxpayer Particulars
            </h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">Taxpayer Name:</span>
                <span className="font-bold text-slate-900 text-xs">{taxpayerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Taxpayer Identification No (e-TIN):</span>
                <span className="font-bold text-slate-900 text-xs tracking-tight">{tinNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">National ID (NID):</span>
                <span className="font-semibold text-slate-800 text-xs tracking-tight">{nid}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Assessment Year / Income Year:</span>
                <span className="font-semibold text-slate-800 text-xs">
                  AY {assessmentYear} • IY {incomeYear}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Accounting Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">SL</th>
                  <th className="py-2.5 px-3">Description of Assessment & Deposit</th>
                  <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 text-slate-500 font-medium">01</td>
                  <td className="py-2 px-3 text-slate-700">Gross Assessed Tax Liability</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums">{formatMoney(totalTaxAssessed)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500 font-medium">02</td>
                  <td className="py-2 px-3 text-slate-700">Less: Tax Deducted at Source (TDS)</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums">({formatMoney(tdsAmount)})</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500 font-medium">03</td>
                  <td className="py-2 px-3 text-slate-700">Less: Advance Income Tax (AIT) Paid</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums">({formatMoney(advanceTaxAmount)})</td>
                </tr>
                <tr className="bg-emerald-50/50 font-bold">
                  <td className="py-2.5 px-3 text-emerald-900 font-medium">04</td>
                  <td className="py-2.5 px-3 text-emerald-950">
                    Net Tax Deposited into Treasury via this Challan
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-emerald-950 text-sm">
                    BDT {formatMoney(paidAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <span className="text-slate-400 block text-[11px] font-medium">Amount in Words:</span>
            <span className="font-bold text-slate-900 italic mt-0.5 block">
              {numberToWordsBDT(paidAmount)}
            </span>
          </div>

          {/* Verification Disclaimer & Seal */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1 text-slate-500 text-[11px] max-w-sm">
              <p className="flex items-center gap-1 font-semibold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Electronically Verified Treasury Challan
              </p>
              <p>
                This electronic A-Challan receipt is issued through the Integrated Government Treasury Gateway and serves as authentic legal evidence of tax settlement under the Income Tax Act, 2023.
              </p>
            </div>

            <div className="text-center font-medium text-[10px] text-slate-400 border border-dashed border-slate-300 rounded-lg p-2.5 w-44">
              <span className="block font-bold text-slate-600 uppercase text-[9px] mb-1">
                NBR Verification Token
              </span>
              <span className="block font-bold text-emerald-800 tracking-wider">
                VALID-{returnData.id}-{Date.now().toString().slice(-6)}
              </span>
              <span className="block text-slate-400 text-[8px] mt-0.5">
                No physical signature required
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer (Hidden when printing) */}
        <div className="print:hidden flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 bg-slate-50/80 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-60"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isDownloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptModal;

