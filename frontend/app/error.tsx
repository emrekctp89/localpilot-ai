"use client";

import ErrorFallback from "./components/ErrorFallback";

export default function GlobalError({
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
      boundary="app"
      title="Bir şey ters gitti"
      description="Sayfa yüklenirken beklenmeyen bir sorun oluştu. Tekrar deneyebilirsiniz."
    />
  );
}