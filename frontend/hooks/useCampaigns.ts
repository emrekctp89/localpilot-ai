"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateCampaigns } from "@/lib/ai-client";
import type { Business, Campaign, GeneratedPlan } from "@/lib/domain-types";

type CampaignSaveStatus = "idle" | "saved" | "error";

interface UseCampaignsOptions {
  business: Business | null;
  seedCampaigns: Campaign[];
  setPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  onError: (message: string) => void;
}

async function persistCampaigns(businessId: string, nextCampaigns: Campaign[]) {
  const { data: existingPlan } = await supabase
    .from("generated_plans")
    .select("id, mini_site_data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlan?.id) {
    const { error } = await supabase
      .from("generated_plans")
      .update({ campaigns: nextCampaigns })
      .eq("id", existingPlan.id);

    if (!error) return;

    const miniSiteData = {
      ...((existingPlan.mini_site_data as Record<string, unknown> | null) ||
        {}),
      campaigns: nextCampaigns,
    };
    const { error: fallbackError } = await supabase
      .from("generated_plans")
      .update({ mini_site_data: miniSiteData })
      .eq("id", existingPlan.id);
    if (fallbackError) throw fallbackError;
    return;
  }

  const { error } = await supabase.from("generated_plans").insert([
    {
      business_id: businessId,
      campaigns: nextCampaigns,
      mini_site_data: {},
      social_media_calendar: [],
      whatsapp_templates: [],
    },
  ]);

  if (!error) return;

  const { error: fallbackError } = await supabase.from("generated_plans").insert([
    {
      business_id: businessId,
      mini_site_data: { campaigns: nextCampaigns },
      social_media_calendar: [],
      whatsapp_templates: [],
    },
  ]);
  if (fallbackError) throw fallbackError;
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
      await persistCampaigns(business.id, nextCampaigns);
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
      await persistCampaigns(business.id, nextCampaigns);
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