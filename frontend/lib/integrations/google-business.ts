import type { Business, GoogleBusinessChecklist } from "../domain-types";
import type { IntegrationProviderStatus } from "../integration-client";
import type { GoogleProfileSuggestion, IntegrationStatus } from "./types";

export const GOOGLE_CHECKLIST_ITEM_META: Record<
  string,
  { title: string; category: string }
> = {
  "profile-claimed": {
    title: "İşletme profilinin sahipliğini doğrula",
    category: "Temel Bilgiler",
  },
  "contact-complete": {
    title: "Adres, telefon ve çalışma saatlerini tamamla",
    category: "Temel Bilgiler",
  },
  "category-selected": {
    title: "Ana ve ek işletme kategorilerini seç",
    category: "Temel Bilgiler",
  },
  "description-written": {
    title: "İşletme açıklamasını yayınla",
    category: "İçerik",
  },
  "photos-added": {
    title: "En az beş güncel fotoğraf ekle",
    category: "İçerik",
  },
  "products-added": {
    title: "Öne çıkan ürün veya hizmetleri ekle",
    category: "İçerik",
  },
  "review-link-ready": {
    title: "Yorum isteme bağlantısını hazırla",
    category: "Güven",
  },
  "reviews-replied": {
    title: "Son müşteri yorumlarını yanıtla",
    category: "Güven",
  },
  "first-post-published": {
    title: "İlk Google gönderisini yayınla",
    category: "Güncellik",
  },
};

const PRIORITY_BY_ITEM: Record<string, GoogleProfileSuggestion["priority"]> = {
  "profile-claimed": "high",
  "contact-complete": "high",
  "category-selected": "high",
  "description-written": "medium",
  "photos-added": "medium",
  "products-added": "medium",
  "review-link-ready": "medium",
  "reviews-replied": "high",
  "first-post-published": "low",
};

function buildDescriptionSuggestion(business: Business, aboutUs?: string) {
  const location = business.city ? `${business.city} bölgesinde ` : "";
  const sector = business.industry || business.sector || "hizmet";
  const base =
    aboutUs?.trim() ||
    `${business.name}, ${location}${sector} alanında güvenilir ve hızlı hizmet sunar.`;
  return `${base} Randevu ve bilgi için ${business.whatsapp_number || "iletişim numaramız"} üzerinden bize ulaşabilirsiniz.`;
}

function buildPostSuggestion(business: Business) {
  return `${business.name} olarak ${business.city || "bölgenizde"} yeni kampanyamızı duyuruyoruz. Detaylar ve randevu için hemen iletişime geçin.`;
}

function buildReviewRequestSuggestion(business: Business) {
  return `Merhaba, ${business.name} deneyiminizden memnun kaldıysanız Google yorumunuz bize çok yardımcı olur. Kısa bir değerlendirme bırakır mısınız?`;
}

export function getGoogleBusinessIntegrationStatus(
  remote?: IntegrationProviderStatus | null,
): IntegrationStatus {
  if (remote) {
    return {
      provider: "google_business",
      status: remote.status,
      label: remote.label,
      detail: remote.detail,
    };
  }

  return {
    provider: "google_business",
    status: "ready",
    label: "Manuel + OAuth hazırlık",
    detail:
      "Canlı profil önerileri işletme verinizden üretilir. OAuth ile yazma için Bağlan düğmesini kullanın.",
  };
}

export function canApplyGoogleSuggestionRemotely(
  remote: IntegrationProviderStatus | null | undefined,
  checklistItemId: string,
): boolean {
  return (
    remote?.status === "connected" && checklistItemId === "description-written"
  );
}

export function buildGoogleMapsSearchUrl(business: Business) {
  const query = [business.name, business.city, business.address]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getGoogleBusinessManagerUrl() {
  return "https://business.google.com/";
}

export function buildGoogleProfileSuggestions(
  business: Business,
  checklist: GoogleBusinessChecklist,
  aboutUs?: string,
): GoogleProfileSuggestion[] {
  const completed = new Set(checklist.completedItemIds);
  const pendingIds = Object.keys(GOOGLE_CHECKLIST_ITEM_META).filter(
    (id) => !completed.has(id),
  );

  return pendingIds.map((itemId) => {
    const meta = GOOGLE_CHECKLIST_ITEM_META[itemId];
    let suggestedText = `${meta.title} adımını tamamlayın.`;
    let actionLabel = "Google İşletme Profilini Aç";

    switch (itemId) {
      case "contact-complete":
        suggestedText = [
          `Adres: ${business.address || "Panelden tam adres girin"}`,
          `Telefon/WhatsApp: ${business.whatsapp_number || "Panelden numara girin"}`,
          `Çalışma saatleri: ${business.working_hours || "Panelden çalışma saatlerini girin"}`,
        ].join("\n");
        actionLabel = "İletişim bilgilerini kopyala";
        break;
      case "category-selected":
        suggestedText = `Ana kategori: ${business.industry || business.sector || "Hizmet işletmesi"}. Ek kategori olarak şehir bazlı arama terimlerini ekleyin.`;
        break;
      case "description-written":
        suggestedText = buildDescriptionSuggestion(business, aboutUs);
        actionLabel = "Açıklamayı kopyala";
        break;
      case "photos-added":
        suggestedText =
          "En az 5 fotoğraf yükleyin: dış cephe, iç mekan, ekip, ürün/hizmet ve müşteri deneyimi.";
        break;
      case "products-added":
        suggestedText = `Öne çıkan hizmetlerinizi listeleyin. İşletme: ${business.name}.`;
        break;
      case "review-link-ready":
        suggestedText = buildReviewRequestSuggestion(business);
        actionLabel = "Yorum isteme mesajını kopyala";
        break;
      case "reviews-replied":
        suggestedText =
          "Son 7 gündeki yorumlara 24 saat içinde kısa, kişisel yanıt verin. Olumsuz yorumlarda çözüm odaklı kalın.";
        break;
      case "first-post-published":
        suggestedText = buildPostSuggestion(business);
        actionLabel = "Gönderi metnini kopyala";
        break;
      default:
        break;
    }

    return {
      checklistItemId: itemId,
      title: meta.title,
      suggestedText,
      actionLabel,
      priority: PRIORITY_BY_ITEM[itemId] || "medium",
    };
  });
}

export function mergeGoogleProfileSuggestions(
  localSuggestions: GoogleProfileSuggestion[],
  remoteSuggestions: GoogleProfileSuggestion[] = [],
) {
  const remoteById = new Map(
    remoteSuggestions.map((item) => [item.checklistItemId, item]),
  );

  return localSuggestions.map((local) => {
    const remote = remoteById.get(local.checklistItemId);
    if (!remote) return local;
    return {
      ...local,
      suggestedText: remote.suggestedText || local.suggestedText,
      actionLabel: remote.actionLabel || local.actionLabel,
      priority: remote.priority || local.priority,
    };
  });
}