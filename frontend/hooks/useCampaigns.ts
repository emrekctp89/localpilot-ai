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
  const [campaignSaveStatus, setCampaignSaveStatus] =
    useState<CampaignSaveStatus>("idle");

  const handleGenerateCampaigns = async () => {
    if (!business?.id) {
      onError("Önce işletme kurulumunu tamamlayın.");
      return;
    }

    setIsGeneratingCampaigns(true);
    setCampaignSaveStatus("idle");
    try {
      const data = await generateCampaigns({
        business_name: business.name || "",
        sector: business.sector || business.industry || "",
        city: business.city || "",
        target_audience: business.target_audience || "",
      });
      const nextCampaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(nextCampaigns);
      const saved = await saveCampaigns(business.id, nextCampaigns);
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
      setCampaignSaveStatus("saved");
    } catch (error) {
      setCampaignSaveStatus("error");
      onError(
        error instanceof Error ? error.message : "Kampanya uretimi basarisiz oldu.",
      );
    } finally {
      setIsGeneratingCampaigns(false);
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
      const saved = await saveCampaigns(business.id, nextCampaigns);
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
    campaignSaveStatus,
    handleGenerateCampaigns,
    handleUpdateCampaign,
  };
}