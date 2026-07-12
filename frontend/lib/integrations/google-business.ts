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

/**
 * Gerçek web sitesi / onboarding verisinden Google checklist maddelerini çıkar.
 * OAuth olmadan da “dolu” sayılacak hazırlık adımları.
 */
export function inferGoogleChecklistFromBusiness(
  business: Pick<
    Business,
    | "name"
    | "city"
    | "address"
    | "whatsapp_number"
    | "working_hours"
    | "industry"
    | "sector"
    | "top_products"
  >,
  options?: {
    aboutUs?: string | null;
    businessDescription?: string | null;
    currentDigitalStatus?: string[] | null;
    hasWebsite?: boolean;
  },
): string[] {
  const completed = new Set<string>();
  const address = business.address?.trim() || "";
  const phone = business.whatsapp_number?.trim() || "";
  const hours = business.working_hours?.trim() || "";
  const industry = (business.industry || business.sector || "").trim();
  const about = (
    options?.aboutUs ||
    options?.businessDescription ||
    ""
  ).trim();
  const products = (business.top_products || "").trim();
  const digital = options?.currentDigitalStatus || [];
  const onGoogleMaps = digital.some((item) =>
    /google|harita|maps/i.test(item || ""),
  );

  // İletişim üçlüsü (adres + telefon + saat) → contact-complete
  const contactScore = [address, phone, hours].filter(Boolean).length;
  if (contactScore >= 2) {
    completed.add("contact-complete");
  }

  if (industry) {
    completed.add("category-selected");
  }

  if (about.length >= 40) {
    completed.add("description-written");
  }

  if (products.length >= 3) {
    completed.add("products-added");
  }

  // Haritalar araması mümkün → yorum linki hazırlık metni üretilebilir
  if (business.name?.trim() && (business.city?.trim() || address)) {
    completed.add("review-link-ready");
  }

  // Kullanıcı «Google’da varız» veya gerçek site ile geldiyse profil sahipliği adımına hazır
  if (onGoogleMaps || options?.hasWebsite) {
    completed.add("profile-claimed");
  }

  return Array.from(completed);
}

/** Merge inferred + existing without duplicates. */
export function mergeGoogleChecklistIds(
  existing: string[] | undefined,
  inferred: string[],
): string[] {
  return Array.from(new Set([...(existing || []), ...inferred]));
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
        suggestedText = business.top_products?.trim()
          ? `Google ürün/hizmet listesi için öneri:\n${business.top_products
              .split(/,|\n/)
              .map((p) => p.trim())
              .filter(Boolean)
              .slice(0, 8)
              .map((p, i) => `${i + 1}. ${p}`)
              .join("\n")}`
          : `Öne çıkan hizmetlerinizi listeleyin. İşletme: ${business.name}.`;
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