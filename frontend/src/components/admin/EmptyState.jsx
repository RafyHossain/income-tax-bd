import React from "react";
import { Inbox, Plus } from "lucide-react";

const EmptyState = ({
  icon: Icon = Inbox,
  title = "No records found",
  description = "No data matches your current search or filters.",
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div className={`flex min-h-[260px] flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

