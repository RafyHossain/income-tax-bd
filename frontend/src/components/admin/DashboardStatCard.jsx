import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

const DashboardStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  link,
  linkText = "Manage",
  accent = "emerald",
}) => {
  const accentColors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  const badgeStyle = accentColors[accent] || accentColors.emerald;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
            {typeof value === "number" ? value.toLocaleString("en-US") : value}
          </p>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${badgeStyle}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {link && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <Link
            to={link}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:text-emerald-700 transition"
          >
            <span>{linkText}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardStatCard;

