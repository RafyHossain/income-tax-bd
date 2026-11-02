import React from "react";
import { Loader2 } from "lucide-react";

const LoadingState = ({ message = "Loading data...", className = "" }) => {
  return (
    <div className={`flex min-h-[300px] flex-col items-center justify-center p-8 text-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="mt-3 text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

export default LoadingState;

