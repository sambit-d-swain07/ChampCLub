"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log server error with full context for diagnostics
    console.error("[Admin Error Boundary]", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm max-w-xl mx-auto my-8">
      <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Unable to load administrative data
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        A transient connection issue occurred while communicating with the database. Please try again.
        {error.digest && (
          <span className="block text-xs font-mono text-gray-400 mt-2">
            Reference code: {error.digest}
          </span>
        )}
      </p>
      <Button
        onClick={() => reset()}
        className="bg-[#0B3B2C] hover:bg-[#07271D] text-white text-xs font-medium px-5 h-9 rounded-lg flex items-center gap-2 cursor-pointer"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Try Again</span>
      </Button>
    </div>
  );
}
