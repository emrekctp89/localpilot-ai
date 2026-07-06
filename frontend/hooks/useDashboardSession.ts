"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  fetchDashboardContext,
  loadDashboardBootstrap,
} from "@/lib/dashboard-bootstrap";
import { stripMigratedOperationalFields } from "@/lib/repositories/plan-legacy";
import type { Business, Campaign, GeneratedPlan } from "@/lib/domain-types";
import type { OnboardingData } from "@/app/components/dashboard/OnboardingWizard";
import type { BusinessAccess, ProfileRole } from "@/lib/platform/access";
import { resolveBusinessAccess } from "@/lib/platform/access";
import { getBusinessMemberRecord } from "@/lib/repositories/business-access";

export interface OnboardingDraftHandlers {
  restoreOnboardingDraft: (draft: {
    step?: number;
    data?: Partial<OnboardingData>;
  }) => void;
  onOnboardingDraftKey: (key: string) => void;
  clearOnboardingDraft: (key: string) => void;
}

function activeBusinessStorageKey(userId: string) {
  return `localpilot-active-business-${userId}`;
}

export function useDashboardSession(draftHandlers: OnboardingDraftHandlers) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [seedCampaigns, setSeedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [proActivatedAt, setProActivatedAt] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<ProfileRole>("owner");
  const [platformAccess, setPlatformAccess] = useState<BusinessAccess>({
    role: "owner",
    profileRole: "owner",
    canWrite: true,
    canManageTeam: true,
    canManageIntegrations: true,
    isAgencyAccount: false,
  });
  const [accountEmail, setAccountEmail] = useState("");
  const [userId, setUserId] = useState("");

  const hydrateBusiness = useCallback(
    async (bizData: Business, currentUserId: string, currentProfileRole: ProfileRole) => {
      setBusiness(bizData);
      const memberRecord = bizData.id
        ? await getBusinessMemberRecord(bizData.id, currentUserId)
        : null;
      setPlatformAccess(
        resolveBusinessAccess(currentUserId, bizData, memberRecord, currentProfileRole),
      );

      if (!bizData.id) return;
      const bootstrap = await loadDashboardBootstrap(bizData.id);
      if (bootstrap.plan) setPlan(bootstrap.plan);
      setSeedCampaigns(bootstrap.campaigns);
      void stripMigratedOperationalFields(bizData.id);
    },
    [],
  );

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
        setUserId(session.user.id);
        const draftStorageKey = `localpilot-onboarding-draft-${session.user.id}`;
        const preferredBusinessId = window.localStorage.getItem(
          activeBusinessStorageKey(session.user.id),
        );

        const context = await fetchDashboardContext(
          session.user.id,
          preferredBusinessId,
        );
        if (shouldStop()) return;

        if (context.isPro) setIsPro(true);
        if (context.proActivatedAt) setProActivatedAt(context.proActivatedAt);
        setProfileRole(context.profileRole);
        setBusinesses(context.businesses);
        setPlatformAccess(context.platformAccess);

        if (context.business?.id) {
          draftHandlers.clearOnboardingDraft(draftStorageKey);
          window.localStorage.setItem(
            activeBusinessStorageKey(session.user.id),
            context.business.id,
          );
          await hydrateBusiness(
            context.business,
            session.user.id,
            context.profileRole,
          );
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

  const switchBusiness = useCallback(
    async (businessId: string) => {
      if (!userId) return;
      const nextBusiness = businesses.find((item) => item.id === businessId);
      if (!nextBusiness?.id) return;

      window.localStorage.setItem(activeBusinessStorageKey(userId), businessId);
      setPlan(null);
      setSeedCampaigns([]);
      await hydrateBusiness(nextBusiness, userId, profileRole);
    },
    [businesses, hydrateBusiness, profileRole, userId],
  );

  const refreshProStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("is_pro, pro_activated_at")
      .eq("id", session.user.id)
      .single();

    if (error) return false;
    const nextIsPro = Boolean(profileData?.is_pro);
    setIsPro(nextIsPro);
    if (profileData?.pro_activated_at) {
      setProActivatedAt(profileData.pro_activated_at as string);
    }
    return nextIsPro;
  };

  return {
    business,
    businesses,
    setBusiness,
    plan,
    setPlan,
    seedCampaigns,
    loading,
    dashboardError,
    isPro,
    proActivatedAt,
    profileRole,
    platformAccess,
    accountEmail,
    userId,
    switchBusiness,
    refreshProStatus,
  };
}