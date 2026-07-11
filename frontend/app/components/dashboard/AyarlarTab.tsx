import React, { useEffect, useState } from "react";

import { confirmProCheckout } from "@/lib/ai-client";
import { ensureSupabaseSession } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";
import type {
  Business,
  GeneratedPlan,
  MiniSiteData,
  MiniSitePublishStatus,
} from "@/lib/domain-types";
import { isMiniSitePublished } from "@/lib/mini-site";
import {
  customDomainStatusLabel,
  getCustomDomainDnsInstructions,
  getMiniSitePublicPath,
  getMiniSitePublicUrl,
  resolveCustomDomainSaveState,
  resolveCustomDomainStatus,
  suggestSiteSlugFromName,
  validateCustomDomainInput,
  validateSiteSlugInput,
} from "@/lib/mini-site-domain";
import { PRO_FEATURES, type AiUsageSnapshot } from "@/lib/pro-funnel";
import {
  getProPricing,
  readBillingInterval,
  writeBillingInterval,
  type BillingInterval,
} from "@/lib/pro-pricing";
import BillingIntervalToggle from "../marketing/BillingIntervalToggle";
import { fetchReferredUserAttribution } from "@/lib/repositories/partner-program";
import type { ReferralAttribution } from "@/lib/partner-program";
import ProActivationChecklist from "./ProActivationChecklist";
import ProUpgradeBanner from "./ProUpgradeBanner";
import type { ActivationChecklistItem } from "@/lib/pro-funnel";

const EMPTY_SITE_FORM_DATA: Required<
  Pick<
    MiniSiteData,
    | "hero_slogan"
    | "about_us"
    | "cta_text"
    | "features"
    | "publish_status"
    | "seo_title"
    | "seo_description"
    | "og_image_url"
    | "whatsapp_prefill_message"
  >
> = {
  hero_slogan: "",
  about_us: "",
  cta_text: "Bize Ulaşın",
  features: ["", "", ""],
  publish_status: "published",
  seo_title: "",
  seo_description: "",
  og_image_url: "",
  whatsapp_prefill_message: "",
};

function normalizeSiteFormData(
  data?: Partial<MiniSiteData> | null,
): typeof EMPTY_SITE_FORM_DATA {
  const features = [...(data?.features ?? [])];
  while (features.length < 3) {
    features.push("");
  }

  return {
    ...EMPTY_SITE_FORM_DATA,
    ...data,
    hero_slogan: data?.hero_slogan ?? "",
    about_us: data?.about_us ?? "",
    cta_text: data?.cta_text ?? "Bize Ulaşın",
    features: features.slice(0, 3).map((feature) => feature ?? ""),
    publish_status: data?.publish_status ?? "published",
    seo_title: data?.seo_title ?? "",
    seo_description: data?.seo_description ?? "",
    og_image_url: data?.og_image_url ?? "",
    whatsapp_prefill_message: data?.whatsapp_prefill_message ?? "",
  };
}

interface AyarlarTabProps {
  business: Business;
  plan: GeneratedPlan | null;
  setPlan?: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  setBusiness?: (business: Business) => void;
  accountEmail?: string;
  isPro?: boolean;
  handleUpgradeToPro?: () => Promise<void>;
  refreshProStatus?: () => Promise<boolean>;
  onProActivated?: () => void;
  checkoutSessionId?: string | null;
  billingMessage?: string;
  onBillingMessageChange?: (message: string) => void;
  isActivatingPro?: boolean;
  aiUsage?: AiUsageSnapshot | null;
  activationItems?: ActivationChecklistItem[];
  showActivationChecklist?: boolean;
  proActivatedAt?: string | null;
  onNavigateTab?: (tab: string) => void;
  onDismissActivationChecklist?: () => void;
  userId?: string;
}

export default function AyarlarTab({
  business,
  plan,
  setPlan,
  setBusiness,
  accountEmail = "",
  isPro = false,
  handleUpgradeToPro,
  refreshProStatus,
  onProActivated,
  checkoutSessionId = null,
  billingMessage: billingMessageProp = "",
  onBillingMessageChange,
  isActivatingPro = false,
  aiUsage = null,
  activationItems = [],
  showActivationChecklist = false,
  proActivatedAt = null,
  onNavigateTab,
  onDismissActivationChecklist,
  userId = "",
}: AyarlarTabProps) {
  const [siteData, setSiteData] = useState(() =>
    normalizeSiteFormData(plan?.mini_site_data),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [localBillingMessage, setLocalBillingMessage] = useState("");
  const billingMessage = billingMessageProp || localBillingMessage;
  const setBillingMessage = onBillingMessageChange ?? setLocalBillingMessage;
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  useEffect(() => {
    setBillingInterval(readBillingInterval());
  }, []);

  const handleBillingIntervalChange = (interval: BillingInterval) => {
    setBillingInterval(interval);
    writeBillingInterval(interval);
  };

  const selectedProPricing = getProPricing(billingInterval);
  const [referralAttribution, setReferralAttribution] =
    useState<ReferralAttribution | null>(null);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const attribution = await fetchReferredUserAttribution(userId);
      if (!cancelled) setReferralAttribution(attribution);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const [selectedTheme, setSelectedTheme] = useState(
    business.theme_config?.primaryColor || "blue",
  );
  const [siteSlugInput, setSiteSlugInput] = useState(
    business.site_slug?.trim() ||
      suggestSiteSlugFromName(business.name) ||
      "",
  );
  const [slugTouched, setSlugTouched] = useState(
    Boolean(business.site_slug?.trim()),
  );
  const [customDomainInput, setCustomDomainInput] = useState(
    business.custom_domain?.trim() || "",
  );
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerifyMessage, setDomainVerifyMessage] = useState("");
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  useEffect(() => {
    const savedSlug = business.site_slug?.trim() || "";
    if (savedSlug) {
      setSiteSlugInput(savedSlug);
      setSlugTouched(true);
    } else if (!slugTouched) {
      setSiteSlugInput(suggestSiteSlugFromName(business.name) || "");
    }
    setCustomDomainInput(business.custom_domain?.trim() || "");
  }, [
    business.site_slug,
    business.custom_domain,
    business.name,
    business.id,
    slugTouched,
  ]);

  const slugPreview = validateSiteSlugInput(siteSlugInput);
  const domainPreview = validateCustomDomainInput(customDomainInput);
  const domainStatus = resolveCustomDomainStatus(
    business.custom_domain_status,
  );
  const publicPath = getMiniSitePublicPath({
    id: business?.id,
    site_slug: slugPreview.slug || business?.site_slug || null,
  });
  const publicUrl =
    domainStatus === "active" && business.custom_domain
      ? getMiniSitePublicUrl(business)
      : origin && publicPath
        ? `${origin}${publicPath}`
        : getMiniSitePublicUrl({
            id: business?.id,
            site_slug: slugPreview.slug || business?.site_slug || null,
            custom_domain: business?.custom_domain,
            custom_domain_status: business?.custom_domain_status,
          });
  const isPublished = isMiniSitePublished(siteData);
  const previewPath =
    publicPath && !isPublished ? `${publicPath}?preview=1` : publicPath;
  const dnsInstructions =
    domainPreview.ok && domainPreview.domain
      ? getCustomDomainDnsInstructions(domainPreview.domain)
      : business.custom_domain
        ? getCustomDomainDnsInstructions(business.custom_domain)
        : null;

  useEffect(() => {
    if (!plan?.mini_site_data) return;
    setSiteData(normalizeSiteFormData(plan.mini_site_data));
  }, [plan?.mini_site_data]);

  const inputClass =
    "w-full border border-gray-300 rounded-md p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-800 outline-none transition";

  const themeOptions = [
    {
      id: "blue",
      label: "Mavi",
      bg: "bg-blue-600",
      light: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    {
      id: "green",
      label: "Yesil",
      bg: "bg-emerald-600",
      light: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    {
      id: "rose",
      label: "Rose",
      bg: "bg-rose-600",
      light: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
    },
    {
      id: "amber",
      label: "Amber",
      bg: "bg-amber-500",
      light: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
    },
    {
      id: "purple",
      label: "Mor",
      bg: "bg-violet-600",
      light: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
    },
    {
      id: "gray",
      label: "Gri",
      bg: "bg-gray-800",
      light: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-800",
    },
  ];
  const activeTheme =
    themeOptions.find((theme) => theme.id === selectedTheme) || themeOptions[0];

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(siteData.features || ["", "", ""])];
    newFeatures[index] = value;
    setSiteData({ ...siteData, features: newFeatures });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    try {
      const cleanSiteData = JSON.parse(JSON.stringify(siteData));
      const targetId = business?.id || "preview";

      const { data: existingPlan } = await supabase
        .from("generated_plans")
        .select("id")
        .eq("business_id", targetId)
        .maybeSingle();

      let resultError = null;

      if (existingPlan) {
        const { error } = await supabase
          .from("generated_plans")
          .update({ mini_site_data: cleanSiteData })
          .eq("id", existingPlan.id);

        resultError = error;
      } else {
        const { error } = await supabase.from("generated_plans").insert([
          {
            business_id: targetId,
            mini_site_data: cleanSiteData,
            social_media_calendar: [],
            whatsapp_templates: [],
          },
        ]);

        resultError = error;
      }

      if (resultError) throw resultError;

      if (business.id) {
        const slugCheck = validateSiteSlugInput(siteSlugInput);
        if (!slugCheck.ok) {
          throw new Error(slugCheck.error || "Geçersiz site adresi.");
        }

        const domainSave = resolveCustomDomainSaveState({
          rawInput: customDomainInput,
          currentDomain: business.custom_domain,
          currentStatus: business.custom_domain_status,
        });
        if (!domainSave.ok) {
          throw new Error(domainSave.error || "Geçersiz özel domain.");
        }

        const nextThemeConfig = {
          ...(business.theme_config || {}),
          primaryColor: selectedTheme,
        };
        const nextSlug = slugCheck.slug || null;
        const { error: businessError } = await supabase
          .from("businesses")
          .update({
            theme_config: nextThemeConfig,
            site_slug: nextSlug,
            custom_domain: domainSave.custom_domain,
            custom_domain_status: domainSave.custom_domain_status,
            custom_domain_error: domainSave.custom_domain_error,
          })
          .eq("id", business.id);

        if (businessError) {
          const code = (businessError as { code?: string }).code;
          if (code === "23505") {
            const msg = String(
              (businessError as { message?: string }).message || "",
            ).toLowerCase();
            if (msg.includes("custom_domain")) {
              throw new Error(
                "Bu alan adı başka bir işletmede kullanılıyor. Farklı bir domain deneyin.",
              );
            }
            throw new Error(
              "Bu site adresi veya domain başka bir işletmede kullanılıyor.",
            );
          }
          throw businessError;
        }
        setSiteSlugInput(nextSlug || "");
        setCustomDomainInput(domainSave.custom_domain || "");
        setBusiness?.({
          ...business,
          theme_config: nextThemeConfig,
          site_slug: nextSlug,
          custom_domain: domainSave.custom_domain,
          custom_domain_status: domainSave.custom_domain_status,
          custom_domain_error: domainSave.custom_domain_error,
        });
      }

      if (setPlan) {
        setPlan({ ...plan, mini_site_data: cleanSiteData });
      }

      setSaveMessage(
        "Değişiklikler başarıyla kaydedildi! Siteniz güncellendi. 🎉",
      );

      setTimeout(() => setSaveMessage(""), 4000);
    } catch (error) {
      console.error("Save Error:", error);
      alert(
        "Kaydetme hatası: " +
          ((error instanceof Error ? error.message : "Bilinmeyen hata") ||
            "Bilinmeyen hata"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = publicUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyMessage("Link kopyalandi");
    } catch {
      setCopyMessage("Kopyalanamadi. Linki elle secebilirsiniz.");
    }
    setTimeout(() => setCopyMessage(""), 2500);
  };

  const handleVerifyCustomDomain = async () => {
    if (!business?.id) return;
    setIsVerifyingDomain(true);
    setDomainVerifyMessage("");
    try {
      const session = await ensureSupabaseSession();
      if (!session?.access_token) {
        setDomainVerifyMessage("Oturum bulunamadı. Yeniden giriş yapın.");
        return;
      }
      const res = await fetch("/api/custom-domain/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: business.id }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        status?: string;
        domain?: string;
        business?: {
          custom_domain?: string | null;
          custom_domain_status?: string | null;
          custom_domain_error?: string | null;
        };
      };

      if (payload.business) {
        setBusiness?.({
          ...business,
          custom_domain:
            payload.business.custom_domain ?? business.custom_domain,
          custom_domain_status:
            payload.business.custom_domain_status ??
            business.custom_domain_status,
          custom_domain_error:
            payload.business.custom_domain_error ?? null,
        });
        if (payload.business.custom_domain) {
          setCustomDomainInput(payload.business.custom_domain);
        }
      }

      if (payload.ok) {
        setDomainVerifyMessage(
          `Domain doğrulandı: ${payload.domain || customDomainInput}. Artık bu host mini sitenizi açar.`,
        );
      } else {
        setDomainVerifyMessage(
          payload.error || "Domain doğrulanamadı. DNS kaydını kontrol edin.",
        );
      }
    } catch (error) {
      setDomainVerifyMessage(
        error instanceof Error
          ? error.message
          : "Domain doğrulama isteği başarısız.",
      );
    } finally {
      setIsVerifyingDomain(false);
      setTimeout(() => setDomainVerifyMessage(""), 8000);
    }
  };

  const handleOpenPublicSite = () => {
    if (!previewPath) return;
    window.open(previewPath, "_blank", "noopener,noreferrer");
  };

  const handlePublishStatusChange = (status: MiniSitePublishStatus) => {
    setSiteData({ ...siteData, publish_status: status });
  };

  const startCheckout = async () => {
    if (!handleUpgradeToPro) return;
    setBillingMessage("");
    setIsStartingCheckout(true);
    try {
      await handleUpgradeToPro();
    } catch {
      setBillingMessage("Ödeme sayfası açılamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const checkPlanStatus = async () => {
    setIsRefreshingPlan(true);
    try {
      let active = false;
      try {
        const confirmed = await confirmProCheckout({
          session_id: checkoutSessionId,
        });
        active = Boolean(confirmed.is_pro);
      } catch {
        // Son ödeme bulunamadıysa profilden oku.
      }
      if (!active && refreshProStatus) {
        active = await refreshProStatus();
      }
      if (active) onProActivated?.();
      setBillingMessage(
        active
          ? "Pro üyeliğiniz aktif."
          : "Pro üyelik henüz aktif görünmüyor. Ödeme tamamlandıysa birkaç saniye sonra tekrar deneyin.",
      );
    } finally {
      setIsRefreshingPlan(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border-t-4 border-gray-800 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            ⚙️ Vitrin Ayarları
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Yapay zekanın sizin için hazırladığı vitrin içeriklerini buradan
            manuel olarak düzenleyebilirsiniz.
          </p>
        </div>
      </div>

      {showActivationChecklist && activationItems.length > 0 && (
        <ProActivationChecklist
          items={activationItems}
          activatedAt={proActivatedAt}
          onNavigate={onNavigateTab}
          onDismiss={onDismissActivationChecklist}
        />
      )}

      {!isPro && (
        <div className="mb-6">
          <ProUpgradeBanner usage={aiUsage} onUpgrade={startCheckout} compact />
        </div>
      )}

      <section className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
              Hesap ve Üyelik
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-black text-gray-900">
                {isPro ? "LocalPilot Pro" : "Ücretsiz Plan"}
              </h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  isPro
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-gray-600"
                }`}
              >
                {isPro ? "Aktif" : "Standart"}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {accountEmail || "Oturum e-postası bulunamadı"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isPro
                ? "Premium AI modelleri ve gelişmiş işletme araçları hesabınızda açık."
                : "Pro plan ile premium AI modelleri ve gelişmiş analiz araçlarını açın."}
            </p>
            {referralAttribution ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Referans kodu{" "}
                <strong>{referralAttribution.referral_code}</strong> ile kayıt
                oldunuz.
              </p>
            ) : null}
            {!isPro && (
              <div className="mt-4 space-y-2">
                <BillingIntervalToggle
                  value={billingInterval}
                  onChange={handleBillingIntervalChange}
                />
                <p className="text-sm font-bold text-gray-700">
                  {selectedProPricing.priceLabel}
                  <span className="font-medium text-gray-500">
                    {" "}
                    {selectedProPricing.priceNote}
                  </span>
                  {selectedProPricing.monthlyEquivalentLabel ? (
                    <span className="ml-2 text-xs font-bold text-emerald-600">
                      ({selectedProPricing.monthlyEquivalentLabel})
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500">
                  Liste fiyatı geçerlidir. Partner komisyonu ödeme sonrası
                  hesaplanır.
                </p>
              </div>
            )}
          </div>

          <div className="flex min-w-52 flex-col gap-2">
            {!isPro && (
              <button
                type="button"
                onClick={startCheckout}
                disabled={isStartingCheckout || !handleUpgradeToPro}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isStartingCheckout
                  ? "Ödeme sayfası açılıyor..."
                  : "Pro'ya Yükselt"}
              </button>
            )}
            <button
              type="button"
              onClick={checkPlanStatus}
              disabled={
                isRefreshingPlan || isActivatingPro || !refreshProStatus
              }
              className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
            >
              {isRefreshingPlan
                ? "Kontrol ediliyor..."
                : "Üyelik Durumunu Yenile"}
            </button>
          </div>
        </div>

        {billingMessage && (
          <p
            className="border-t border-indigo-100 bg-white px-5 py-3 text-sm font-medium text-indigo-700"
            role="status"
          >
            {billingMessage}
          </p>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">
          Plan Karşılaştırması
        </p>
        <h3 className="mt-1 text-lg font-black text-gray-900">
          Pro ile açılan özellikler
        </h3>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {PRO_FEATURES.map((feature) => (
            <li
              key={feature.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <p className="font-bold text-gray-900">{feature.title}</p>
              <p className="mt-1 text-sm text-gray-600">
                {feature.description}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                {isPro
                  ? "Pro: Sınırsız"
                  : feature.freeAccess === "limited"
                    ? "Ücretsiz: Günlük/aylık kota"
                    : "Ücretsiz: Tam erişim"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isPublished ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                {isPublished ? "Yayında" : "Taslak"}
              </span>
            </div>
            <h3 className="text-lg font-black text-gray-900">
              {business?.name || "Mini Site"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isPublished
                ? "Mini siteniz herkese açık. Linki paylaşabilir veya önizleyebilirsiniz."
                : "Site taslak modda. Ziyaretçiler göremez; önizleme için kaydedip önizleme butonunu kullanın."}
            </p>
            {(() => {
              const readiness = [
                {
                  ok: Boolean(siteData.hero_slogan?.trim()),
                  label: "Slogan",
                },
                {
                  ok: Boolean(siteData.about_us?.trim()),
                  label: "Hakkımızda",
                },
                {
                  ok: (siteData.features || []).some((f) => f?.trim()),
                  label: "Özellikler",
                },
                {
                  ok: Boolean(business?.whatsapp_number?.trim()),
                  label: "WhatsApp no",
                },
                {
                  ok: Boolean(
                    (siteSlugInput.trim() && slugPreview.ok) ||
                      business?.site_slug?.trim(),
                  ),
                  label: "Kısa link",
                },
                {
                  ok: Boolean(siteData.cta_text?.trim()),
                  label: "CTA metni",
                },
              ];
              const readyCount = readiness.filter((item) => item.ok).length;
              return (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-white/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                      Vitrin hazırlığı
                    </p>
                    <p className="text-xs font-bold text-gray-600">
                      {readyCount}/{readiness.length}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.round(
                          (readyCount / readiness.length) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {readiness.map((item) => (
                      <li
                        key={item.label}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                          item.ok
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {item.ok ? "✓" : "○"} {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePublishStatusChange("published")}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  isPublished
                    ? "bg-emerald-600 text-white"
                    : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Yayına Al
              </button>
              <button
                type="button"
                onClick={() => handlePublishStatusChange("draft")}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  !isPublished
                    ? "bg-amber-500 text-white"
                    : "border border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                }`}
              >
                Taslağa Al
              </button>
            </div>
            {publicUrl && (
              <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 border border-emerald-100">
                {publicUrl}
              </p>
            )}
            <div className="mt-4 max-w-xl">
              <label
                htmlFor="site-slug"
                className="block text-sm font-bold text-gray-700"
              >
                Kısa site adresi (slug)
              </label>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm text-gray-500 shrink-0">/site/</span>
                <input
                  id="site-slug"
                  type="text"
                  value={siteSlugInput}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSiteSlugInput(e.target.value);
                  }}
                  placeholder="ornek-kuafor"
                  className="w-full border border-emerald-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const suggested = suggestSiteSlugFromName(business.name);
                    if (!suggested) return;
                    setSlugTouched(true);
                    setSiteSlugInput(suggested);
                  }}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  İsimden öner
                </button>
                {!business.site_slug && siteSlugInput ? (
                  <span className="text-xs font-medium text-emerald-700">
                    Kaydettiğinizde kısa link aktif olur
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Boş bırakılırsa UUID linki kullanılır. Kaydettikten sonra hem
                slug hem UUID çalışır.
              </p>
              {siteSlugInput.trim() && !slugPreview.ok ? (
                <p className="mt-1.5 text-xs font-medium text-rose-600">
                  {slugPreview.error}
                </p>
              ) : null}
            </div>

            <div className="mt-5 max-w-xl rounded-xl border border-indigo-100 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="custom-domain"
                  className="text-sm font-bold text-gray-700"
                >
                  Özel domain (white-label)
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    domainStatus === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : domainStatus === "pending_dns"
                        ? "bg-amber-100 text-amber-800"
                        : domainStatus === "error"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {customDomainStatusLabel(domainStatus)}
                </span>
              </div>
              <input
                id="custom-domain"
                type="text"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                placeholder="www.ornek.com"
                className="mt-2 w-full border border-indigo-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Kendi alan adınızı bağlayın. Kaydedince durum &quot;DNS
                bekleniyor&quot; olur; ardından DNS kaydını ekleyip doğrulayın.
              </p>
              {customDomainInput.trim() && !domainPreview.ok ? (
                <p className="mt-1.5 text-xs font-medium text-rose-600">
                  {domainPreview.error}
                </p>
              ) : null}
              {business.custom_domain_error ? (
                <p className="mt-1.5 text-xs font-medium text-rose-600">
                  {business.custom_domain_error}
                </p>
              ) : null}
              {dnsInstructions &&
              (customDomainInput.trim() || business.custom_domain) ? (
                <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-3 text-sm text-indigo-950">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
                    DNS kaydı
                  </p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="font-semibold text-indigo-800">Tip</dt>
                    <dd className="font-mono">{dnsInstructions.type}</dd>
                    <dt className="font-semibold text-indigo-800">Host</dt>
                    <dd className="font-mono">{dnsInstructions.host}</dd>
                    <dt className="font-semibold text-indigo-800">Hedef</dt>
                    <dd className="break-all font-mono">
                      {dnsInstructions.target}
                    </dd>
                  </dl>
                  <p className="mt-2 text-xs text-indigo-800/90">
                    {dnsInstructions.note}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleVerifyCustomDomain()}
                    disabled={
                      isVerifyingDomain ||
                      !business?.id ||
                      !(
                        business.custom_domain ||
                        domainPreview.domain
                      ) ||
                      domainStatus === "none"
                    }
                    className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {isVerifyingDomain
                      ? "Doğrulanıyor..."
                      : domainStatus === "active"
                        ? "Yeniden doğrula"
                        : "DNS’i doğrula"}
                  </button>
                  {domainVerifyMessage ? (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        domainStatus === "active" &&
                        domainVerifyMessage.includes("doğrulandı")
                          ? "text-emerald-700"
                          : "text-indigo-900"
                      }`}
                    >
                      {domainVerifyMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:min-w-72">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              disabled={!business?.id}
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-800 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition"
            >
              Linki Kopyala
            </button>
            <button
              type="button"
              onClick={handleOpenPublicSite}
              disabled={!business?.id}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-gray-400 transition"
            >
              {isPublished ? "Siteyi Önizle" : "Taslağı Önizle"}
            </button>
          </div>
        </div>

        {copyMessage && (
          <p className="mt-3 text-sm font-bold text-emerald-700">
            {copyMessage}
          </p>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-stretch">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Mini Site Tema Rengi
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {themeOptions.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        isSelected
                          ? `${theme.border} ${theme.light} ${theme.text} ring-2 ring-offset-1 ring-gray-900/10`
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full ${theme.bg}`}
                        aria-hidden="true"
                      />
                      {theme.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Bu renk mini sitenin ana butonlarını, vurgularını ve dashboard
                parıltısını etkiler.
              </p>
            </div>

            <div
              className={`lg:w-80 rounded-2xl border ${activeTheme.border} ${activeTheme.light} p-4`}
            >
              <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div
                    className={`h-2 w-16 rounded-full ${activeTheme.bg}`}
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      isPublished
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isPublished ? "Yayında" : "Taslak"}
                  </span>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Mini site önizleme
                </p>
                <h3 className="mt-2 text-lg font-black text-gray-900">
                  {business?.name || "Mini Site"}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {siteData.hero_slogan || "Mükemmel hizmetin yeni adresi."}
                </p>
                {(siteData.features || []).filter((f) => f?.trim()).length >
                0 ? (
                  <ul className="mt-3 space-y-1">
                    {(siteData.features || [])
                      .filter((f) => f?.trim())
                      .slice(0, 2)
                      .map((feature) => (
                        <li
                          key={feature}
                          className="truncate text-xs font-semibold text-gray-600"
                        >
                          ✓ {feature}
                        </li>
                      ))}
                  </ul>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${activeTheme.bg}`}
                  >
                    {siteData.cta_text || "Bize Ulaşın"}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPublicSite}
                    disabled={!business?.id}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Canlı aç
                  </button>
                </div>
                {publicPath ? (
                  <p className="mt-3 truncate font-mono text-[11px] text-gray-400">
                    {publicPath}
                    {!isPublished ? "?preview=1" : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Vurucu Sloganınız
          </label>

          <input
            type="text"
            className={inputClass}
            value={siteData.hero_slogan || ""}
            onChange={(e) =>
              setSiteData({
                ...siteData,
                hero_slogan: e.target.value,
              })
            }
            placeholder="Örn: Şehrin En Lezzetli Durağı"
          />

          <p className="text-xs text-gray-400 mt-1">
            Sitenizin en tepesinde, büyük harflerle yazan karşılama cümlesi.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Hakkımızda Yazısı
          </label>

          <textarea
            rows={4}
            className={`${inputClass} resize-none leading-relaxed`}
            value={siteData.about_us || ""}
            onChange={(e) =>
              setSiteData({
                ...siteData,
                about_us: e.target.value,
              })
            }
            placeholder="İşletmenizi anlatan kısa bir yazı girin..."
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Neden Sizi Seçmeliler? (3 Özellik)
          </label>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xl">✅</span>

                <input
                  type="text"
                  placeholder={`${index + 1}. Özellik (Örn: Hızlı Teslimat)`}
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-800 outline-none transition"
                  value={siteData.features?.[index] || ""}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            SEO ve Paylaşım
          </label>
          <div className="space-y-4">
            <input
              type="text"
              className={inputClass}
              value={siteData.seo_title || ""}
              onChange={(event) =>
                setSiteData({ ...siteData, seo_title: event.target.value })
              }
              placeholder="SEO başlığı (boşsa işletme adı kullanılır)"
            />
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={siteData.seo_description || ""}
              onChange={(event) =>
                setSiteData({
                  ...siteData,
                  seo_description: event.target.value,
                })
              }
              placeholder="Arama sonuçları ve paylaşım kartları için kısa açıklama"
            />
            <input
              type="url"
              className={inputClass}
              value={siteData.og_image_url || ""}
              onChange={(event) =>
                setSiteData({ ...siteData, og_image_url: event.target.value })
              }
              placeholder="OG görsel URL (opsiyonel)"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Meta, Open Graph ve Twitter kartları bu alanlardan üretilir.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            WhatsApp Tıkla-Yaz Mesajı
          </label>
          <textarea
            rows={2}
            className={`${inputClass} resize-none`}
            value={siteData.whatsapp_prefill_message || ""}
            onChange={(event) =>
              setSiteData({
                ...siteData,
                whatsapp_prefill_message: event.target.value,
              })
            }
            placeholder="Örn: Merhaba, fiyat ve randevu bilgisi almak istiyorum."
          />
          <p className="text-xs text-gray-400 mt-1">
            Mini sitedeki WhatsApp butonu bu metinle derin link açar.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Aksiyon Butonu Yazısı (CTA)
          </label>

          <input
            type="text"
            className={`${inputClass} md:w-1/3`}
            value={siteData.cta_text || ""}
            onChange={(e) =>
              setSiteData({
                ...siteData,
                cta_text: e.target.value,
              })
            }
            placeholder="Örn: Bize Ulaşın, Randevu Al"
          />
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-gray-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition shadow-md"
          >
            {isSaving ? "Kaydediliyor..." : "💾 Değişiklikleri Kaydet"}
          </button>

          {saveMessage && (
            <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full animate-fade-in-up">
              {saveMessage}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
