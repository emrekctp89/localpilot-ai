import React, { useMemo, useState } from "react";
import { buildDraftOnboardingRate } from "@/lib/activation-metrics";
import { resolveSectorPackFromIndustry } from "@/lib/sector-packs";
import {
  generateOnboardingOptions,
  magicFill,
  type OnboardingOptionsResult,
} from "@/lib/ai-client";
import {
  OTHER_INDUSTRY_VALUE,
  SECTOR_CATEGORIES,
  matchIndustryToCatalog,
} from "@/lib/onboarding-sectors";

export interface OnboardingData {
  name: string;
  industry: string;
  city: string;
  address: string;
  whatsapp_number: string;
  working_hours: string;
  business_type: string;
  goals: string[];
  top_products: string[];
  target_audience: string[];
  contact_points: string[];
  unique_selling_point: string[];
  brand_tone: string;
  color_preference: string;
  business_description: string;
  main_problem: string;
  price_level: string;
  current_digital_status: string[];
  desired_outputs: string[];
  ai_options: OnboardingOptionsResult | null;
}

interface OnboardingWizardProps {
  step: number;
  setStep: (step: number) => void;
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  onComplete: () => void;
  isSettingUp: boolean;
  setupError?: string;
}

function FieldError({
  field,
  errors,
  visible,
}: {
  field: string;
  errors: Record<string, string>;
  visible: boolean;
}) {
  if (!visible || !errors[field]) return null;

  return (
    <p className="mt-2 text-sm font-medium text-red-600" role="alert">
      {errors[field]}
    </p>
  );
}

export default function OnboardingWizard({
  step,
  setStep,
  data,
  setData,
  onComplete,
  isSettingUp,
  setupError,
}: OnboardingWizardProps) {
  const [attemptedSteps, setAttemptedSteps] = useState<number[]>([]);
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [magicUrl, setMagicUrl] = useState("");
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  const [magicStatus, setMagicStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [magicMessage, setMagicMessage] = useState("");

  const handleMagicFill = async () => {
    if (!magicUrl.trim()) return;
    setIsMagicFilling(true);
    setMagicStatus("idle");
    setMagicMessage("");
    try {
      const res = await magicFill({ url: magicUrl.trim() });
      const products =
        res.top_products && res.top_products.length > 0
          ? [
              res.top_products[0] || "",
              res.top_products[1] || "",
              res.top_products[2] || "",
            ]
          : data.top_products;

      const industryMatch = matchIndustryToCatalog(res.industry);
      const nextIndustry = industryMatch.value || data.industry;
      const filledCount = [
        res.name,
        res.city,
        res.address,
        res.whatsapp_number,
        res.business_description,
        ...(res.top_products || []),
      ].filter((v) => Boolean(String(v || "").trim())).length;

      setData({
        ...data,
        name: res.name || data.name,
        industry: nextIndustry,
        business_type: res.business_type || data.business_type,
        city: res.city || data.city,
        address: res.address || data.address,
        whatsapp_number: res.whatsapp_number || data.whatsapp_number,
        working_hours: res.working_hours || data.working_hours,
        business_description:
          res.business_description || data.business_description,
        top_products: products,
        ai_options:
          nextIndustry && nextIndustry !== data.industry
            ? null
            : data.ai_options,
      });

      if (filledCount === 0) {
        setMagicStatus("error");
        setMagicMessage(
          "Siteden net bilgi çıkarılamadı. Alanları elle doldurabilirsiniz.",
        );
      } else {
        setMagicStatus("success");
        setMagicMessage(
          industryMatch.source === "other" && res.industry
            ? `Form dolduruldu. Sektör listede yoktu → «Diğer» seçildi (AI: ${res.industry}).`
            : "Form web sitenizden dolduruldu. Eksik alanları kontrol edin.",
        );
      }
    } catch (e) {
      console.error("Magic fill error:", e);
      setMagicStatus("error");
      setMagicMessage(
        e instanceof Error
          ? e.message
          : "Web sitesi okunamadı. Linki kontrol edip tekrar deneyin.",
      );
    } finally {
      setIsMagicFilling(false);
    }
  };

  const toggleArrayItem = (
    field:
      | "goals"
      | "contact_points"
      | "current_digital_status"
      | "desired_outputs"
      | "unique_selling_point",
    value: string,
  ) => {
    const currentArray = (data[field] as string[] | undefined) || [];
    const maxItems = field === "goals" ? 3 : 5;
    if (currentArray.includes(value)) {
      setData({
        ...data,
        [field]: currentArray.filter((item) => item !== value),
      });
    } else if (currentArray.length < maxItems) {
      setData({ ...data, [field]: [...currentArray, value] });
    }
  };

  const toggleTargetAudience = (value: string) => {
    const currentArr = data.target_audience || [];
    const newArr = currentArr.includes(value)
      ? currentArr.filter((item) => item !== value)
      : currentArr.length < 5
        ? [...currentArr, value]
        : currentArr;
    // Array tutulur; API'ye gönderirken useOnboarding virgülle string'e çevirir.
    setData({ ...data, target_audience: newArr });
  };

  const isAudienceSelected = (aud: string) =>
    (data.target_audience || []).includes(aud);

  const getStepErrors = (): Record<string, string> => {
    if (step === 1) {
      return {
        name: !data.name.trim() ? "İşletme adını yazın." : "",
        industry: !data.industry ? "Sektörünüzü seçin." : "",
        business_type: !data.business_type ? "İşletme modelinizi seçin." : "",
        city: !data.city.trim() ? "Şehrinizi yazın." : "",
      };
    }

    if (step === 2) {
      return {
        address: !data.address.trim() ? "Tam adresinizi yazın." : "",
        whatsapp_number: !data.whatsapp_number.trim()
          ? "WhatsApp veya iletişim numaranızı yazın."
          : "",
      };
    }

    if (step === 3) {
      return {
        goals: data.goals.length === 0 ? "En az bir hedef seçin." : "",
        top_products: (data.top_products || []).filter((p) => p.trim()).length === 0
          ? "En az bir öne çıkan ürün veya hizmet yazın."
          : "",
      };
    }

    if (step === 4) {
      return {
        target_audience: (data.target_audience || []).length === 0
          ? "En az bir müşteri kitlesi seçin."
          : "",
        contact_points:
          data.contact_points.length === 0
            ? "En az bir iletişim kanalı seçin."
            : "",
        unique_selling_point: (data.unique_selling_point || []).length === 0
          ? "İşletmenizi özel yapan en az bir özellik seçin."
          : "",
      };
    }

    if (step === 5) {
      return {
        brand_tone: !data.brand_tone ? "Marka tonunuzu seçin." : "",
      };
    }

    return {};
  };

  const selectedPack = useMemo(
    () => resolveSectorPackFromIndustry(data.industry),
    [data.industry],
  );

  const stepErrors = getStepErrors();
  const missingFields = Object.values(stepErrors).filter(Boolean);
  const showErrors = attemptedSteps.includes(step);

  const handleContinue = async (nextStep: number) => {
    setAttemptedSteps((current) =>
      current.includes(step) ? current : [...current, step],
    );
    if (missingFields.length > 0) return;

    if (step === 1 && nextStep === 2) {
      const hasCachedOptions =
        (data.ai_options?.goals_options?.length || 0) > 0 ||
        (data.ai_options?.target_audience_options?.length || 0) > 0;

      // Cache hits when options already exist (cleared on industry/type change below).
      if (!hasCachedOptions) {
        setIsGeneratingOptions(true);
        try {
          const aiOptions = await generateOnboardingOptions({
            industry: data.industry,
            business_type: data.business_type,
          });
          setData({
            ...data,
            ai_options: {
              goals_options: aiOptions.goals_options || [],
              top_products_placeholders:
                aiOptions.top_products_placeholders || [],
              target_audience_options: aiOptions.target_audience_options || [],
              unique_selling_point_options:
                aiOptions.unique_selling_point_options || [],
            },
          });
        } catch (error) {
          console.error("AI seçenekleri üretilemedi:", error);
          // Fallback: static lists in steps 3–4 still work
        } finally {
          setIsGeneratingOptions(false);
        }
      }
    }

    setStep(nextStep);
  };

  const handleComplete = () => {
    setAttemptedSteps((current) =>
      current.includes(step) ? current : [...current, step],
    );
    if (missingFields.length === 0) onComplete();
  };

  const errorClass = (field: string) =>
    showErrors && stepErrors[field]
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-gray-200 focus:border-blue-500";

  return (
    <div className="relative lp-card mx-auto mt-6 max-w-2xl animate-fade-in-up p-6 sm:mt-10 sm:p-8">
      <div className="mb-8 text-center">
        <span className="mb-4 block text-4xl">🚀</span>
        <h1 className="text-2xl font-bold text-gray-900">
          LocalPilot&apos;a Hoş Geldiniz
        </h1>
        <p className="mt-2 text-gray-500">
          İşletmenizin yapay zeka beynini beslemek için detayları alalım.
        </p>
        {/* İlerleme Çubuğu */}
        <div className="mx-auto mt-4 flex max-w-md justify-center gap-2">
          {["Temel", "Konum", "Hedef", "Değer", "Marka"].map((label, idx) => {
            const s = idx + 1;
            return (
              <div key={s} className="flex flex-col items-center flex-1">
                <div
                  className={`h-2 w-full rounded-full transition-all duration-300 ${step >= s ? "bg-blue-600 shadow-sm shadow-blue-500/50" : "bg-gray-200"}`}
                ></div>
                <span className={`text-[10px] font-bold mt-1.5 transition-colors ${step >= s ? "text-blue-700" : "text-gray-400"}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs font-medium text-gray-400">
          İlerlemeniz bu cihazda otomatik olarak kaydedilir.
        </p>
        <p className="mt-2 text-sm font-bold text-indigo-700">
          Onboarding tamamlama: %{buildDraftOnboardingRate(step)}
        </p>
        {showErrors && missingFields.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
            <p className="text-sm font-bold text-amber-800">
              Bu adımı tamamlamak için eksik alanlar:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-700">
              {missingFields.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        {setupError && (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700"
            role="alert"
          >
            {setupError}
          </div>
        )}
      </div>

      {isGeneratingOptions && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm animate-fade-in">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 px-4 text-center font-bold text-blue-800">
            Yapay zeka sektörünüze özel seçenekler hazırlıyor…
            <br />
            <span className="text-sm font-normal text-blue-600">
              (Birkaç saniye sürebilir)
            </span>
          </p>
        </div>
      )}

            {/* ADIM 1: TEMEL BİLGİLER */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in-up">
          {/* Sihirli Doldurma */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-900">
              <span>✨ Sihirli Doldurma (Web Siteniz)</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-normal text-indigo-700">
                Yapay Zeka
              </span>
            </label>
            <p className="mb-3 text-xs text-indigo-700">
              Web sitenizin linkini girin; ad, sektör, iletişim ve ürün
              alanlarını otomatik dolduralım. Sonucu mutlaka kontrol edin.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                inputMode="url"
                placeholder="https://www.ornek.com"
                className="flex-1 rounded-lg border-2 border-indigo-200 bg-white p-2.5 text-sm text-black outline-none transition focus:border-indigo-500 focus:ring-0"
                value={magicUrl}
                onChange={(e) => {
                  setMagicUrl(e.target.value);
                  if (magicStatus !== "idle") {
                    setMagicStatus("idle");
                    setMagicMessage("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleMagicFill();
                  }
                }}
                disabled={isMagicFilling}
              />
              <button
                type="button"
                onClick={() => void handleMagicFill()}
                disabled={isMagicFilling || !magicUrl.trim()}
                className="flex min-w-[120px] items-center justify-center rounded-lg bg-indigo-600 px-4 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMagicFilling ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Doldur ➔"
                )}
              </button>
            </div>
            {magicMessage ? (
              <p
                className={`mt-2 text-xs font-medium ${
                  magicStatus === "error"
                    ? "text-rose-700"
                    : "text-emerald-800"
                }`}
                role={magicStatus === "error" ? "alert" : "status"}
              >
                {magicMessage}
              </p>
            ) : null}
          </div>
          <div className="my-2 border-t border-gray-100" />
          
          <div>
            <label className="lp-label">
              İşletmenizin Adı
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Örn: Yıldız Makine..."
              aria-invalid={showErrors && Boolean(stepErrors.name)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("name")}`}
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
            <FieldError field="name" errors={stepErrors} visible={showErrors} />
          </div>
          <div>
            <label className="lp-label">
              Sektörünüz <span className="text-red-500">*</span>
            </label>
            <select
              required
              aria-invalid={showErrors && Boolean(stepErrors.industry)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black bg-white ${errorClass("industry")}`}
              value={data.industry}
              onChange={(e) =>
                setData({
                  ...data,
                  industry: e.target.value,
                  // Sektör değişince AI chip listesini yenile
                  ai_options: null,
                  goals: [],
                  target_audience: [],
                  unique_selling_point: [],
                })
              }
            >
              <option value="" disabled>
                Lütfen ana sektörünüzü seçin...
              </option>
              {SECTOR_CATEGORIES.map((category, idx) => (
                <optgroup
                  key={idx}
                  label={category.group}
                  className="font-bold text-gray-900 bg-gray-50"
                >
                  {category.items.map((item, itemIdx) => (
                    <option
                      key={itemIdx}
                      value={item}
                      className="font-normal text-gray-700 bg-white"
                    >
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option
                value={OTHER_INDUSTRY_VALUE}
                className="font-bold text-blue-600"
              >
                Diğer (Belirtilmemiş)
              </option>
            </select>
            <FieldError
              field="industry"
              errors={stepErrors}
              visible={showErrors}
            />
            {data.industry && (
              <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                  Atanan sektör paketi
                </p>
                <p className="mt-1 text-sm font-bold text-cyan-950">
                  {selectedPack.name}
                </p>
                <p className="mt-1 text-xs text-cyan-800">
                  {selectedPack.itemName} akışı ve {selectedPack.stages.length}{" "}
                  aşamalı operasyon paneli kurulacak.
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="lp-label">
              Hangi Şehirdesiniz?
            </label>
            <input
              type="text"
              placeholder="Örn: Düzce..."
              aria-invalid={showErrors && Boolean(stepErrors.city)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("city")}`}
              value={data.city}
              onChange={(e) => setData({ ...data, city: e.target.value })}
            />
            <FieldError field="city" errors={stepErrors} visible={showErrors} />
          </div>
          <div>
            <label className="lp-label">
              İşletme Modeliniz Nedir?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "urun", label: "📦 Üretim/Ürün" },
                { id: "hizmet", label: "🤝 Sadece Hizmet" },
                { id: "ikisi", label: "⚖️ Üretim + Hizmet" },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() =>
                    setData({
                      ...data,
                      business_type: type.id,
                      ai_options:
                        data.business_type === type.id ? data.ai_options : null,
                      goals: data.business_type === type.id ? data.goals : [],
                      target_audience:
                        data.business_type === type.id
                          ? data.target_audience
                          : [],
                      unique_selling_point:
                        data.business_type === type.id
                          ? data.unique_selling_point
                          : [],
                    })
                  }
                  className={`p-3 border-2 rounded-xl text-center text-sm font-bold transition ${data.business_type === type.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <FieldError
              field="business_type"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="lp-label">
              İşletmenizin Hikayesi / Kısa Açıklaması <span className="text-xs text-gray-400 font-normal">(Opsiyonel)</span>
            </label>
            <textarea
              placeholder="Örn: 2010'dan beri bölgenin en büyük yedek parça üreticisiyiz..."
              rows={3}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-sm text-black border-gray-200 focus:border-blue-500`}
              value={data.business_description}
              onChange={(e) => setData({ ...data, business_description: e.target.value })}
            />
          </div>
          <button
            onClick={() => handleContinue(2)}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg mt-2"
          >
            İleri ➔
          </button>
        </div>
      )}

      {/* ADIM 2: KONUM & İLETİŞİM */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in-up">
          <div>
            <label className="lp-label">
              Tam Adresiniz (Google Maps için)
            </label>
            <textarea
              placeholder="Örn: Gümüşova OSB..."
              rows={2}
              aria-invalid={showErrors && Boolean(stepErrors.address)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("address")}`}
              value={data.address}
              onChange={(e) => setData({ ...data, address: e.target.value })}
            />
            <FieldError
              field="address"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="lp-label">
              WhatsApp / İletişim Numaranız
            </label>
            <input
              type="tel"
              placeholder="Örn: 0555 555 55 55"
              aria-invalid={
                showErrors && Boolean(stepErrors.whatsapp_number)
              }
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("whatsapp_number")}`}
              value={data.whatsapp_number}
              onChange={(e) =>
                setData({ ...data, whatsapp_number: e.target.value })
              }
            />
            <FieldError
              field="whatsapp_number"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="lp-label">Çalışma Saatleriniz</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {[
                "Hafta İçi (09:00 - 18:00)",
                "7/24 Kesintisiz Hizmet",
                "Hafta Sonu da Açık",
              ].map((hours) => (
                <button
                  key={hours}
                  onClick={() => setData({ ...data, working_hours: hours })}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${
                    data.working_hours === hours
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-blue-300"
                  }`}
                >
                  {data.working_hours === hours ? "✅ " : "⬜ "}
                  {hours}
                </button>
              ))}
              <button
                onClick={() =>
                  setData({
                    ...data,
                    working_hours: [
                      "Hafta İçi (09:00 - 18:00)",
                      "7/24 Kesintisiz Hizmet",
                      "Hafta Sonu da Açık",
                      "",
                    ].includes(data.working_hours)
                      ? "Özel (Örn: Sadece sabahları)"
                      : "",
                  })
                }
                className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${
                  ![
                    "Hafta İçi (09:00 - 18:00)",
                    "7/24 Kesintisiz Hizmet",
                    "Hafta Sonu da Açık",
                    "",
                  ].includes(data.working_hours)
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700 hover:border-blue-300"
                }`}
              >
                {![
                  "Hafta İçi (09:00 - 18:00)",
                  "7/24 Kesintisiz Hizmet",
                  "Hafta Sonu da Açık",
                  "",
                ].includes(data.working_hours)
                  ? "✅ "
                  : "⬜ "}
                ⚙️ Diğer (Özel saatler)
              </button>
            </div>
            {![
              "Hafta İçi (09:00 - 18:00)",
              "7/24 Kesintisiz Hizmet",
              "Hafta Sonu da Açık",
              "",
            ].includes(data.working_hours) && (
              <input
                type="text"
                autoFocus
                placeholder="Örn: Haftaiçi 08:00 - 18:00, Cumartesi 08:00 - 13:00"
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition text-sm text-black animate-fade-in-up"
                value={data.working_hours}
                onChange={(e) =>
                  setData({ ...data, working_hours: e.target.value })
                }
              />
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={() => handleContinue(3)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
            >
              İleri ➔
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3: İŞ MODELİ VE HEDEFLER */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              En Büyük Hedefleriniz?{" "}
              <span className="text-xs font-normal text-gray-500">
                (En fazla 3)
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(data.ai_options?.goals_options || [
                "Daha fazla B2B / Kurumsal Müşteri",
                "Üretim Kapasitesini Doldurmak",
                "Tekrarlayan Siparişler Almak",
                "Marka Bilinirliğini Artırmak",
                "Müşteri Taleplerini Hızlı Yanıtlamak",
                "Stok / Üretim Takibi Yapmak",
              ]).map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleArrayItem("goals", goal)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${data.goals.includes(goal) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {data.goals.includes(goal) ? "✅ " : "⬜ "}
                  {goal}
                </button>
              ))}
            </div>
            <FieldError field="goals" errors={stepErrors} visible={showErrors} />
          </div>
          <div>
            <label className="lp-label">
              En Popüler 3 Ürün / Hizmetiniz Nedir?
            </label>
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={
                      data.ai_options?.top_products_placeholders?.[index] ||
                      (index === 0
                        ? "Örn: Sac Kalıbı"
                        : index === 1
                          ? "Örn: Yedek Parça İmalatı"
                          : "Örn: 3D Modelleme (Opsiyonel)")
                    }
                    aria-invalid={showErrors && Boolean(stepErrors.top_products)}
                    className={`flex-1 border-2 rounded-xl p-2.5 focus:ring-0 outline-none transition text-sm text-black ${errorClass("top_products")}`}
                    value={data.top_products?.[index] || ""}
                    onChange={(e) => {
                      const newProducts = [...(data.top_products || ["", "", ""])];
                      newProducts[index] = e.target.value;
                      setData({ ...data, top_products: newProducts });
                    }}
                  />
                </div>
              ))}
            </div>
            <FieldError
              field="top_products"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              İşinizde Yaşadığınız En Büyük Zorluk Nedir? <span className="text-xs text-gray-400 font-normal">(Opsiyonel)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "Müşteri Bulamıyoruz",
                "Operasyonel Yük Çok Fazla",
                "Rakiplerden Sıyrılamıyoruz",
                "Marka Bilinirliğimiz Düşük",
                "Dijitalde Var Olamıyoruz",
                "Satışları Kapatmakta Zorlanıyoruz"
              ].map((problem) => (
                <button
                  key={problem}
                  onClick={() => setData({ ...data, main_problem: problem })}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${data.main_problem === problem ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {data.main_problem === problem ? "✅ " : "⬜ "}
                  {problem}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={() => handleContinue(4)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
            >
              İleri ➔
            </button>
          </div>
        </div>
      )}

      {/* ADIM 4: MÜŞTERİ VE DEĞER ÖNERİSİ */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in-up">
          <div>
            <label className="lp-label">
              Ağırlıklı Müşteri Kitleniz Kimler?{" "}
              <span className="text-xs font-normal text-gray-500">
                (Çoklu Seçim)
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {(data.ai_options?.target_audience_options || [
                "Ana Sanayi / Fabrikalar",
                "KOBİ'ler ve Atölyeler",
                "Otomotiv Sektörü",
                "Beyaz Eşya Sektörü",
                "Toptancılar / Distribütörler",
                "Son Tüketiciler (B2C)",
              ]).map((aud) => (
                <button
                  key={aud}
                  onClick={() => toggleTargetAudience(aud)}
                  className={`p-3 border-2 rounded-xl text-center text-sm font-medium transition ${
                    isAudienceSelected(aud)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-blue-300"
                  }`}
                >
                  {isAudienceSelected(aud) ? "✅ " : "⬜ "}
                  {aud}
                </button>
              ))}
            </div>
            <FieldError
              field="target_audience"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Size En Çok Nereden Ulaşıyorlar?{" "}
              <span className="text-xs font-normal text-gray-500">
                (Çoklu Seçim)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                "B2B Referans / Ağ",
                "E-posta / Kurumsal İletişim",
                "WhatsApp Business",
                "Telefon Araması",
                "Fuar ve Ziyaretler",
                "Web Sitesi İletişim Formu",
              ].map((contact) => (
                <button
                  key={contact}
                  onClick={() => toggleArrayItem("contact_points", contact)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${data.contact_points.includes(contact) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {data.contact_points.includes(contact) ? "✅ " : "⬜ "}
                  {contact}
                </button>
              ))}
            </div>
            <FieldError
              field="contact_points"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="lp-label">
              İşletmenizi Özel Yapan Şey Ne? (Neden Siz?)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(data.ai_options?.unique_selling_point_options || [
                "🚀 Hızlı Teslimat / Servis",
                "💰 Uygun ve Rekabetçi Fiyat",
                "⭐ Yüksek Kalite / Premium",
                "🛠️ Özel Üretim / Tasarım",
                "🤝 Güler Yüzlü & Güvenilir Hizmet",
                "🛡️ Garantili Satış / Hizmet",
              ]).map((usp) => (
                <button
                  key={usp}
                  onClick={() => toggleArrayItem("unique_selling_point", usp)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${
                    (data.unique_selling_point || []).includes(usp)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-blue-300"
                  }`}
                >
                  {(data.unique_selling_point || []).includes(usp) ? "✅ " : "⬜ "}
                  {usp}
                </button>
              ))}
            </div>
            <FieldError
              field="unique_selling_point"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="lp-label">
              Fiyatlandırma Segmentiniz Nasıl? <span className="text-xs text-gray-400 font-normal">(Opsiyonel)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "ekonomik", label: "🪙 Ekonomik / Uygun Fiyatlı" },
                { id: "orta", label: "⚖️ Orta Segment" },
                { id: "premium", label: "💎 Premium / Lüks" },
              ].map((level) => (
                <button
                  key={level.id}
                  onClick={() => setData({ ...data, price_level: level.id })}
                  className={`p-3 border-2 rounded-xl text-center text-sm font-bold transition ${data.price_level === level.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={() => handleContinue(5)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
            >
              İleri ➔
            </button>
          </div>
        </div>
      )}

      {/* ADIM 5: MARKA KİMLİĞİ */}
      {step === 5 && (
        <div className="space-y-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Mevcut Dijital Durumunuz Nasıl? <span className="text-xs font-normal text-gray-500">(Çoklu Seçim)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
              {[
                "Aktif Web Sitemiz Var",
                "Sadece Sosyal Medya Kullanıyoruz",
                "E-Ticaret / Pazar Yeri Satışı Yapıyoruz",
                "Google Haritalarda Varız",
                "Dijitalde Neredeyse Hiç Yokuz",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleArrayItem("current_digital_status", status)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${(data.current_digital_status || []).includes(status) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {(data.current_digital_status || []).includes(status) ? "✅ " : "⬜ "}
                  {status}
                </button>
              ))}
            </div>

            <label className="block text-sm font-bold text-gray-700 mb-1">
              LocalPilot AI&apos;dan En Büyük Beklentiniz? <span className="text-xs font-normal text-gray-500">(Çoklu Seçim)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
              {[
                "Daha Fazla Yeni Müşteri Bulmak",
                "İçerik ve Sosyal Medya Yönetimi",
                "Randevu ve Takvim Otomasyonu",
                "Müşteri İletişimini Hızlandırmak",
                "İşletmeyi Dijitalleştirmek",
                "Satışları Düzenli Takip Etmek"
              ].map((output) => (
                <button
                  key={output}
                  onClick={() => toggleArrayItem("desired_outputs", output)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${(data.desired_outputs || []).includes(output) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {(data.desired_outputs || []).includes(output) ? "✅ " : "⬜ "}
                  {output}
                </button>
              ))}
            </div>

            <label className="lp-label">
              Markanızın Tonu Nasıl?
            </label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { id: "profesyonel", label: "🏢 Profesyonel ve Ciddi" },
                { id: "teknolojik", label: "⚙️ Teknolojik ve İnovatif" },
                { id: "guvenilir", label: "🤝 Güvenilir ve Köklü" },
                { id: "dinamik", label: "⚡ Dinamik ve Hızlı" },
              ].map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setData({ ...data, brand_tone: tone.id })}
                  className={`p-3 border-2 rounded-xl text-center text-sm font-medium transition ${data.brand_tone === tone.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
            <FieldError
              field="brand_tone"
              errors={stepErrors}
              visible={showErrors}
            />

            <label className="lp-label">
              Siteniz İçin Renk Tercihiniz?
            </label>
            <select
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition text-black bg-white"
              value={data.color_preference}
              onChange={(e) =>
                setData({ ...data, color_preference: e.target.value })
              }
            >
              <option value="ai">🤖 Yapay Zeka Sektörüme Göre Seçsin</option>
              <option value="blue">🔵 Mavi (Güven, Kurumsal, Teknoloji)</option>
              <option value="gray">🔘 Gri/Metalik (Endüstri, Makine)</option>
              <option value="black">⚫ Siyah (Güç, Premium, Kesinlik)</option>
              <option value="green">🟢 Yeşil (Doğa Dostu Üretim)</option>
              <option value="amber">🟠 Turuncu (Enerji, İş Makinesi)</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(4)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={handleComplete}
              disabled={isSettingUp}
              className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition text-lg flex justify-center items-center gap-2"
            >
              {isSettingUp ? "AI Motoru Çalışıyor..." : "✨ Akıllı Paneli Kur"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
