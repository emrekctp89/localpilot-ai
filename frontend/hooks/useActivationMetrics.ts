"use client";

import { useEffect, useState } from "react";
import type { Business } from "@/lib/domain-types";
import {
  buildActivationMetrics,
  type ActivationMetrics,
} from "@/lib/activation-metrics";
import { loadActivationMetricSignals } from "@/lib/repositories/activation-metrics";

export function useActivationMetrics(business: Business | null) {
  const [metrics, setMetrics] = useState<ActivationMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!business?.id) {
      setMetrics(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const loadMetrics = async () => {
      try {
        const signals = await loadActivationMetricSignals(
          business.id!,
          business.owner_id,
        );

        if (cancelled) return;

        if (!signals.businessCreatedAt && business.created_at) {
          signals.businessCreatedAt = business.created_at;
        }

        setMetrics(buildActivationMetrics(signals));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Aktivasyon metrikleri yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [business?.id, business?.owner_id, business?.created_at]);

  return { metrics, loading, error };
}