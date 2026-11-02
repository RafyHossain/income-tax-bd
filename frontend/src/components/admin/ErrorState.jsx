import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

const ErrorState = ({
  title = "An error occurred",
  message = "Failed to load data. Please try again.",
  onRetry,
  className = "",
}) => {
  return (
    <div className={`flex min-h-[300px] flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50/70 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-red-900">{title}</h3>
        <p className="mt-1.5 text-sm text-red-700 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;

