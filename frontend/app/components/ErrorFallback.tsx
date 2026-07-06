"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/error-reporting";
import RouteStatus from "./RouteStatus";

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  boundary: string;
  eyebrow?: string;
  title: string;
  description: string;
};

export default function ErrorFallback({
  error,
  reset,
  boundary,
  eyebrow,
  title,
  description,
}: ErrorFallbackProps) {
  useEffect(() => {
    captureClientError(error, {
      boundary,
      digest: error.digest,
    });
  }, [boundary, error]);

  return (
    <div>
      <RouteStatus
        eyebrow={eyebrow}
        tone="error"
        title={title}
        description={description}
      />
      <div className="fixed inset-x-0 bottom-8 flex justify-center px-4">
        <button
          onClick={reset}
          className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-gray-700"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}