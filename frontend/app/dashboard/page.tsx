"use client";

import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  analyzeReviews,
  createCheckoutSession,
  type ReviewAnalysisResult,
} from "@/lib/ai-client";
import OnboardingWizard from "../components/dashboard/OnboardingWizard";
import type { OnboardingData } from "../components/dashboard/OnboardingWizard";
import TabMenu from "../components/dashboard/TabMenu";
import CrmTab from "../components/dashboard/CrmTab";
import RandevuTab from "../components/dashboard/RandevuTab";
import SiparisTab from "../components/dashboard/SiparisTab";
import GorevlerTab from "../components/dashboard/GorevlerTab";
import GoogleBusinessTab from "../components/dashboard/GoogleBusinessTab";
import KasaTab from "../components/dashboard/KasaTab";
import MenuTab from "../components/dashboard/MenuTab";
import OzetTab from "../components/dashboard/OzetTab";
import KararMerkeziTab from "../components/dashboard/KararMerkeziTab";
import SektorIsAkisiTab from "../components/dashboard/SektorIsAkisiTab";
import IcerikTab from "../components/dashboard/IcerikTab";
import AiAraclarTab from "../components/dashboard/AiAraclarTab";
import AyarlarTab from "../components/dashboard/AyarlarTab";
import { useToast } from "../components/Toast";
import { useDashboardSession } from "@/hooks/useDashboardSession";
import {
  DEFAULT_ONBOARDING_DATA,
  createOnboardingDraftHandlers,
  useOnboardingDraftPersistence,
  useOnboardingSetup,
} from "@/hooks/useOnboarding";
import { useCampaigns } from "@/hooks/useCampaigns";

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();

  const onError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );

  const [activeTab, setActiveTab] = useState("ozet");
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] =
    useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [onboardingStorageKey, setOnboardingStorageKey] = useState("");
  const [onboardingDraftReady, setOnboardingDraftReady] = useState(false);

  const [reviewsText, setReviewsText] = useState("");
  const [analysisResult, setAnalysisResult] =
    useState<ReviewAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const draftHandlers = useMemo(
    () =>
      createOnboardingDraftHandlers(
        setOnboardingStep,
        setOnboardingData,
        setOnboardingStorageKey,
        setOnboardingDraftReady,
      ),
    [],
  );

  const session = useDashboardSession(draftHandlers);

  const campaignsApi = useCampaigns({
    business: session.business,
    seedCampaigns: session.seedCampaigns,
    setPlan: session.setPlan,
    onError,
  });

  const { isSettingUp, setupError, handleCompleteOnboarding } =
    useOnboardingSetup({
      business: session.business,
      onboardingData,
      onboardingStorageKey,
      onSetupComplete: ({ business, plan, campaigns }) => {
        session.setBusiness(business);
        session.setPlan(plan);
        campaignsApi.setCampaigns(campaigns);
        setActiveTab("ozet");
      },
    });

  useOnboardingDraftPersistence({
    business: session.business,
    onboardingStep,
    onboardingData,
    onboardingStorageKey,
    onboardingDraftReady,
  });

  const canUseProTools =
    session.isPro || process.env.NODE_ENV === "development";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Şablon kopyalandı! WhatsApp'a yapıştırabilirsiniz.", "success");
  };

  const handleAnalyzeReviews = async () => {
    const reviews = reviewsText
      .split("\n")
      .map((review) => review.trim())
      .filter(Boolean);

    if (!session.business || reviews.length === 0) {
      onError("Analiz icin en az bir yorum girin.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await analyzeReviews({
        business_name: session.business.name || "",
        reviews,
      });
      setAnalysisResult(data);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Yorum analizi basarisiz oldu.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) {
        router.push("/auth");
        return;
      }

      const data = await createCheckoutSession({
        user_id: authSession.user.id,
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Odeme oturumu olusturulamadi.",
      );
    }
  };

  const themeColor = session.business?.theme_config?.primaryColor || "blue";
  const colorMap: Record<string, string> = {
    blue: "bg-blue-400",
    green: "bg-emerald-400",
    rose: "bg-rose-400",
    amber: "bg-amber-300",
    purple: "bg-violet-400",
    gray: "bg-gray-400",
    black: "bg-gray-500",
  };
  const glowColor = colorMap[themeColor] || colorMap.blue;

  if (session.loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <span className="text-6xl">✨</span>
          <h2 className="text-xl font-bold text-gray-500">
            Çalışma Alanınız Hazırlanıyor...
          </h2>
        </div>
      </div>
    );

  if (session.dashboardError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 text-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-black mb-2">Panel yüklenemedi</h2>
          <p className="text-sm text-gray-600 mb-5">{session.dashboardError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white hover:bg-gray-700 transition"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen relative bg-[#fafafa] overflow-x-hidden selection:bg-blue-200 selection:text-blue-900 text-gray-900">
      <div
        className={`fixed top-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob pointer-events-none ${glowColor}`}
      ></div>
      <div
        className={`fixed top-[20%] right-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000 pointer-events-none ${glowColor}`}
      ></div>
      <div
        className={`fixed bottom-[-10%] left-[20%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-4000 pointer-events-none ${glowColor}`}
      ></div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="glass-panel flex justify-between items-center p-5 md:px-8 rounded-[2rem] mb-8 shadow-sm border border-white/60 backdrop-blur-xl animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                LocalPilot
              </h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Yönetim Paneli
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/auth");
            }}
            className="text-sm font-bold text-gray-500 hover:text-red-600 bg-white/50 px-4 py-2 rounded-full transition hover:bg-red-50"
          >
            Çıkış Yap ➔
          </button>
        </header>

        {!session.business && !session.loading && (
          <OnboardingWizard
            step={onboardingStep}
            setStep={setOnboardingStep}
            data={onboardingData}
            setData={setOnboardingData}
            onComplete={handleCompleteOnboarding}
            isSettingUp={isSettingUp}
            setupError={setupError}
          />
        )}

        {session.business && session.business.active_modules && (
          <>
            <TabMenu
              activeModules={session.business.active_modules}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            <main className="animate-fade-in-up relative">
              {activeTab === "ozet" && (
                <OzetTab
                  business={session.business}
                  plan={session.plan}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === "icerik" && (
                <IcerikTab business={session.business} />
              )}
              {activeTab === "crm" && <CrmTab business={session.business} />}
              {activeTab === "randevu" && (
                <RandevuTab business={session.business} />
              )}
              {activeTab === "karar" && (
                <KararMerkeziTab
                  business={session.business}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === "is_akisi" && (
                <SektorIsAkisiTab business={session.business} />
              )}
              {activeTab === "siparis" && (
                <SiparisTab business={session.business} />
              )}
              {activeTab === "personel" && (
                <GorevlerTab business={session.business} />
              )}
              {activeTab === "google_business" && (
                <GoogleBusinessTab business={session.business} />
              )}
              {activeTab === "kasa" && <KasaTab business={session.business} />}
              {activeTab === "menu" && <MenuTab business={session.business} />}

              {activeTab === "araclar" && (
                <AiAraclarTab
                  campaigns={campaignsApi.campaigns}
                  isGeneratingCampaigns={campaignsApi.isGeneratingCampaigns}
                  campaignSaveStatus={campaignsApi.campaignSaveStatus}
                  handleGenerateCampaigns={campaignsApi.handleGenerateCampaigns}
                  handleUpdateCampaign={campaignsApi.handleUpdateCampaign}
                  reviewsText={reviewsText}
                  setReviewsText={setReviewsText}
                  isAnalyzing={isAnalyzing}
                  handleAnalyzeReviews={handleAnalyzeReviews}
                  analysisResult={analysisResult}
                  copyToClipboard={copyToClipboard}
                  isPro={canUseProTools}
                  handleUpgradeToPro={handleUpgradeToPro}
                />
              )}

              {activeTab === "ayarlar" && (
                <AyarlarTab
                  business={session.business}
                  plan={session.plan}
                  setPlan={session.setPlan}
                  setBusiness={session.setBusiness}
                  accountEmail={session.accountEmail}
                  isPro={session.isPro}
                  handleUpgradeToPro={handleUpgradeToPro}
                  refreshProStatus={session.refreshProStatus}
                />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}