"use client";

import ErrorFallback from "../../components/ErrorFallback";

export default function SiteError({
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
      boundary="mini-site"
      eyebrow="Mini Site"
      title="Vitrin yüklenemedi"
      description="Bu işletme sayfası açılırken bir sorun oluştu. Birazdan tekrar deneyin."
    />
  );
}