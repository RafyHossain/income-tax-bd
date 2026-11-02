import React from "react";

const StatusBadge = ({ status }) => {
  const norm = String(status || "").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";

  if (norm === "ACTIVE" || norm === "VERIFIED" || norm === "SUBMITTED") {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotColor = "bg-emerald-500";
  } else if (norm === "INACTIVE" || norm === "REJECTED") {
    colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
    dotColor = "bg-slate-400";
  } else if (norm === "DRAFT" || norm === "PENDING" || norm === "UNAVAILABLE") {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
    dotColor = "bg-amber-500";
  } else if (norm === "ADMIN") {
    colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200";
    dotColor = "bg-indigo-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${colorClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {norm || "UNKNOWN"}
    </span>
  );
};

export default StatusBadge;

