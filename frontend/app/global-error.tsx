"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientError(error, {
      boundary: "global",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen bg-[#fafafa] text-gray-900 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-2xl font-black text-red-600">
              !
            </div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">
              LocalPilot
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-900">
              Uygulama yüklenemedi
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Beklenmeyen bir hata oluştu. Sayfayı yenileyerek tekrar
              deneyebilirsiniz.
            </p>
            <button
              onClick={reset}
              className="mt-6 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-gray-700"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}