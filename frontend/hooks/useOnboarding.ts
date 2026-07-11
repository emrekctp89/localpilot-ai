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
  top_products: ["", "", ""],
  target_audience: [],
  contact_points: [],
  unique_selling_point: [],
  brand_tone: "",
  color_preference: "ai",
  business_description: "",
  main_problem: "",
  price_level: "",
  current_digital_status: [],
  desired_outputs: [],
  ai_options: null,
};

/** Normalize draft / partial data after schema change (string → string[]). */
export function normalizeOnboardingData(
  partial?: Partial<OnboardingData> | Record<string, unknown> | null,
): OnboardingData {
  const raw = (partial || {}) as Record<string, unknown>;

  const asStringArray = (value: unknown, padTo = 0): string[] => {
    if (Array.isArray(value)) {
      const items = value.map((item) => String(item ?? ""));
      if (padTo > 0) {
        while (items.length < padTo) items.push("");
        return items.slice(0, Math.max(padTo, items.length));
      }
      return items;
    }
    if (typeof value === "string" && value.trim()) {
      const items = value
        .split(/,|\n/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (padTo > 0) {
        while (items.length < padTo) items.push("");
        return items.slice(0, Math.max(padTo, items.length));
      }
      return items;
    }
    return padTo > 0 ? Array.from({ length: padTo }, () => "") : [];
  };

  return {
    ...DEFAULT_ONBOARDING_DATA,
    name: typeof raw.name === "string" ? raw.name : DEFAULT_ONBOARDING_DATA.name,
    industry:
      typeof raw.industry === "string"
        ? raw.industry
        : DEFAULT_ONBOARDING_DATA.industry,
    city: typeof raw.city === "string" ? raw.city : DEFAULT_ONBOARDING_DATA.city,
    address:
      typeof raw.address === "string"
        ? raw.address
        : DEFAULT_ONBOARDING_DATA.address,
    whatsapp_number:
      typeof raw.whatsapp_number === "string"
        ? raw.whatsapp_number
        : DEFAULT_ONBOARDING_DATA.whatsapp_number,
    working_hours:
      typeof raw.working_hours === "string"
        ? raw.working_hours
        : DEFAULT_ONBOARDING_DATA.working_hours,
    business_type:
      typeof raw.business_type === "string"
        ? raw.business_type
        : DEFAULT_ONBOARDING_DATA.business_type,
    goals: asStringArray(raw.goals),
    top_products: asStringArray(raw.top_products, 3),
    target_audience: asStringArray(raw.target_audience),
    contact_points: asStringArray(raw.contact_points),
    unique_selling_point: asStringArray(raw.unique_selling_point),
    brand_tone:
      typeof raw.brand_tone === "string"
        ? raw.brand_tone
        : DEFAULT_ONBOARDING_DATA.brand_tone,
    color_preference:
      typeof raw.color_preference === "string"
        ? raw.color_preference
        : DEFAULT_ONBOARDING_DATA.color_preference,
    business_description:
      typeof raw.business_description === "string"
        ? raw.business_description
        : DEFAULT_ONBOARDING_DATA.business_description,
    main_problem:
      typeof raw.main_problem === "string"
        ? raw.main_problem
        : DEFAULT_ONBOARDING_DATA.main_problem,
    price_level:
      typeof raw.price_level === "string"
        ? raw.price_level
        : DEFAULT_ONBOARDING_DATA.price_level,
    current_digital_status: asStringArray(raw.current_digital_status),
    desired_outputs: asStringArray(raw.desired_outputs),
    ai_options:
      raw.ai_options &&
      typeof raw.ai_options === "object" &&
      !Array.isArray(raw.ai_options)
        ? {
            goals_options: asStringArray(
              (raw.ai_options as Record<string, unknown>).goals_options,
            ),
            top_products_placeholders: asStringArray(
              (raw.ai_options as Record<string, unknown>)
                .top_products_placeholders,
            ),
            target_audience_options: asStringArray(
              (raw.ai_options as Record<string, unknown>)
                .target_audience_options,
            ),
            unique_selling_point_options: asStringArray(
              (raw.ai_options as Record<string, unknown>)
                .unique_selling_point_options,
            ),
          }
        : DEFAULT_ONBOARDING_DATA.ai_options,
  };
}

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
        setOnboardingData(normalizeOnboardingData(draft.data));
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

      // ai_options sadece wizard UI için — setup API'ye gönderme
      const { ai_options: _aiOptions, ...setupFields } = onboardingData;

      const data = await setupBusiness({
        owner_id: session.user.id,
        ...setupFields,
        // API string alanları — wizard array tutar
        top_products: (onboardingData.top_products || [])
          .map((p) => p.trim())
          .filter(Boolean)
          .join(", "),
        target_audience: (onboardingData.target_audience || [])
          .map((p) => p.trim())
          .filter(Boolean)
          .join(", "),
        unique_selling_point: (onboardingData.unique_selling_point || [])
          .map((p) => p.trim())
          .filter(Boolean)
          .join(", "),
        current_digital_status: onboardingData.current_digital_status || [],
        desired_outputs: onboardingData.desired_outputs || [],
        business_description: onboardingData.business_description || "",
        main_problem: onboardingData.main_problem || "",
        price_level: onboardingData.price_level || "",
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