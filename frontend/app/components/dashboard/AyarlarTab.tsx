import React, { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Business, GeneratedPlan, MiniSitePublishStatus } from "@/lib/domain-types";
import { isMiniSitePublished } from "@/lib/mini-site";

interface AyarlarTabProps {
  business: Business;
  plan: GeneratedPlan | null;
  setPlan?: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  setBusiness?: (business: Business) => void;
  accountEmail?: string;
  isPro?: boolean;
  handleUpgradeToPro?: () => Promise<void>;
  refreshProStatus?: () => Promise<boolean>;
  paymentReturn?: "success" | "cancel" | null;
  onPaymentReturnHandled?: () => void;
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
  paymentReturn = null,
  onPaymentReturnHandled,
}: AyarlarTabProps) {
  const [siteData, setSiteData] = useState(
    plan?.mini_site_data || {
      hero_slogan: "",
      about_us: "",
      cta_text: "Bize Ulaşın",
      features: ["", "", ""],
      publish_status: "published" as MiniSitePublishStatus,
      seo_title: "",
      seo_description: "",
      og_image_url: "",
      whatsapp_prefill_message: "",
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(
    business.theme_config?.primaryColor || "blue",
  );
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  const publicPath = business?.id ? `/site/${business.id}` : "";
  const publicUrl = origin && publicPath ? `${origin}${publicPath}` : publicPath;
  const isPublished = isMiniSitePublished(siteData);
  const previewPath =
    publicPath && !isPublished ? `${publicPath}?preview=1` : publicPath;

  useEffect(() => {
    if (!plan?.mini_site_data) return;
    setSiteData({
      hero_slogan: "",
      about_us: "",
      cta_text: "Bize Ulaşın",
      features: ["", "", ""],
      publish_status: "published",
      seo_title: "",
      seo_description: "",
      og_image_url: "",
      whatsapp_prefill_message: "",
      ...plan.mini_site_data,
    });
  }, [plan?.mini_site_data]);

  useEffect(() => {
    if (!paymentReturn) return;

    if (paymentReturn === "cancel") {
      setBillingMessage("Ödeme işlemi iptal edildi. Hesabınızda değişiklik yok.");
      onPaymentReturnHandled?.();
      return;
    }

    let cancelled = false;
    setBillingMessage("Ödeme tamamlandı. Pro üyeliğiniz etkinleştiriliyor...");

    const activatePro = async () => {
      if (!refreshProStatus) {
        onPaymentReturnHandled?.();
        return;
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (cancelled) return;
        const active = await refreshProStatus();
        if (active) {
          setBillingMessage("Pro üyeliğiniz aktif!");
          onPaymentReturnHandled?.();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setBillingMessage(
          "Ödeme alındı. Pro aktivasyonu biraz sürebilir; 'Üyelik Durumunu Yenile' ile kontrol edin.",
        );
        onPaymentReturnHandled?.();
      }
    };

    void activatePro();
    return () => {
      cancelled = true;
    };
  }, [paymentReturn, refreshProStatus, onPaymentReturnHandled]);

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
    themeOptions.find((theme) => theme.id === selectedTheme) ||
    themeOptions[0];

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
        const nextThemeConfig = {
          ...(business.theme_config || {}),
          primaryColor: selectedTheme,
        };
        const { error: businessError } = await supabase
          .from("businesses")
          .update({ theme_config: nextThemeConfig })
          .eq("id", business.id);

        if (businessError) throw businessError;
        setBusiness?.({ ...business, theme_config: nextThemeConfig });
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
      alert("Kaydetme hatası: " + ((error instanceof Error ? error.message : "Bilinmeyen hata") || "Bilinmeyen hata"));
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
    if (!refreshProStatus) return;
    setIsRefreshingPlan(true);
    try {
      const active = await refreshProStatus();
      setBillingMessage(
        active
          ? "Pro üyeliğiniz aktif."
          : "Pro üyelik henüz aktif görünmüyor. Birkaç saniye sonra tekrar deneyin.",
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
          </div>

          <div className="flex min-w-52 flex-col gap-2">
            {!isPro && (
              <button
                type="button"
                onClick={startCheckout}
                disabled={isStartingCheckout || !handleUpgradeToPro}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isStartingCheckout ? "Ödeme sayfası açılıyor..." : "Pro'ya Yükselt"}
              </button>
            )}
            <button
              type="button"
              onClick={checkPlanStatus}
              disabled={isRefreshingPlan || !refreshProStatus}
              className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
            >
              {isRefreshingPlan ? "Kontrol ediliyor..." : "Üyelik Durumunu Yenile"}
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
              <p className="text-xs text-gray-400 mt-3">
                Bu renk mini sitenin ana butonlarini, vurgularini ve dashboard
                pariltisini etkiler.
              </p>
            </div>

            <div
              className={`lg:w-80 rounded-2xl border ${activeTheme.border} ${activeTheme.light} p-4`}
            >
              <div className="rounded-xl bg-white p-4 shadow-sm border border-white">
                <div
                  className={`mb-4 h-2 w-20 rounded-full ${activeTheme.bg}`}
                />
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Mini Site Onizleme
                </p>
                <h3 className="mt-2 text-lg font-black text-gray-900">
                  {business?.name || "Mini Site"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {siteData.hero_slogan || "Mükemmel hizmetin yeni adresi."}
                </p>
                <button
                  type="button"
                  className={`mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white ${activeTheme.bg}`}
                >
                  {siteData.cta_text || "Bize Ulasin"}
                </button>
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
            value={siteData.hero_slogan}
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
            value={siteData.about_us}
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
            value={siteData.cta_text}
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
