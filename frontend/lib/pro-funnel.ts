import type { Business, Campaign, GeneratedPlan } from "./domain-types";

export const FREE_AI_DAILY_LIMIT = 3;
export const FREE_AI_MONTHLY_LIMIT = 15;
export const PRO_ACTIVATION_WINDOW_DAYS = 7;

export interface AiUsagePeriod {
  used: number;
  limit: number | null;
  remaining: number | null;
  period_key: string | null;
}

export interface AiUsageSnapshot {
  is_pro: boolean;
  daily: AiUsagePeriod;
  monthly: AiUsagePeriod;
  can_use_ai: boolean;
}

export interface ProFeature {
  id: string;
  title: string;
  description: string;
  freeAccess: "limited" | "none" | "full";
}

export const PRO_FEATURES: ProFeature[] = [
  {
    id: "campaigns",
    title: "Akıllı Kampanya Motoru",
    description: "Sektöre özel kampanya ve mesaj şablonları üretin.",
    freeAccess: "limited",
  },
  {
    id: "reviews",
    title: "Yorum Analizi",
    description: "Google yorumlarını analiz edin, yanıt şablonları alın.",
    freeAccess: "limited",
  },
  {
    id: "forecast",
    title: "Finans Tahmini",
    description: "3+ aylık gelir verisiyle gelecek ay projeksiyonu.",
    freeAccess: "limited",
  },
  {
    id: "churn",
    title: "Müşteri Kaybı Analizi",
    description: "Riskli müşterileri tespit edin, geri kazanım mesajı alın.",
    freeAccess: "limited",
  },
  {
    id: "google",
    title: "Google Profil Önerileri",
    description: "İşletme profiliniz için AI destekli iyileştirme önerileri.",
    freeAccess: "limited",
  },
  {
    id: "decision",
    title: "Karar Merkezi Köprüsü",
    description: "AI önerilerini onay akışına tek tıkla aktarın.",
    freeAccess: "full",
  },
];

export interface ActivationChecklistItem {
  id: string;
  title: string;
  description: string;
  tab?: string;
  completed: boolean;
}

export interface ActivationChecklistInput {
  campaigns: Campaign[];
  plan: GeneratedPlan | null;
  business: Business;
  hasCustomers?: boolean;
  hasAppointments?: boolean;
  hasApprovedDecision?: boolean;
  hasGoogleProgress?: boolean;
  hasContentItems?: boolean;
}

export function buildActivationChecklist(
  input: ActivationChecklistInput,
): ActivationChecklistItem[] {
  const published =
    input.plan?.mini_site_data?.publish_status !== "draft" &&
    Boolean(input.plan?.mini_site_data?.hero_slogan);

  return [
    {
      id: "first_campaign",
      title: "İlk AI kampanyanı üret",
      description: "Akıllı Kampanya Motoru ile en az bir fikir oluşturun.",
      tab: "araclar",
      completed: input.campaigns.length > 0,
    },
    {
      id: "publish_site",
      title: "Mini siteyi yayına al",
      description: "Vitrin ayarlarından sitenizi yayınlayın ve linki paylaşın.",
      tab: "ayarlar",
      completed: published,
    },
    {
      id: "first_customer",
      title: "İlk müşterini ekle",
      description: "CRM sekmesinden en az bir müşteri kaydı oluşturun.",
      tab: "crm",
      completed: Boolean(input.hasCustomers),
    },
    {
      id: "first_appointment",
      title: "İlk randevunu planla",
      description: "Randevu modülünde ilk kaydınızı oluşturun.",
      tab: "randevu",
      completed: Boolean(input.hasAppointments),
    },
    {
      id: "first_decision",
      title: "Karar Merkezi'nde onay ver",
      description: "Bir AI önerisini onaylayarak aksiyon döngüsünü başlatın.",
      tab: "karar",
      completed: Boolean(input.hasApprovedDecision),
    },
    {
      id: "google_profile",
      title: "Google profil listesine başla",
      description: "Google İşletme kontrol listesinde ilk adımları tamamlayın.",
      tab: "google_business",
      completed: Boolean(input.hasGoogleProgress),
    },
    {
      id: "first_content",
      title: "İçerik planına gönderi ekle",
      description: "Sosyal medya veya WhatsApp içeriği planlayın.",
      tab: "icerik",
      completed: Boolean(input.hasContentItems),
    },
  ];
}

export function isWithinActivationWindow(
  activatedAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!activatedAt) return false;
  const start = new Date(activatedAt);
  if (Number.isNaN(start.getTime())) return false;
  const diffMs = now.getTime() - start.getTime();
  const windowMs = PRO_ACTIVATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return diffMs >= 0 && diffMs <= windowMs;
}

export function activationProgress(items: ActivationChecklistItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((item) => item.completed).length;
  return Math.round((done / items.length) * 100);
}

export function formatUsageLabel(period: AiUsagePeriod): string {
  if (period.limit === null || period.remaining === null) {
    return "Sınırsız";
  }
  return `${period.used}/${period.limit}`;
}