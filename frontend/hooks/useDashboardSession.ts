"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  fetchDashboardContext,
  loadDashboardBootstrap,
} from "@/lib/dashboard-bootstrap";
import {
  activeBusinessKey,
  clearPaymentReturnFromUrl,
  hasEstablishedBusiness,
  markEstablishedBusiness,
  onboardingDraftKey,
  readPaymentReturn,
  sleep,
} from "@/lib/dashboard-session-storage";
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

const BUSINESS_FETCH_ATTEMPTS = 4;
const BUSINESS_FETCH_RETRY_MS = 500;

export function useDashboardSession(draftHandlers: OnboardingDraftHandlers) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [seedCampaigns, setSeedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [businessRestorePending, setBusinessRestorePending] = useState(false);
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
      markEstablishedBusiness(currentUserId, bizData.id);
      const bootstrap = await loadDashboardBootstrap(bizData.id);
      if (bootstrap.plan) setPlan(bootstrap.plan);
      setSeedCampaigns(bootstrap.campaigns);
      void stripMigratedOperationalFields(bizData.id);
    },
    [],
  );

  const loadDashboardContextWithRetry = useCallback(
    async (currentUserId: string, preferredBusinessId: string | null) => {
      let lastContext = await fetchDashboardContext(currentUserId, preferredBusinessId);

      if (lastContext.business?.id) {
        return lastContext;
      }

      const shouldRetry =
        readPaymentReturn() !== null || hasEstablishedBusiness(currentUserId);
      if (!shouldRetry) {
        return lastContext;
      }

      for (let attempt = 1; attempt < BUSINESS_FETCH_ATTEMPTS; attempt += 1) {
        await sleep(BUSINESS_FETCH_RETRY_MS * attempt);
        await supabase.auth.refreshSession().catch(() => undefined);
        lastContext = await fetchDashboardContext(currentUserId, preferredBusinessId);
        if (lastContext.business?.id) {
          return lastContext;
        }
      }

      return lastContext;
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
        setBusinessRestorePending(false);
      }
    }, 12000);

    const fetchDashboardData = async () => {
      const paymentReturn = readPaymentReturn();

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (shouldStop()) return;
        if (userError || !user) {
          router.push("/auth");
          return;
        }

        setAccountEmail(user.email || "");
        setUserId(user.id);
        const draftStorageKey = onboardingDraftKey(user.id);
        const preferredBusinessId = window.localStorage.getItem(
          activeBusinessKey(user.id),
        );
        const establishedBusiness = hasEstablishedBusiness(user.id);
        const shouldSkipDraft =
          paymentReturn !== null || establishedBusiness;

        if (paymentReturn && establishedBusiness) {
          setBusinessRestorePending(true);
        }

        const context = await loadDashboardContextWithRetry(
          user.id,
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
          await hydrateBusiness(context.business, user.id, context.profileRole);
          setBusinessRestorePending(false);
          if (paymentReturn) {
            clearPaymentReturnFromUrl();
          }
        } else if (shouldSkipDraft) {
          setBusinessRestorePending(true);
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
          setBusinessRestorePending(false);
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

      window.localStorage.setItem(activeBusinessKey(userId), businessId);
      setPlan(null);
      setSeedCampaigns([]);
      await hydrateBusiness(nextBusiness, userId, profileRole);
    },
    [businesses, hydrateBusiness, profileRole, userId],
  );

  const refreshProStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("is_pro, pro_activated_at")
      .eq("id", user.id)
      .single();

    if (error) return false;
    const nextIsPro = Boolean(profileData?.is_pro);
    setIsPro(nextIsPro);
    if (profileData?.pro_activated_at) {
      setProActivatedAt(profileData.pro_activated_at as string);
    }
    return nextIsPro;
  };

  const retryBusinessRestore = useCallback(async () => {
    if (!userId) return;
    setBusinessRestorePending(true);
    setDashboardError("");
    setLoading(true);

    try {
      await supabase.auth.refreshSession().catch(() => undefined);
      const preferredBusinessId = window.localStorage.getItem(
        activeBusinessKey(userId),
      );
      const context = await loadDashboardContextWithRetry(
        userId,
        preferredBusinessId,
      );

      setBusinesses(context.businesses);
      setPlatformAccess(context.platformAccess);
      if (context.isPro) setIsPro(true);
      if (context.proActivatedAt) setProActivatedAt(context.proActivatedAt);

      if (context.business?.id) {
        draftHandlers.clearOnboardingDraft(onboardingDraftKey(userId));
        await hydrateBusiness(context.business, userId, context.profileRole);
        setBusinessRestorePending(false);
        clearPaymentReturnFromUrl();
        return;
      }

      setBusinessRestorePending(true);
      setDashboardError(
        "İşletme bilgisi yüklenemedi. Oturumunuz açık görünüyor; tekrar deneyin.",
      );
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : "İşletme bilgisi yüklenemedi.",
      );
      setBusinessRestorePending(true);
    } finally {
      setLoading(false);
    }
  }, [draftHandlers, hydrateBusiness, loadDashboardContextWithRetry, userId]);

  const shouldShowOnboarding =
    !loading && !business && !businessRestorePending;

  return {
    business,
    businesses,
    setBusiness,
    plan,
    setPlan,
    seedCampaigns,
    loading,
    dashboardError,
    businessRestorePending,
    shouldShowOnboarding,
    isPro,
    proActivatedAt,
    profileRole,
    platformAccess,
    accountEmail,
    userId,
    switchBusiness,
    refreshProStatus,
    retryBusinessRestore,
  };
}