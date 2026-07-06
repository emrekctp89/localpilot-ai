"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  analyzeReviews,
  createCheckoutSession,
  type ReviewAnalysisResult,
} from "@/lib/ai-client";
import { buildReviewDecisionCycle } from "@/lib/business-os";
import {
  listDecisionCycles,
  saveDecisionCycles,
} from "@/lib/repositories";
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
import PlatformTab from "../components/dashboard/PlatformTab";
import BusinessSwitcher from "../components/dashboard/BusinessSwitcher";
import ReadOnlyBanner from "../components/dashboard/ReadOnlyBanner";
import { useToast } from "../components/Toast";
import { useLocale } from "@/hooks/useLocale";
import { useDashboardSession } from "@/hooks/useDashboardSession";
import {
  DEFAULT_ONBOARDING_DATA,
  createOnboardingDraftHandlers,
  useOnboardingDraftPersistence,
  useOnboardingSetup,
} from "@/hooks/useOnboarding";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAiUsage } from "@/hooks/useAiUsage";
import { useProActivationChecklist } from "@/hooks/useProActivationChecklist";
import ProActivationChecklist from "../components/dashboard/ProActivationChecklist";
import {
  cacheBusinessSnapshot,
  clearPaymentReturnFromUrl,
  markEstablishedBusiness,
  onboardingDraftKey,
  readPaymentReturn,
} from "@/lib/dashboard-session-storage";

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();

  const onError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );

  const [activeTab, setActiveTab] = useState("ozet");
  const [paymentReturn, setPaymentReturn] = useState<"success" | "cancel" | null>(
    null,
  );
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] =
    useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [onboardingStorageKey, setOnboardingStorageKey] = useState("");
  const [onboardingDraftReady, setOnboardingDraftReady] = useState(false);

  const [reviewsText, setReviewsText] = useState("");
  const [analysisResult, setAnalysisResult] =
    useState<ReviewAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingReviewDecision, setIsSendingReviewDecision] = useState(false);

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
  const { t } = useLocale();

  const aiUsageApi = useAiUsage(session.isPro, Boolean(session.business));

  const campaignsApi = useCampaigns({
    business: session.business,
    seedCampaigns: session.seedCampaigns,
    setPlan: session.setPlan,
    onError,
    onAiSuccess: () => {
      void aiUsageApi.refresh();
    },
  });
  const activationChecklist = useProActivationChecklist({
    isPro: session.isPro,
    business: session.business,
    plan: session.plan,
    campaigns: campaignsApi.campaigns,
    proActivatedAt: session.proActivatedAt,
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
        if (business.id && session.userId) {
          markEstablishedBusiness(session.userId, business.id);
        }
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

  useEffect(() => {
    const payment = readPaymentReturn();
    if (!payment) return;

    setPaymentReturn(payment);
    setActiveTab("ayarlar");
  }, []);

  useEffect(() => {
    if (!paymentReturn || session.loading || !session.business) return;
    clearPaymentReturnFromUrl();
  }, [paymentReturn, session.business, session.loading]);

  const canUseAi = aiUsageApi.canUseAi;

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
        sector: session.business.sector || "",
        industry: session.business.industry || "",
        city: session.business.city || "",
      });
      setAnalysisResult(data);
      void aiUsageApi.refresh();
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Yorum analizi basarisiz oldu.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendReviewToDecisionCenter = async () => {
    if (!session.business?.id || !analysisResult?.decision_bridge) {
      onError("Önce yorum analizi çalıştırın.");
      return;
    }

    setIsSendingReviewDecision(true);
    try {
      const existingCycles = await listDecisionCycles(session.business.id);
      const recommendation = analysisResult.decision_bridge.recommendation;
      const duplicate = existingCycles.some(
        (cycle) =>
          cycle.recommendation === recommendation && cycle.status !== "olculdu",
      );
      if (duplicate) {
        showToast("Bu yorum önerisi zaten Karar Merkezi'nde.", "info");
        setActiveTab("karar");
        return;
      }

      const nextCycle = {
        ...buildReviewDecisionCycle(analysisResult.decision_bridge),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const saved = await saveDecisionCycles(session.business.id, [
        nextCycle,
        ...existingCycles,
      ]);
      if (!saved) throw new Error("Karar önerisi kaydedilemedi.");

      showToast("Yorum analizi Karar Merkezi'ne aktarıldı.", "success");
      setActiveTab("karar");
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Karar Merkezi köprüsü başarısız oldu.",
      );
    } finally {
      setIsSendingReviewDecision(false);
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

      if (session.business?.id) {
        markEstablishedBusiness(authSession.user.id, session.business.id);
        cacheBusinessSnapshot(authSession.user.id, session.business);
        window.localStorage.removeItem(onboardingDraftKey(authSession.user.id));
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

  if (session.businessRestorePending && !session.business)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 text-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-indigo-100 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-black mb-2">Paneliniz geri yükleniyor</h2>
          <p className="text-sm text-gray-600 mb-5">
            {session.restoreAfterPayment
              ? "Ödeme dönüşünden sonra işletme bilgileriniz yeniden alınıyor. Bu ekran birkaç saniye sürebilir."
              : "İşletme bilgileriniz yeniden alınıyor. Bu ekran birkaç saniye sürebilir."}
          </p>
          {session.dashboardError ? (
            <p className="text-sm text-red-600 mb-4">{session.dashboardError}</p>
          ) : null}
          <button
            onClick={() => void session.retryBusinessRestore()}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white hover:bg-gray-700 transition"
          >
            Tekrar Dene
          </button>
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
        <header className="glass-panel flex flex-col gap-4 p-5 md:px-8 rounded-[2rem] mb-8 shadow-sm border border-white/60 backdrop-blur-xl animate-fade-in-up lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                LocalPilot
              </h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {t("dashboard.title", "Yönetim Paneli")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BusinessSwitcher
              businesses={session.businesses}
              activeBusinessId={session.business?.id}
              onSwitch={session.switchBusiness}
              label={t("platform.businessSwitcher")}
            />
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth");
              }}
              className="text-sm font-bold text-gray-500 hover:text-red-600 bg-white/50 px-4 py-2 rounded-full transition hover:bg-red-50"
            >
              {t("dashboard.signOut", "Çıkış Yap")} ➔
            </button>
          </div>
        </header>

        {session.shouldShowOnboarding && (
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
              {!session.platformAccess.canWrite && (
                <ReadOnlyBanner message={t("platform.readOnly")} />
              )}

              {activationChecklist.visible && activeTab !== "ayarlar" && (
                <ProActivationChecklist
                  items={activationChecklist.items}
                  activatedAt={activationChecklist.proActivatedAt}
                  onNavigate={setActiveTab}
                  onDismiss={activationChecklist.dismiss}
                />
              )}

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
                  handleGenerateCampaignVariant={
                    campaignsApi.handleGenerateCampaignVariant
                  }
                  handleUpdateCampaign={campaignsApi.handleUpdateCampaign}
                  variantIndex={campaignsApi.variantIndex}
                  reviewsText={reviewsText}
                  setReviewsText={setReviewsText}
                  isAnalyzing={isAnalyzing}
                  handleAnalyzeReviews={handleAnalyzeReviews}
                  analysisResult={analysisResult}
                  onSendReviewToDecisionCenter={handleSendReviewToDecisionCenter}
                  isSendingReviewDecision={isSendingReviewDecision}
                  copyToClipboard={copyToClipboard}
                  canUseAi={canUseAi}
                  isProMember={session.isPro}
                  aiUsage={aiUsageApi.usage}
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
                  paymentReturn={paymentReturn}
                  onPaymentReturnHandled={() => setPaymentReturn(null)}
                  aiUsage={aiUsageApi.usage}
                  activationItems={activationChecklist.items}
                  showActivationChecklist={activationChecklist.visible}
                  proActivatedAt={session.proActivatedAt}
                  onNavigateTab={setActiveTab}
                  onDismissActivationChecklist={activationChecklist.dismiss}
                />
              )}

              {activeTab === "platform" && (
                <PlatformTab
                  business={session.business}
                  access={session.platformAccess}
                  businesses={session.businesses}
                  accountEmail={session.accountEmail}
                />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}