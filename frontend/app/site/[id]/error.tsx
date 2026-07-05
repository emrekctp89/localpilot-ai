"use client";

import RouteStatus from "../../components/RouteStatus";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <RouteStatus
        eyebrow="Mini Site"
        tone="error"
        title="Vitrin yüklenemedi"
        description="Bu işletme sayfası açılırken bir sorun oluştu. Birazdan tekrar deneyin."
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
