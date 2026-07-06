"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAiUsage } from "@/lib/ai-client";
import { buildProUsageSnapshot, type AiUsageSnapshot } from "@/lib/pro-funnel";

export function useAiUsage(isPro: boolean, enabled = true) {
  const [usage, setUsage] = useState<AiUsageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    setLoading(true);
    setError("");
    try {
      const snapshot = await fetchAiUsage();
      setUsage(snapshot);
      return snapshot;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "AI kullanım bilgisi alınamadı.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, isPro, refresh]);

  const canUseAi =
    isPro || process.env.NODE_ENV === "development" || usage?.can_use_ai === true;

  const effectiveUsage = isPro ? buildProUsageSnapshot() : usage;

  return {
    usage: effectiveUsage,
    loading,
    error,
    refresh,
    canUseAi,
  };
}