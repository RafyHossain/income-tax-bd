import React from "react";
import { Link, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";

const nameMap = {
  admin: "Admin",
  "tax-years": "Tax Years",
  "tax-rules": "Tax Slabs",
  "tax-thresholds": "Tax-Free Thresholds",
  "minimum-tax-rules": "Minimum Tax Rules",
  "income-exemption-rules": "Income Exemptions",
  "tax-deduction-rules": "Tax Deductions",
  "tax-rebate-rules": "Tax Rebates",
  "surcharge-rules": "Surcharges",
  users: "User Management",
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <nav className="flex items-center text-xs font-medium text-slate-500" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 sm:space-x-2">
        <li className="inline-flex items-center">
          <Link
            to="/admin"
            className="inline-flex items-center text-slate-400 hover:text-slate-700 transition"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const displayName = nameMap[value] || value.replace(/-/g, " ");

          return (
            <li key={to} className="inline-flex items-center">
              <ChevronRight className="h-3 w-3 text-slate-400 mx-1 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-slate-800 capitalize truncate max-w-[200px]">
                  {displayName}
                </span>
              ) : (
                <Link
                  to={to}
                  className="hover:text-slate-800 transition capitalize truncate max-w-[150px]"
                >
                  {displayName}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
