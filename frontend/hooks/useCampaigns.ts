"use client";

import { useEffect, useState } from "react";
import { generateCampaigns } from "@/lib/ai-client";
import type { Business, Campaign, GeneratedPlan } from "@/lib/domain-types";
import { saveCampaigns } from "@/lib/repositories/campaigns";

type CampaignSaveStatus = "idle" | "saved" | "error";

interface UseCampaignsOptions {
  business: Business | null;
  seedCampaigns: Campaign[];
  setPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  onError: (message: string) => void;
}

function buildCampaignRequest(
  business: Business,
  mode: "fresh" | "regenerate" | "variant",
  existingCampaigns: Campaign[] = [],
  variantIndex?: number,
) {
  return {
    business_name: business.name || "",
    sector: business.sector || business.industry || "",
    industry: business.industry || "",
    city: business.city || "",
    target_audience: business.target_audience || "",
    mode,
    existing_campaigns: existingCampaigns,
    variant_index: variantIndex,
  };
}

async function persistCampaignState(
  businessId: string,
  nextCampaigns: Campaign[],
  setPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>,
) {
  const saved = await saveCampaigns(businessId, nextCampaigns);
  if (!saved) throw new Error("Kampanyalar kaydedilemedi.");

  setPlan((currentPlan) =>
    currentPlan
      ? {
          ...currentPlan,
          campaigns: nextCampaigns,
          mini_site_data: {
            ...currentPlan.mini_site_data,
            campaigns: nextCampaigns,
          },
        }
      : currentPlan,
  );
}

export function useCampaigns({
  business,
  seedCampaigns,
  setPlan,
  onError,
}: UseCampaignsOptions) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    setCampaigns(seedCampaigns);
  }, [seedCampaigns]);

  const [isGeneratingCampaigns, setIsGeneratingCampaigns] = useState(false);
  const [variantIndex, setVariantIndex] = useState<number | null>(null);
  const [campaignSaveStatus, setCampaignSaveStatus] =
    useState<CampaignSaveStatus>("idle");

  const handleGenerateCampaigns = async () => {
    if (!business?.id) {
      onError("Önce işletme kurulumunu tamamlayın.");
      return;
    }

    setIsGeneratingCampaigns(true);
    setVariantIndex(null);
    setCampaignSaveStatus("idle");
    try {
      const mode = campaigns.length > 0 ? "regenerate" : "fresh";
      const data = await generateCampaigns(
        buildCampaignRequest(business, mode, campaigns),
      );
      const nextCampaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(nextCampaigns);
      await persistCampaignState(business.id, nextCampaigns, setPlan);
      setCampaignSaveStatus("saved");
    } catch (error) {
      setCampaignSaveStatus("error");
      onError(
        error instanceof Error ? error.message : "Kampanya üretimi başarısız oldu.",
      );
    } finally {
      setIsGeneratingCampaigns(false);
    }
  };

  const handleGenerateCampaignVariant = async (campaignIndex: number) => {
    if (!business?.id) {
      onError("Önce işletme kurulumunu tamamlayın.");
      return;
    }

    setIsGeneratingCampaigns(true);
    setVariantIndex(campaignIndex);
    setCampaignSaveStatus("idle");
    try {
      const data = await generateCampaigns(
        buildCampaignRequest(business, "variant", campaigns, campaignIndex),
      );
      const variant = data.campaigns?.[0];
      if (!variant) throw new Error("Kampanya varyantı üretilemedi.");

      const nextCampaigns = campaigns.map((campaign, index) =>
        index === campaignIndex ? variant : campaign,
      );
      setCampaigns(nextCampaigns);
      await persistCampaignState(business.id, nextCampaigns, setPlan);
      setCampaignSaveStatus("saved");
    } catch (error) {
      setCampaignSaveStatus("error");
      onError(
        error instanceof Error
          ? error.message
          : "Kampanya varyantı üretilemedi.",
      );
    } finally {
      setIsGeneratingCampaigns(false);
      setVariantIndex(null);
    }
  };

  const handleUpdateCampaign = async (
    campaignIndex: number,
    updatedCampaign: Campaign,
  ) => {
    if (!business?.id) {
      onError("Önce işletme kurulumunu tamamlayın.");
      return;
    }

    const nextCampaigns = campaigns.map((campaign, index) =>
      index === campaignIndex ? updatedCampaign : campaign,
    );
    const previousCampaigns = campaigns;

    setCampaigns(nextCampaigns);
    setCampaignSaveStatus("idle");
    try {
      await persistCampaignState(business.id, nextCampaigns, setPlan);
      setCampaignSaveStatus("saved");
    } catch (error) {
      setCampaigns(previousCampaigns);
      setCampaignSaveStatus("error");
      onError(
        error instanceof Error ? error.message : "Kampanya kaydedilemedi.",
      );
    }
  };

  return {
    campaigns,
    setCampaigns,
    isGeneratingCampaigns,
    variantIndex,
    campaignSaveStatus,
    handleGenerateCampaigns,
    handleGenerateCampaignVariant,
    handleUpdateCampaign,
  };
}