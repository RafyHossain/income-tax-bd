import { useEffect, useState } from "react";
import {
  Calendar,
  Calculator,
  Users,
  PiggyBank,
  TrendingUp,
  MapPin,
  Coins,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import Container from "@/components/common/Container";
import PublicTaxRuleService from "@/services/publicTaxRuleService";

const formatBDT = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "BDT 0.00";
  const num = Number(amount);
  if (isNaN(num)) return `BDT ${amount}`;
  return `BDT ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCrore = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return "BDT 0";
  if (num >= 10000000) {
    const crore = num / 10000000;
    return `BDT ${crore} Crore (${num.toLocaleString("en-US")})`;
  }
  return formatBDT(amount);
};

const CATEGORY_NAMES = {
  GENERAL: "General Individual Taxpayers",
  WOMEN: "Women Taxpayers",
  SENIOR_CITIZEN: "Senior Citizens (Aged 65+)",
  PHYSICALLY_CHALLENGED: "Physically Challenged Individuals",
  THIRD_GENDER: "Third Gender Individuals",
  WAR_WOUNDED_FREEDOM_FIGHTER: "War-Wounded Gazetted Freedom Fighters",
  JULY_WARRIOR: "July 2024 Mass-Uprising Fighters",
};

const YearwiseTaxRules = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState(["2026-27", "2025-26", "2024-25", "2023-24"]);
  const [selectedYear, setSelectedYear] = useState("2026-27");
  const [rulesByYear, setRulesByYear] = useState({});
  const [activeTab, setActiveTab] = useState("slabs"); // 'slabs' | 'thresholds' | 'salary' | 'rebate' | 'minimumTax' | 'surcharge'

  useEffect(() => {
    loadAllRules();
  }, []);

  const loadAllRules = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await PublicTaxRuleService.getPublicAllYearsOverview();
      if (res?.data?.years && res.data.years.length > 0) {
        setYears(res.data.years);
        setRulesByYear(res.data.overviewByYear || {});
        if (!selectedYear || !res.data.years.includes(selectedYear)) {
          setSelectedYear(res.data.years[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load public tax rules:", err);
      setError("Unable to load tax rules from the database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentRules = rulesByYear[selectedYear] || null;

  return (
    <section id="tax-rules" className="border-b border-slate-200 bg-slate-50/50 py-16 sm:py-24">
      <Container>
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">


          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Year-Wise Bangladesh Income Tax Rules
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            All progressive slabs, tax-free limits, salary exemptions, investment rebates, and minimum tax guidelines are retrieved live from our official tax database.
          </p>
        </div>

        {/* Year Selector Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {years.map((yr, idx) => {
            const isSelected = yr === selectedYear;
            const isCurrent = idx === 0;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`group relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-xs ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Calendar className={`h-4 w-4 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                <span>AY {yr}</span>
                {isCurrent && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isSelected
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    Current
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={loadAllRules}
            disabled={loading}
            title="Refresh database rules"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-3 text-sm font-medium text-slate-700">Loading statutory tax rules from database...</p>
            <p className="text-xs text-slate-400">Fetching slabs, thresholds, exemptions, rebates, and minimum tax</p>
          </div>
        ) : error ? (
          <div className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <p className="mt-2 text-sm font-bold">{error}</p>
            <button
              type="button"
              onClick={loadAllRules}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Loading
            </button>
          </div>
        ) : currentRules ? (
          <div className="mt-8 space-y-6">
            {/* Rule Navigation Tabs */}
            <div className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-t-2xl px-3 pt-3 shadow-xs scrollbar-none">
              <nav className="flex space-x-2">
                {[
                  { id: "slabs", label: "Progressive Tax Slabs", icon: Calculator },
                  { id: "thresholds", label: "Category Exemptions", icon: Users },
                  { id: "salary", label: "Salary Exemption", icon: PiggyBank },
                  { id: "rebate", label: "Investment Rebates", icon: TrendingUp },
                  { id: "minimumTax", label: "Minimum Tax", icon: MapPin },
                  { id: "surcharge", label: "Wealth Surcharge", icon: Coins },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
                        isActive
                          ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
                          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* TAB CONTENT CARDS */}
            <div className="rounded-b-2xl rounded-t-none border border-slate-200 border-t-0 bg-white p-6 sm:p-8 shadow-xs">
              {/* 1. SLABS TAB */}
              {activeTab === "slabs" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Progressive Income Tax Slabs (Assessment Year {selectedYear})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tax is calculated incrementally on income falling inside each progressive slab bracket.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Total Slabs: {currentRules.slabs?.length || 0}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-5 py-3.5">Slab Order</th>
                          <th className="px-5 py-3.5">Taxable Bracket (Income Range)</th>
                          <th className="px-5 py-3.5 text-center">Tax Rate (%)</th>
                          <th className="px-5 py-3.5 text-right">Tax on Full Bracket</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {currentRules.slabs?.map((slab, index) => {
                          const min = Number(slab.minimum_income || 0);
                          const max = slab.maximum_income !== null ? Number(slab.maximum_income) : null;
                          const rate = Number(slab.tax_rate || 0);
                          const span = max !== null ? max - min : null;
                          const maxTax = span !== null ? (span * rate) / 100 : null;

                          return (
                            <tr key={slab.id || index} className="transition hover:bg-slate-50/60">
                              <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 mr-2">
                                  {index + 1}
                                </span>
                                {index === 0 ? "Slab 1 (Tax-Free)" : `Slab ${index + 1}`}
                              </td>

                              <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                                {index === 0 ? (
                                  <span>First {formatBDT(max)} (Tax-Free)</span>
                                ) : max !== null ? (
                                  <span>
                                    Next {formatBDT(span)}{" "}
                                    <span className="text-xs text-slate-400 font-normal">
                                      ({formatBDT(min % 1000 === 0 ? min + 1 : min)} to {formatBDT(max)})
                                    </span>
                                  </span>
                                ) : (
                                  <span>
                                    Remaining Income Above {formatBDT(min % 1000 === 0 ? min + 1 : min)}
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${
                                    rate === 0
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : rate <= 10
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : rate <= 20
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}
                                >
                                  {rate}%
                                </span>
                              </td>

                              <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                                {maxTax !== null ? formatBDT(maxTax) : "Balance × " + rate + "%"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

              
                </div>
              )}

              {/* 2. THRESHOLDS TAB */}
              {activeTab === "thresholds" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Category Tax-Free Thresholds (Assessment Year {selectedYear})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Zero tax is payable on taxable income up to your category-specific exemption limit.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {currentRules.thresholds?.length || 0} Categories Defined
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentRules.thresholds?.map((thresh) => {
                      const name = CATEGORY_NAMES[thresh.category] || thresh.category;
                      const amount = thresh.tax_free_threshold;

                      return (
                        <div
                          key={thresh.id}
                          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {thresh.category}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </div>
                          <h4 className="mt-2 text-sm font-bold text-slate-900 leading-snug">{name}</h4>
                          <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between">
                            <span className="text-xs text-slate-500">Tax-Free Limit:</span>
                            <span className="text-base font-extrabold text-slate-900">{formatBDT(amount)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Dependent Child Additional Exemption Note */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                            SPECIAL REBATE
                          </span>
                          <Users className="h-4 w-4 text-emerald-700" />
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-emerald-950">
                          Parents / Guardians of Disabled Children
                        </h4>
                        <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                          Additional tax-free allowance of <strong>BDT 50,000.00</strong> per physically challenged child or dependent added on top of the standard category threshold.
                        </p>
                      </div>
                      <div className="mt-4 border-t border-emerald-200/60 pt-3 flex items-baseline justify-between">
                        <span className="text-xs text-emerald-800">Per Child Dependent:</span>
                        <span className="text-sm font-extrabold text-emerald-950">+ BDT 50,000.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. SALARY EXEMPTION TAB */}
              {activeTab === "salary" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Statutory Salary Exemption Rule (Assessment Year {selectedYear})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Statutory tax exemption granted automatically on salaried employment income.
                    </p>
                  </div>

                  {currentRules.salaryExemption ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Main Rule Summary Card */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <PiggyBank className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Active Exemption Formula</h4>
                            <p className="text-xs text-slate-500">Applied automatically to gross salary receipts</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Calculation Method:</span>
                            <span className="font-bold text-slate-900">
                              {currentRules.salaryExemption.calculation_type === "ONE_THIRD"
                                ? "One-Third (1/3) of Total Salary Income"
                                : `${currentRules.salaryExemption.exemption_percentage}% of Salary Income`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Statutory Maximum Ceiling:</span>
                            <span className="font-extrabold text-base text-slate-900">
                              {formatBDT(currentRules.salaryExemption.max_exemption_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Database Status:</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Active Rule
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed italic">
                          &ldquo;{currentRules.salaryExemption.description || "Statutory salary exemption under the Income Tax Act"}&rdquo;
                        </p>
                      </div>

                      {/* Practical Example Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-slate-500" />
                          Practical Example
                        </h4>

                        <div className="space-y-3 text-xs">
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Example 1 (Below Ceiling):</p>
                            <p className="font-semibold text-slate-900 mt-1">
                              Salary = BDT 900,000.00
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              1/3 of salary = BDT 300,000.00. Since BDT 300,000 is less than{" "}
                              {formatBDT(currentRules.salaryExemption.max_exemption_amount)}, the entire{" "}
                              <strong>BDT 300,000.00</strong> is completely tax-free.
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Example 2 (Capped at Ceiling):</p>
                            <p className="font-semibold text-slate-900 mt-1">
                              Salary = BDT 1,800,000.00
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              1/3 of salary = BDT 600,000.00. Since BDT 600,000 exceeds{" "}
                              {formatBDT(currentRules.salaryExemption.max_exemption_amount)}, the exemption is capped at{" "}
                              <strong>{formatBDT(currentRules.salaryExemption.max_exemption_amount)}</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No salary exemption rule configured for this year.</p>
                  )}
                </div>
              )}

              {/* 4. REBATE TAB */}
              {activeTab === "rebate" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Investment Tax Rebate Regulations (Assessment Year {selectedYear})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tax credit directly subtracted from your gross tax bill based on approved qualifying investments.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rebate Rate</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">15.00%</p>
                      <p className="mt-1 text-xs text-slate-500">Applied on allowable eligible investment amount</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Income Cap</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">3.00%</p>
                      <p className="mt-1 text-xs text-slate-500">Maximum 3% of total taxable income under Section 78</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absolute Maximum Cap</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">BDT 1,000,000</p>
                      <p className="mt-1 text-xs text-slate-500">Highest allowable rebate amount per tax return</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Eligible Investment Avenues in Bangladesh:
                    </h4>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Deposit Pension Scheme (DPS) up to BDT 120,000 / year</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Life insurance premium (up to 10% of sum assured)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Government Treasury Bonds / Sanchayapatra (prior rules)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Stocks, mutual funds & debentures listed on DSE/CSE</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. MINIMUM TAX TAB */}
              {activeTab === "minimumTax" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Statutory Minimum Tax Rules (Assessment Year {selectedYear})
                    </h3>
                    <p className="text-xs text-slate-500">
                      When calculated tax liability is below statutory threshold, taxpayer is required to pay minimum tax.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentRules.minimumTax?.map((rule) => {
                      const amount = rule.minimum_tax_amount;
                      const areaName = rule.area_name || rule.area_code;

                      return (
                        <div
                          key={rule.id}
                          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {rule.rule_type === "TAXPAYER_TYPE" ? "Taxpayer Category" : "Geographic Area"}
                            </span>
                            <MapPin className="h-4 w-4 text-emerald-600" />
                          </div>
                          <h4 className="mt-2 text-sm font-bold text-slate-900 leading-snug">{areaName}</h4>
                          <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between">
                            <span className="text-xs text-slate-500">Minimum Tax Payable:</span>
                            <span className="text-base font-extrabold text-slate-900">{formatBDT(amount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. SURCHARGE TAB */}
              {activeTab === "surcharge" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Net Wealth Surcharge Slabs (Assessment Year {selectedYear})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Surcharge is calculated as an additional percentage of your net income tax based on total declared assets/wealth.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-5 py-3.5">Net Wealth Slab</th>
                          <th className="px-5 py-3.5">Wealth Range</th>
                          <th className="px-5 py-3.5 text-center">Surcharge Rate (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {currentRules.surcharges?.map((sur, idx) => {
                          const min = Number(sur.minimum_wealth || 0);
                          const max = sur.maximum_wealth !== null ? Number(sur.maximum_wealth) : null;
                          const rate = Number(sur.surcharge_rate || 0);

                          return (
                            <tr key={sur.id || idx} className="transition hover:bg-slate-50/60">
                              <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                {sur.rule_name || `Slab ${idx + 1}`}
                              </td>

                              <td className="px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap font-medium">
                                {max !== null ? (
                                  <span>
                                    {formatCrore(min)} to {formatCrore(max)}
                                  </span>
                                ) : (
                                  <span>Above {formatCrore(min)}</span>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${
                                    rate === 0
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}
                                >
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Container>
    </section>
  );
};

export default YearwiseTaxRules;
