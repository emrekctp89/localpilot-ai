"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Business, Campaign, GeneratedPlan } from "@/lib/domain-types";
import {
  buildActivationChecklist,
  isWithinActivationWindow,
  type ActivationChecklistItem,
} from "@/lib/pro-funnel";

interface UseProActivationChecklistOptions {
  isPro: boolean;
  business: Business | null;
  plan: GeneratedPlan | null;
  campaigns: Campaign[];
  proActivatedAt?: string | null;
}

export function useProActivationChecklist({
  isPro,
  business,
  plan,
  campaigns,
  proActivatedAt,
}: UseProActivationChecklistOptions) {
  const [signals, setSignals] = useState({
    hasCustomers: false,
    hasAppointments: false,
    hasApprovedDecision: false,
    hasGoogleProgress: false,
    hasContentItems: false,
  });
  const [dismissed, setDismissed] = useState(false);

  const storageKey = business?.owner_id
    ? `localpilot-pro-checklist-dismissed-${business.owner_id}`
    : "";

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  useEffect(() => {
    if (!isPro || !business?.id) return;
    let cancelled = false;

    const loadSignals = async () => {
      const businessId = business.id;
      const [
        customersResult,
        appointmentsResult,
        decisionsResult,
        googleResult,
        contentResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("decision_cycles")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "onaylandi"),
        supabase
          .from("google_checklists")
          .select("completed_item_ids")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("content_items")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
      ]);

      if (cancelled) return;

      const completedGoogleIds = Array.isArray(
        googleResult.data?.completed_item_ids,
      )
        ? googleResult.data.completed_item_ids
        : [];

      setSignals({
        hasCustomers: (customersResult.count || 0) > 0,
        hasAppointments: (appointmentsResult.count || 0) > 0,
        hasApprovedDecision: (decisionsResult.count || 0) > 0,
        hasGoogleProgress: completedGoogleIds.length > 0,
        hasContentItems: (contentResult.count || 0) > 0,
      });
    };

    void loadSignals();
    return () => {
      cancelled = true;
    };
  }, [isPro, business?.id, campaigns.length, plan?.mini_site_data]);

  const items: ActivationChecklistItem[] = useMemo(
    () =>
      buildActivationChecklist({
        campaigns,
        plan,
        business: business || ({} as Business),
        ...signals,
      }),
    [business, campaigns, plan, signals],
  );

  const visible =
    isPro &&
    !dismissed &&
    isWithinActivationWindow(proActivatedAt) &&
    Boolean(business);

  const dismiss = () => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return {
    items,
    visible,
    dismiss,
    proActivatedAt,
  };
}