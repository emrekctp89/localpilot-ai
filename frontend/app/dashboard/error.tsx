"use client";

import ErrorFallback from "../components/ErrorFallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      boundary="dashboard"
      eyebrow="Yönetim Paneli"
      title="Panel yüklenemedi"
      description="Panel verileri alınırken bir sorun oluştu. Bağlantınızı kontrol edip tekrar deneyin."
    />
  );
}