import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import TaxCalculationService from "@/services/taxCalculationService";
import { getIncomeYearFromAssessmentYear, formatTaxYearLabel } from "@/utils/taxYearUtils";
import {
  Eye,
  FileText,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";

// helpers

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatCategory = (category) => {
  if (!category) {
    return "N/A";
  }

  return String(category)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCalculationId = (calculation) => {
  return (
    calculation?.calculationId ??
    calculation?.calculation_id ??
    calculation?.id
  );
};

const TaxCalculationHistory = ({
  calculations: propCalculations,
  loading: propLoading = false,
  onRefresh: propOnRefresh,
  onView: propOnView,
}) => {
  const navigate = useNavigate();

  const [fetchedCalculations, setFetchedCalculations] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter states
  const [taxYearFilter, setTaxYearFilter] = useState("");

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isStandalonePage = propCalculations === undefined;

  const loadHistory = async () => {
    if (propOnRefresh) {
      propOnRefresh();
      return;
    }

    try {
      setFetchLoading(true);
      setFetchError("");
      const response = await TaxCalculationService.getCalculations();
      const list = Array.isArray(response?.data) ? response.data : [];
      setFetchedCalculations(list);
    } catch (err) {
      console.error("Get Calculation History Error:", err);
      setFetchError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load calculation history."
      );
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (isStandalonePage) {
      loadHistory();
    }
  }, [isStandalonePage]);

  const rawCalculations = Array.isArray(propCalculations)
    ? propCalculations
    : Array.isArray(fetchedCalculations)
    ? fetchedCalculations
    : [];

  const isLoading = propLoading || fetchLoading;

  // Extract available unique tax years
  const availableTaxYears = useMemo(() => {
    const years = new Set();
    rawCalculations.forEach((item) => {
      const year = item.taxYear ?? item.tax_year;
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [rawCalculations]);

  // Filtered calculations
  const filteredCalculations = useMemo(() => {
    return rawCalculations.filter((item) => {
      const year = String(item.taxYear ?? item.tax_year ?? "");

      if (taxYearFilter && year !== taxYearFilter) {
        return false;
      }

      return true;
    });
  }, [rawCalculations, taxYearFilter]);

  // Pagination calculations
  const totalItems = filteredCalculations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCalculations = filteredCalculations.slice(startIndex, endIndex);

  // Reset page when filter changes
  const handleTaxYearChange = (e) => {
    setTaxYearFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setTaxYearFilter("");
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // Generate pagination page numbers
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (validCurrentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [
      1,
      "...",
      validCurrentPage - 1,
      validCurrentPage,
      validCurrentPage + 1,
      "...",
      totalPages,
    ];
  };

  const handleView = (id) => {
    if (propOnView) {
      propOnView(id);
    } else {
      navigate(`/dashboard/tax-calculation-history/${id}`);
    }
  };

  const handleDelete = async (calculation) => {
    const calcId = getCalculationId(calculation);
    if (!calcId) return;

    try {
      setDeleting(true);
      await TaxCalculationService.deleteCalculation(calcId);
      toast.success("Tax calculation deleted successfully.");
      setDeleteTarget(null);
      if (propOnRefresh) {
        propOnRefresh();
      } else {
        await loadHistory();
      }
    } catch (err) {
      console.error("Delete calculation error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete tax calculation."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">Calculation History</h2>
              {rawCalculations.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {rawCalculations.length} total
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Your previous personal income tax calculation records.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          FILTER TOOLBAR
      ================================================= */}
      {rawCalculations.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="max-w-xs">
            <label className="text-xs font-medium text-slate-600">Tax Year</label>
            <select
              value={taxYearFilter}
              onChange={handleTaxYearChange}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Tax Years</option>
              {availableTaxYears.map((year) => (
                <option key={year} value={year}>
                  {formatTaxYearLabel(year)}
                </option>
              ))}
            </select>
          </div>

          {taxYearFilter && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Found <span className="font-semibold text-slate-800">{totalItems}</span> matching records
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* =================================================
          CONTENT / TABLE
      ================================================= */}
      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
            Loading calculation history...
          </div>
        </div>
      ) : fetchError ? (
        <div className="px-5 py-10 text-center text-sm text-red-600">
          <AlertCircle className="mx-auto mb-2 h-6 w-6" />
          {fetchError}
        </div>
      ) : rawCalculations.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No calculation history found.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Your calculations will appear here after filing or calculating.
          </p>
        </div>
      ) : filteredCalculations.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No records matched your search filters.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-medium text-slate-500">SL</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Tax Year</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Category</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Total Income</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Taxable Income</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Tax Rebate</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Tax Liability</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Net Result</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Date</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-slate-500">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedCalculations.map((item, index) => {
                const calculationId = getCalculationId(item);
                const taxYear = item.taxYear ?? item.tax_year ?? "N/A";
                const category = item.category || null;
                const totalIncome = item.totalIncome ?? item.total_income ?? 0;
                const taxableIncome = item.taxableIncome ?? item.taxable_income ?? 0;
                const taxRebate = item.taxRebate ?? item.tax_rebate ?? 0;
                const taxLiability = item.taxLiability ?? item.tax_liability ?? 0;
                const finalPayable = item.finalPayable ?? item.final_payable ?? taxLiability;
                const calculatedAt =
                  item.calculatedAt ??
                  item.calculated_at ??
                  item.createdAt ??
                  item.created_at;

                return (
                  <tr
                    key={calculationId ?? index}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {startIndex + index + 1}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-900">
                      <div>AY {taxYear}</div>
                      <div className="text-[10px] text-slate-400">
                        IY {getIncomeYearFromAssessmentYear(taxYear)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatCategory(category)}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-900">
                      BDT {formatMoney(totalIncome)}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-900">
                      BDT {formatMoney(taxableIncome)}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-900">
                      BDT {formatMoney(taxRebate)}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                      BDT {formatMoney(taxLiability)}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold">
                      {Number(finalPayable) < 0 ? (
                        <span className="font-semibold text-slate-900">
                          Refund BDT {formatMoney(Math.abs(Number(finalPayable)))}
                        </span>
                      ) : Number(finalPayable) > 0 ? (
                        <span className="text-slate-900">
                          BDT {formatMoney(finalPayable)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          BDT 0.00 (Settled)
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(calculatedAt)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(calculationId)}
                          title="View calculation details"
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          title="Delete calculation"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =================================================
          PAGINATION FOOTER
      ================================================= */}
      {!isLoading && totalItems > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row">
          {/* Left: Range and Page Size selector */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{" "}
              <span className="font-semibold text-slate-800">{endIndex}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalItems}</span> calculations
            </span>

            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              title="First Page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={validCurrentPage === 1}
              title="Previous Page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1 px-1">
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-medium transition ${
                      validCurrentPage === page
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={validCurrentPage === totalPages}
              title="Next Page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              title="Last Page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          DELETE CONFIRMATION MODAL
      ================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              Delete Tax Calculation?
            </h3>

            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete the calculation record for{" "}
              <strong className="text-slate-700">
                {deleteTarget.taxYear ?? deleteTarget.tax_year}
              </strong>{" "}
              ({formatCategory(deleteTarget.category)})? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(deleteTarget)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalculationHistory;
