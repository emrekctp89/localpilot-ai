"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCampaignsFromPlan } from "@/lib/plan-utils";
import { listCampaigns } from "@/lib/repositories/campaigns";
import { stripMigratedOperationalFields } from "@/lib/repositories/plan-legacy";
import type { Business, Campaign, GeneratedPlan } from "@/lib/domain-types";
import type { OnboardingData } from "@/app/components/dashboard/OnboardingWizard";
export interface OnboardingDraftHandlers {
  restoreOnboardingDraft: (draft: {
    step?: number;
    data?: Partial<OnboardingData>;
  }) => void;
  onOnboardingDraftKey: (key: string) => void;
  clearOnboardingDraft: (key: string) => void;
}

export function useDashboardSession(draftHandlers: OnboardingDraftHandlers) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [seedCampaigns, setSeedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    const shouldStop = () => cancelled || timedOut;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      if (!cancelled) {
        setDashboardError(
          "Panel verileri zamanında yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.",
        );
        setLoading(false);
      }
    }, 12000);

    const fetchDashboardData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (shouldStop()) return;
        if (!session) {
          router.push("/auth");
          return;
        }
        setAccountEmail(session.user.email || "");
        const draftStorageKey = `localpilot-onboarding-draft-${session.user.id}`;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", session.user.id)
          .single();
        if (shouldStop()) return;
        if (profileData?.is_pro) setIsPro(true);

        const { data: bizData } = await supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (shouldStop()) return;

        if (bizData) {
          draftHandlers.clearOnboardingDraft(draftStorageKey);
          setBusiness(bizData);
          const { data: planData } = await supabase
            .from("generated_plans")
            .select("*")
            .eq("business_id", bizData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (shouldStop()) return;
          if (planData) {
            setPlan(planData);
          }
          const storedCampaigns = await listCampaigns(bizData.id);
          setSeedCampaigns(
            storedCampaigns.length > 0
              ? storedCampaigns
              : getCampaignsFromPlan(planData ?? undefined),
          );
          void stripMigratedOperationalFields(bizData.id);
        } else {
          try {
            const storedDraft = window.localStorage.getItem(draftStorageKey);
            if (storedDraft) {
              draftHandlers.restoreOnboardingDraft(JSON.parse(storedDraft));
            }
          } catch {
            window.localStorage.removeItem(draftStorageKey);
          } finally {
            draftHandlers.onOnboardingDraftKey(draftStorageKey);
          }
        }
      } catch (error) {
        if (!shouldStop()) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : "Panel verileri yüklenemedi.",
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!shouldStop()) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const refreshProStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", session.user.id)
      .single();

    if (error) return false;
    const nextIsPro = Boolean(profileData?.is_pro);
    setIsPro(nextIsPro);
    return nextIsPro;
  };

  return {
    business,
    setBusiness,
    plan,
    setPlan,
    seedCampaigns,
    loading,
    dashboardError,
    isPro,
    accountEmail,
    refreshProStatus,
  };
}