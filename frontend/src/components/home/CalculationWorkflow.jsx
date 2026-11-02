import { useState } from "react";
import {
  Wallet,
  Receipt,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Coins,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Award,
  ChevronRight,
  Layers,
  FileCheck2,
} from "lucide-react";
import Container from "@/components/common/Container";

const workflowSteps = [
  {
    step: "01",
    title: "Income Aggregation",
    subtitle: "Consolidate all income heads",
    icon: Wallet,
    accent: "text-blue-600 bg-blue-50 border-blue-200",
    description:
      "All active income sources (Employment Salary, House Property Rent, Business Profit, Agriculture, Capital Gains, Financial Assets, and Other Sources) are aggregated for the selected assessment year.",
    formula: "Gross Receipts = Sum of all declared income sources",
    keyHighlight: "Captures 7 distinct income heads",
  },
  {
    step: "02",
    title: "Statutory Deductions & Salary Exemption",
    subtitle: "Reduce gross income legally",
    icon: Receipt,
    accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
    description:
      "Statutory salary exemption (one-third of salary income or maximum statutory ceiling from the database) plus verified tax-deductible business operating expenses are subtracted to arrive at Net Taxable Income.",
    formula: "Taxable Income = Gross Income − (Salary Exemption + Business Expenses)",
    keyHighlight: "1/3 Salary Exemption Capped (BDT 500k / 450k)",
  },
  {
    step: "03",
    title: "Category Exemption & Progressive Slabs",
    subtitle: "Apply 0% limit and progressive tax brackets",
    icon: Calculator,
    accent: "text-purple-600 bg-purple-50 border-purple-200",
    description:
      "Your personal tax-free threshold (General, Female, Senior Citizen 65+, Physically Challenged, Freedom Fighter, Third Gender, July Warrior, etc.) is applied as Slab 1 (0%). Remaining income is taxed across progressive slabs (10%, 15%, 20%, 25%, 30%).",
    formula: "Gross Tax = Sum of (Income in Slab Bracket × Slab Rate %)",
    keyHighlight: "8 Taxpayer Categories with 0% to 30% Slabs",
  },
  {
    step: "04",
    title: "Investment Tax Rebate",
    subtitle: "Deduct allowable investment credit",
    icon: TrendingUp,
    accent: "text-amber-600 bg-amber-50 border-amber-200",
    description:
      "Approved investments (DPS up to BDT 120k/yr, Life insurance premium, Treasury bonds, Stocks) receive a direct 15% tax rebate, capped at the lower of 3% of taxable income or BDT 1,000,000.",
    formula: "Tax after Rebate = Gross Tax − Min(15% of Investment, 3% of Income, 10 Lac)",
    keyHighlight: "15% Direct Tax Credit on Approved Investments",
  },
  {
    step: "05",
    title: "Net Wealth Surcharge",
    subtitle: "Apply surcharge on high asset holders",
    icon: Coins,
    accent: "text-indigo-600 bg-indigo-50 border-indigo-200",
    description:
      "If your total declared net wealth exceeds statutory thresholds (starting above BDT 4 Crore), a tiered surcharge (10%, 20%, 30%, or 35%) is calculated on the net income tax amount.",
    formula: "Surcharge = Tax after Rebate × Applicable Surcharge Rate %",
    keyHighlight: "Tiered rates starting from BDT 4 Crore wealth",
  },
  {
    step: "06",
    title: "Minimum Tax Enforcement & Final Liability",
    subtitle: "Establish final payable amount",
    icon: ShieldCheck,
    accent: "text-emerald-700 bg-emerald-50 border-emerald-300",
    description:
      "Your final tax liability is compared against mandatory location-based minimum tax rules (Dhaka/Chattogram City Corp: BDT 5,000; Other City Corp: BDT 4,000; Non-City Corp: BDT 3,000; First-time taxpayer reduced rates).",
    formula: "Final Payable = Max(Net Tax + Surcharge, Location Minimum Tax)",
    keyHighlight: "Enforces statutory floor based on City/Area",
  },
];

const sampleWalkthrough = [
  {
    step: "Step 1: Gross Income",
    label: "Total Receipts",
    amount: "BDT 1,800,000.00",
    breakdown: "Salary: BDT 1,200,000.00 + Business/Consultancy: BDT 600,000.00",
    type: "positive",
  },
  {
    step: "Step 2: Less Deductions",
    label: "Salary Exemption & Business Expense",
    amount: "− BDT 450,000.00",
    breakdown: "1/3 Salary Exemption: BDT 400,000.00 + Deductible Expenses: BDT 50,000.00",
    type: "deduction",
  },
  {
    step: "Result: Net Taxable Income",
    label: "Income Subject to Tax Slabs",
    amount: "BDT 1,350,000.00",
    breakdown: "BDT 1,800,000.00 − BDT 450,000.00",
    type: "highlight",
  },
  {
    step: "Step 3: Progressive Tax Slabs",
    label: "Gross Tax on Slabs (General Male)",
    amount: "BDT 145,000.00",
    breakdown: "Slab 1 (0 to 375k): BDT 0.00 | Slab 2 (300k @ 10%): BDT 30k | Slab 3 (400k @ 15%): BDT 60k | Slab 4 (275k @ 20%): BDT 55k",
    type: "tax",
  },
  {
    step: "Step 4: Investment Rebate",
    label: "Less: 15% Tax Rebate",
    amount: "− BDT 22,500.00",
    breakdown: "Eligible Investment: BDT 150,000.00 (DPS & Insurance) × 15% Rebate",
    type: "deduction",
  },
  {
    step: "Step 5: Net Wealth Surcharge",
    label: "Surcharge on Net Wealth",
    amount: "BDT 0.00",
    breakdown: "Net Wealth below statutory BDT 4 Crore threshold (0% Surcharge)",
    type: "neutral",
  },
  {
    step: "Step 6: Minimum Tax Check",
    label: "Final Tax Payable",
    amount: "BDT 122,500.00",
    breakdown: "Calculated Tax BDT 122,500.00 exceeds Dhaka City Corporation Minimum Tax (BDT 5,000.00)",
    type: "final",
  },
];

const CalculationWorkflow = () => {
  const [viewMode, setViewMode] = useState("methodology"); // 'methodology' | 'walkthrough'

  return (
    <section id="how-it-works" className="border-b border-slate-200 bg-white py-16 sm:py-24">
      <Container>
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">


          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How the Tax Calculation Works
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Our calculation engine executes an automated, sequential pipeline fully aligned with the Bangladesh Income Tax Act. Explore each stage of the methodology or view a real-world example.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-8 inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("methodology")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                viewMode === "methodology"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>Pipeline Methodology</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("walkthrough")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                viewMode === "walkthrough"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              <span>Real-World Example Walkthrough</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: PIPELINE METHODOLOGY */}
        {viewMode === "methodology" && (
          <div className="mt-12 space-y-12">
            {/* 6 Step Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workflowSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${item.accent}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600 tracking-wider">
                          STAGE {item.step}
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{item.subtitle}</p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-6 space-y-3 pt-4 border-t border-slate-100">
                      {/* Formula Box */}
                      <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] font-medium text-slate-700 leading-snug border border-slate-100">
                        <span className="font-semibold text-slate-400 block mb-0.5 text-[10px] uppercase font-sans">
                          Formula / Logic:
                        </span>
                        {item.formula}
                      </div>

                      {/* Key Highlight Pill */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{item.keyHighlight}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Process Pipeline Bar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
              <div className="text-center">
              
                <h4 className="mt-1 text-base font-bold text-slate-800">
                  How Raw Income Transforms Into Final Tax
                </h4>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-slate-800 sm:text-sm">
                <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-2xs">
                  1. Gross Income
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-2xs">
                  2. Less Deductions
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-2xs">
                  3. Net Taxable Income
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-2xs">
                  4. Progressive Slabs
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-2xs">
                  5. Less Rebates
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-2xs">
                  6. Add Surcharge
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="rounded-xl bg-emerald-50 px-3.5 py-2 border border-emerald-300 text-emerald-950 font-extrabold shadow-2xs">
                  7. Minimum Tax Comparison ➔ Final Tax
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: LIVE ILLUSTRATED WALKTHROUGH */}
        {viewMode === "walkthrough" && (
          <div className="mt-12 space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Practical Case Study
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Real-World Tax Computation Walkthrough (AY 2026-27)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Profile: General Resident Individual with Salary, Business Income, and Eligible Investments in Dhaka.
                  </p>
                </div>
              </div>

              {/* Step Ledger Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-5 py-3.5">Calculation Stage</th>
                      <th className="px-5 py-3.5">Computation Breakdown</th>
                      <th className="px-5 py-3.5 text-right">Resulting Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sampleWalkthrough.map((row, index) => {
                      const isHighlight = row.type === "highlight";
                      const isFinal = row.type === "final";
                      const isDeduction = row.type === "deduction";

                      return (
                        <tr
                          key={index}
                          className={`transition ${
                            isFinal
                              ? "bg-emerald-50/70 font-bold border-t-2 border-emerald-300"
                              : isHighlight
                              ? "bg-slate-50/80 font-bold"
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="block text-xs font-semibold text-slate-400">
                              {row.step}
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                isFinal ? "text-emerald-950 text-base" : "text-slate-900"
                              }`}
                            >
                              {row.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-600">
                            {row.breakdown}
                          </td>

                          <td
                            className={`px-5 py-4 text-right whitespace-nowrap font-bold ${
                              isFinal
                                ? "text-lg text-emerald-950 font-extrabold"
                                : isDeduction
                                ? "text-slate-700"
                                : isHighlight
                                ? "text-slate-900 font-extrabold"
                                : "text-slate-900"
                            }`}
                          >
                            {row.amount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Informative Walkthrough Notes */}
              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="font-bold text-slate-900">1. Salary Exemption Applied</p>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    1/3 of BDT 1,200,000 is BDT 400,000. Since it is below the statutory ceiling of BDT 500,000, full BDT 400,000 is exempted completely tax-free.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="font-bold text-slate-900">2. Progressive Slabs Utilized</p>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    First BDT 375,000 has 0% tax. Only the remaining income is progressively taxed at 10%, 15%, and 20% within their respective brackets.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="font-bold text-slate-900">3. Direct Rebate Reduction</p>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    BDT 150,000 in approved investments yielded a direct 15% reduction (BDT 22,500), bringing final tax down to BDT 122,500.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};

export default CalculationWorkflow;
