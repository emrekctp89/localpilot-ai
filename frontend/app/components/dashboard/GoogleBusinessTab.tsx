"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchGoogleProfileSuggestions } from "@/lib/ai-client";
import type { Business, GoogleBusinessChecklist } from "@/lib/domain-types";
import {
  buildGoogleMapsSearchUrl,
  buildGoogleProfileSuggestions,
  getGoogleBusinessIntegrationStatus,
  getGoogleBusinessManagerUrl,
  mergeGoogleProfileSuggestions,
} from "@/lib/integrations";
import { loadGoogleChecklist, saveGoogleChecklist } from "@/lib/repositories";

interface GoogleBusinessTabProps {
  business: Business;
}

const CHECKLIST_ITEMS = [
  ["profile-claimed", "Temel Bilgiler", "İşletme profilinin sahipliğini doğrula", "Google profilini işletme hesabınızla doğrulayın."],
  ["contact-complete", "Temel Bilgiler", "Adres, telefon ve çalışma saatlerini tamamla", "Müşterilerin ulaşacağı bilgilerin güncel olduğundan emin olun."],
  ["category-selected", "Temel Bilgiler", "Ana ve ek işletme kategorilerini seç", "Sunduğunuz hizmeti en doğru anlatan kategorileri kullanın."],
  ["description-written", "İçerik", "İşletme açıklamasını yayınla", "Konumunuzu, uzmanlığınızı ve farkınızı kısa biçimde anlatın."],
  ["photos-added", "İçerik", "En az beş güncel fotoğraf ekle", "Dış cephe, iç mekan, ekip ve ürün fotoğrafları kullanın."],
  ["products-added", "İçerik", "Öne çıkan ürün veya hizmetleri ekle", "Müşterinin karar vermesini kolaylaştıracak net seçenekler sunun."],
  ["review-link-ready", "Güven", "Yorum isteme bağlantısını hazırla", "Memnun müşterilere göndereceğiniz yorum bağlantısını kaydedin."],
  ["reviews-replied", "Güven", "Son müşteri yorumlarını yanıtla", "Olumlu ve olumsuz yorumlara kısa, kişisel yanıtlar verin."],
  ["first-post-published", "Güncellik", "İlk Google gönderisini yayınla", "Yeni ürün, kampanya veya işletme haberinizi paylaşın."],
] as const;

export default function GoogleBusinessTab({ business }: GoogleBusinessTabProps) {
  const [checklist, setChecklist] = useState<GoogleBusinessChecklist>({
    completedItemIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isEnhancingSuggestions, setIsEnhancingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [enhancedSuggestions, setEnhancedSuggestions] = useState<
    ReturnType<typeof buildGoogleProfileSuggestions>
  >([]);
  const integrationStatus = getGoogleBusinessIntegrationStatus();

  useEffect(() => {
    const loadChecklist = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      const storedChecklist = await loadGoogleChecklist(business.id);
      setChecklist(storedChecklist);
      setLoading(false);
    };

    loadChecklist();
  }, [business.id]);

  const persistChecklist = async (nextChecklist: GoogleBusinessChecklist) => {
    if (!business.id) return false;
    setSaveStatus("saving");

    const saved = await saveGoogleChecklist(business.id, nextChecklist);
    if (!saved) {
      setSaveStatus("error");
      return false;
    }

    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const handleToggle = async (itemId: string) => {
    const previousChecklist = checklist;
    const isCompleted = checklist.completedItemIds.includes(itemId);
    const nextChecklist: GoogleBusinessChecklist = {
      completedItemIds: isCompleted
        ? checklist.completedItemIds.filter((id) => id !== itemId)
        : [...checklist.completedItemIds, itemId],
      updatedAt: new Date().toISOString(),
    };

    setChecklist(nextChecklist);
    const saved = await persistChecklist(nextChecklist);
    if (!saved) setChecklist(previousChecklist);
  };

  const categories = useMemo(
    () => [...new Set(CHECKLIST_ITEMS.map((item) => item[1]))],
    [],
  );
  const completedCount = checklist.completedItemIds.filter((id) =>
    CHECKLIST_ITEMS.some((item) => item[0] === id),
  ).length;
  const progress = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);
  const localSuggestions = useMemo(
    () => buildGoogleProfileSuggestions(business, checklist),
    [business, checklist],
  );
  const profileSuggestions = useMemo(
    () => mergeGoogleProfileSuggestions(localSuggestions, enhancedSuggestions),
    [localSuggestions, enhancedSuggestions],
  );

  const handleEnhanceSuggestions = async () => {
    if (!business.id || localSuggestions.length === 0) return;
    setIsEnhancingSuggestions(true);
    setSuggestionError("");
    try {
      const data = await fetchGoogleProfileSuggestions({
        business_name: business.name || "",
        industry: business.industry || "",
        sector: business.sector || "",
        city: business.city || "",
        address: business.address || "",
        whatsapp_number: business.whatsapp_number || "",
        working_hours: business.working_hours || "",
        pending_checklist_ids: localSuggestions.map(
          (item) => item.checklistItemId,
        ),
      });
      setEnhancedSuggestions(data.suggestions || []);
    } catch (error) {
      setSuggestionError(
        error instanceof Error
          ? error.message
          : "Profil önerileri alınamadı.",
      );
    } finally {
      setIsEnhancingSuggestions(false);
    }
  };

  const handleCopySuggestion = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard errors
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center font-medium text-gray-500">
        Google profil planı yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-100">
              Yerel Görünürlük
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Google İşletme Profili
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-amber-50">
              Profilinizi eksiksiz hale getirerek haritalarda daha güvenilir ve
              görünür olun.
            </p>
          </div>
          <div className="min-w-44 rounded-2xl bg-white/15 p-4">
            <div className="flex items-end justify-between gap-4">
              <p className="text-3xl font-black">%{progress}</p>
              <p className="text-xs font-bold text-amber-100">
                {completedCount}/{CHECKLIST_ITEMS.length} tamamlandı
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-gray-600">
          Tamamlanan adımlar otomatik olarak işletme planınıza kaydedilir.
        </p>
        <span className="text-xs font-bold text-gray-400">
          {saveStatus === "saving" && "Kaydediliyor..."}
          {saveStatus === "saved" && "Kaydedildi"}
          {saveStatus === "error" && "Kaydedilemedi"}
        </span>
      </div>

      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">
              Google Business Profile API
            </p>
            <h3 className="mt-1 text-lg font-black text-gray-900">
              {integrationStatus.label}
            </h3>
            <p className="mt-2 text-sm text-amber-900">
              {integrationStatus.detail}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={getGoogleBusinessManagerUrl()}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-amber-800 border border-amber-200 hover:bg-amber-100"
            >
              Profil Yöneticisi
            </a>
            <a
              href={buildGoogleMapsSearchUrl(business)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              Haritada Gör
            </a>
          </div>
        </div>
      </section>

      {profileSuggestions.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Canlı Profil Önerileri
              </h3>
              <p className="text-sm text-gray-500">
                Eksik checklist maddeleri için kopyalanabilir metinler.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnhanceSuggestions}
              disabled={isEnhancingSuggestions}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:bg-gray-400"
            >
              {isEnhancingSuggestions ? "AI önerileri alınıyor..." : "AI ile Zenginleştir"}
            </button>
          </div>
          {suggestionError && (
            <p className="mb-4 text-sm font-medium text-red-600" role="alert">
              {suggestionError}
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {profileSuggestions.map((suggestion) => (
              <article
                key={suggestion.checklistItemId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-black text-gray-900">{suggestion.title}</h4>
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">
                    {suggestion.priority}
                  </span>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-gray-700">
                  {suggestion.suggestedText}
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopySuggestion(suggestion.suggestedText)}
                  className="mt-3 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-50"
                >
                  {suggestion.actionLabel}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {categories.map((category) => {
          const items = CHECKLIST_ITEMS.filter((item) => item[1] === category);
          const categoryCompleted = items.filter((item) =>
            checklist.completedItemIds.includes(item[0]),
          ).length;

          return (
            <section
              key={category}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black text-gray-900">{category}</h3>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  {categoryCompleted}/{items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map(([id, , title, description]) => {
                  const isCompleted = checklist.completedItemIds.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                        isCompleted
                          ? "border-emerald-100 bg-emerald-50"
                          : "border-gray-100 bg-gray-50 hover:border-amber-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={saveStatus === "saving"}
                        onChange={() => handleToggle(id)}
                        className="mt-1 h-4 w-4 accent-amber-500"
                      />
                      <span>
                        <span
                          className={`block text-sm font-black ${
                            isCompleted
                              ? "text-emerald-800 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {title}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                          {description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
