"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setupBusiness } from "@/lib/ai-client";
import { getCampaignsFromPlan } from "@/lib/plan-utils";
import type { OnboardingData } from "@/app/components/dashboard/OnboardingWizard";
import type { Business, Campaign, GeneratedPlan } from "@/lib/domain-types";

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  name: "",
  industry: "",
  city: "",
  address: "",
  whatsapp_number: "",
  working_hours: "",
  business_type: "",
  goals: [],
  top_products: "",
  target_audience: "",
  contact_points: [],
  unique_selling_point: "",
  brand_tone: "",
  color_preference: "ai",
};

export function createOnboardingDraftHandlers(
  setOnboardingStep: (step: number) => void,
  setOnboardingData: React.Dispatch<React.SetStateAction<OnboardingData>>,
  setOnboardingStorageKey: (key: string) => void,
  setOnboardingDraftReady: (ready: boolean) => void,
) {
  return {
    restoreOnboardingDraft: (draft: {
      step?: number;
      data?: Partial<OnboardingData>;
    }) => {
      if (draft.data) {
        setOnboardingData({
          ...DEFAULT_ONBOARDING_DATA,
          ...draft.data,
        });
      }
      if (draft.step && draft.step >= 1 && draft.step <= 5) {
        setOnboardingStep(draft.step);
      }
    },
    onOnboardingDraftKey: (key: string) => {
      setOnboardingStorageKey(key);
      setOnboardingDraftReady(true);
    },
    clearOnboardingDraft: (key: string) => {
      window.localStorage.removeItem(key);
    },
  };
}

interface UseOnboardingSetupOptions {
  business: Business | null;
  onboardingData: OnboardingData;
  onboardingStorageKey: string;
  onSetupComplete: (result: {
    business: Business;
    plan: GeneratedPlan;
    campaigns: Campaign[];
  }) => void;
}

export function useOnboardingSetup({
  business,
  onboardingData,
  onboardingStorageKey,
  onSetupComplete,
}: UseOnboardingSetupOptions) {
  const router = useRouter();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState("");

  const handleCompleteOnboarding = async () => {
    setSetupError("");
    setIsSettingUp(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      const data = await setupBusiness({
        owner_id: session.user.id,
        ...onboardingData,
      });

      const nextBusiness = data.business as unknown as Business;
      const nextPlan = data.ai_decision as unknown as GeneratedPlan;

      onSetupComplete({
        business: nextBusiness,
        plan: nextPlan,
        campaigns: getCampaignsFromPlan(nextPlan),
      });

      if (onboardingStorageKey) {
        window.localStorage.removeItem(onboardingStorageKey);
      }
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Kurulum tamamlanamadi.",
      );
    } finally {
      setIsSettingUp(false);
    }
  };

  return { isSettingUp, setupError, handleCompleteOnboarding };
}

export function useOnboardingDraftPersistence(options: {
  business: Business | null;
  onboardingStep: number;
  onboardingData: OnboardingData;
  onboardingStorageKey: string;
  onboardingDraftReady: boolean;
}) {
  const {
    business,
    onboardingStep,
    onboardingData,
    onboardingStorageKey,
    onboardingDraftReady,
  } = options;

  useEffect(() => {
    if (!onboardingStorageKey || !onboardingDraftReady || business) return;

    window.localStorage.setItem(
      onboardingStorageKey,
      JSON.stringify({
        step: onboardingStep,
        data: onboardingData,
        updatedAt: new Date().toISOString(),
      }),
    );
  }, [
    business,
    onboardingData,
    onboardingDraftReady,
    onboardingStep,
    onboardingStorageKey,
  ]);
}