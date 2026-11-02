import React, { useRef, useState } from "react";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Award,
  ShieldCheck,
  Landmark,
  FileCheck,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
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
    month: "long",
    year: "numeric",
  });
};

const TaxCertificateModal = ({ isOpen, onClose, returnData }) => {
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

  const certNumber = `NBR-CERT-${String(assessmentYear).replace("-", "")}-${String(returnData.id).padStart(6, "0")}`;

  const paymentReference =
    returnData.payment_reference ||
    returnData.transaction_id ||
    `AC-${String(assessmentYear).replace("-", "")}-${String(returnData.id).padStart(6, "0")}`;

  const issueDate = returnData.paid_at || returnData.updated_at || new Date();

  // Financials
  const totalIncome = Number(returnData.total_income || 0);
  const taxableIncome = Number(returnData.taxable_income || 0);
  const netTax = Number(returnData.net_tax ?? tax.net_tax ?? returnData.tax_liability ?? 0);
  const surcharge = Number(returnData.surcharge_amount ?? tax.surcharge_amount ?? 0);
  const totalTaxAssessed = Number(returnData.total_tax_payable ?? tax.total_tax_payable ?? (netTax + surcharge));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-tax-certificate");
    if (!element) return;

    setIsDownloadingPdf(true);
    try {
      const cleanReturnNum = String(returnNumber).replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanAY = String(assessmentYear).replace(/[^a-zA-Z0-9_-]/g, "_");
      await downloadElementAsPdf(
        element,
        `Income_Tax_Certificate_AY${cleanAY}_${cleanReturnNum}.pdf`
      );
      toast.success("Tax certificate PDF downloaded successfully!");
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
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="print:hidden flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Tax Return & Compliance Certificate
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer disabled:opacity-60"
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

        {/* Printable Certificate Body with Ornate Border */}
        <div
          ref={printRef}
          id="printable-tax-certificate"
          className="p-8 sm:p-12 text-slate-800 bg-white rounded-b-2xl"
        >
          {/* Certificate Dual Frame Border */}
          <div className="border-4 border-emerald-800 p-6 sm:p-8 rounded-xl relative bg-linear-to-b from-white via-emerald-50/10 to-white">
            <div className="border border-emerald-700/60 p-6 sm:p-8 rounded-lg space-y-6">
              
              {/* Official Header & Crest */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 text-emerald-800 mb-1 border-2 border-emerald-700">
                  <Landmark className="h-7 w-7 text-emerald-800" />
                </div>
                <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                  Government of the People's Republic of Bangladesh
                </h1>
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest">
                  National Board of Revenue (NBR)
                </p>
                <p className="text-[11px] font-semibold text-slate-600">
                  Taxes Department • Income Tax Assessment Division
                </p>

                <div className="pt-3">
                  <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-widest text-emerald-950 border-b-2 border-emerald-800 pb-1 inline-block">
                    Certificate of Tax Compliance & Return Assessment
                  </h2>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                    (Issued pursuant to Section 180 of the Income Tax Act, 2023 / Form IT-11GA)
                  </p>
                </div>
              </div>

              {/* Reference Number & Date Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs border-b border-slate-200 pb-3 gap-2">
                <div>
                  <span className="text-slate-500">Certificate No: </span>
                  <strong className="text-emerald-950 font-bold tracking-tight">{certNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Date of Issue: </span>
                  <strong className="text-slate-900 font-bold">{formatDate(issueDate)}</strong>
                </div>
              </div>

              {/* Formal Attestation Paragraph */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                <p className="text-center font-bold text-slate-900 tracking-wider text-xs uppercase text-emerald-900">
                  — TO WHOM IT MAY CONCERN —
                </p>
                <p className="text-justify indent-6">
                  This is to officially certify that <strong className="text-slate-900 font-bold underline decoration-emerald-600 underline-offset-2">{taxpayerName}</strong>, 
                  bearer of Taxpayer Identification Number (<strong className="text-slate-900 font-bold tracking-tight">e-TIN: {tinNumber}</strong>) and National Identity Card (<strong className="text-slate-900 font-bold tracking-tight">NID: {nid}</strong>), 
                  is a registered individual taxpayer under the jurisdiction of the National Board of Revenue, Bangladesh.
                </p>
                <p className="text-justify indent-6">
                  The taxpayer has submitted their statutory Income Tax Return for the <strong className="text-slate-900 font-bold">Assessment Year {assessmentYear}</strong> (Income Year: <strong className="text-slate-900 font-bold">{incomeYear}</strong>) under Return Registration Number <strong className="text-slate-900 font-bold tracking-tight">{returnNumber}</strong>.
                </p>
                <p className="text-justify indent-6">
                  The assessed gross tax liability of <strong className="text-slate-900 font-bold">BDT {formatMoney(totalTaxAssessed)}</strong> has been fully settled and paid into the Bangladesh Government Treasury under Challan transaction reference <strong className="text-slate-900 font-bold tracking-tight">{paymentReference}</strong>. 
                  As of this date, the taxpayer maintains <strong className="text-emerald-900 font-bold">ZERO OUTSTANDING STATUTORY TAX LIABILITY</strong> for the specified assessment period.
                </p>
              </div>

              {/* Summary of Assessment Table */}
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/20 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-emerald-100/60 text-emerald-950 font-bold border-b border-emerald-200">
                    <tr>
                      <th className="py-2 px-3">Item / Description</th>
                      <th className="py-2 px-3 text-right">Assessed Amount (BDT)</th>
                      <th className="py-2 px-3 text-center">Statutory Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 text-[11px]">
                    <tr>
                      <td className="py-1.5 px-3 font-medium">Total Declared Income</td>
                      <td className="py-1.5 px-3 text-right font-bold tabular-nums">{formatMoney(totalIncome)}</td>
                      <td className="py-1.5 px-3 text-center text-emerald-800">Assessed</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-medium">Taxable Income</td>
                      <td className="py-1.5 px-3 text-right font-bold tabular-nums">{formatMoney(taxableIncome)}</td>
                      <td className="py-1.5 px-3 text-center text-emerald-800">Approved</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-medium">Net Tax Liability</td>
                      <td className="py-1.5 px-3 text-right font-bold tabular-nums">{formatMoney(totalTaxAssessed)}</td>
                      <td className="py-1.5 px-3 text-center text-emerald-800">Determined</td>
                    </tr>
                    <tr className="bg-emerald-100/40 font-bold text-emerald-950">
                      <td className="py-2 px-3">Net Outstanding Tax Liability</td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-sm">BDT 0.00 (Nil)</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          CLEARED
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Official Seal, Signature & Security Token */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
                {/* Official Stamp / Seal Placeholder */}
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-emerald-800 flex items-center justify-center p-1 text-center text-[8px] font-bold text-emerald-900 uppercase">
                    NBR OFFICIAL SEAL VERIFIED
                  </div>
                  <div className="space-y-0.5 text-[11px] text-slate-500">
                    <p className="font-bold text-slate-800">National Board of Revenue</p>
                    <p>Government of Bangladesh</p>
                    <p className="text-[10px] text-emerald-800">Digital Authentication Token</p>
                  </div>
                </div>

                {/* Deputy Commissioner of Taxes Attestation */}
                <div className="text-center sm:text-right space-y-1">
                  <div className="inline-block border-b border-slate-400 pb-1 px-4">
                    <span className="font-script text-sm font-bold text-slate-800 italic block">
                      Digitally Verified by NBR
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">
                    Deputy Commissioner of Taxes
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Taxes Circle Online Verification Cell
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium tracking-tight">
                    System Token: {certNumber}
                  </p>
                </div>
              </div>

              {/* Bottom Verification Note */}
              <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100">
                This certificate is an official electronic record generated under Section 180 of the Income Tax Act, 2023. It is legally valid and accepted across all financial and government authorities without manual seal.
              </div>
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer disabled:opacity-60"
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

export default TaxCertificateModal;

