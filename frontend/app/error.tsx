"use client";

import RouteStatus from "./components/RouteStatus";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <RouteStatus
        tone="error"
        title="Bir şey ters gitti"
        description="Sayfa yüklenirken beklenmeyen bir sorun oluştu. Tekrar deneyebilirsiniz."
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
