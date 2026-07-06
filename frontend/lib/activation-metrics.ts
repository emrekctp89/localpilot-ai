export interface ActivationMilestone {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  occurredAt: string | null;
  durationHours: number | null;
  durationLabel: string | null;
  tab?: string;
}

export interface ActivationMetrics {
  businessCreatedAt: string | null;
  profileCreatedAt: string | null;
  onboardingDurationHours: number | null;
  onboardingDurationLabel: string | null;
  onboardingCompletionRate: number;
  milestones: ActivationMilestone[];
}

export interface ActivationMetricSignals {
  businessCreatedAt: string | null;
  profileCreatedAt: string | null;
  firstCustomerAt: string | null;
  firstAppointmentAt: string | null;
  firstCampaignAt: string | null;
  firstDecisionApprovalAt: string | null;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function hoursBetween(startIso: string, endIso: string): number | null {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / HOUR_MS;
}

export function formatDurationHours(hours: number | null): string | null {
  if (hours === null) return null;
  if (hours < 1) return "1 saatten kısa";
  if (hours < 24) return `${Math.round(hours)} saat`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 gün" : `${days} gün`;
}

function buildMilestone(
  id: string,
  label: string,
  description: string,
  originAt: string | null,
  occurredAt: string | null,
  tab?: string,
): ActivationMilestone {
  const durationHours =
    originAt && occurredAt ? hoursBetween(originAt, occurredAt) : null;

  return {
    id,
    label,
    description,
    completed: Boolean(occurredAt),
    occurredAt,
    durationHours,
    durationLabel: formatDurationHours(durationHours),
    tab,
  };
}

export function buildActivationMetrics(
  signals: ActivationMetricSignals,
): ActivationMetrics {
  const businessCreatedAt = signals.businessCreatedAt;
  const profileCreatedAt = signals.profileCreatedAt;

  const onboardingDurationHours =
    profileCreatedAt && businessCreatedAt
      ? hoursBetween(profileCreatedAt, businessCreatedAt)
      : null;

  const milestones: ActivationMilestone[] = [
    {
      id: "onboarding",
      label: "Onboarding tamamlandı",
      description: "İşletme kurulumu ve AI planı oluşturuldu.",
      completed: Boolean(businessCreatedAt),
      occurredAt: businessCreatedAt,
      durationHours: onboardingDurationHours,
      durationLabel: formatDurationHours(onboardingDurationHours),
      tab: "ozet",
    },
    buildMilestone(
      "first_customer",
      "İlk müşteri",
      "CRM'e ilk müşteri kaydı eklendi.",
      businessCreatedAt,
      signals.firstCustomerAt,
      "crm",
    ),
    buildMilestone(
      "first_appointment",
      "İlk randevu",
      "Randevu modülünde ilk kayıt oluşturuldu.",
      businessCreatedAt,
      signals.firstAppointmentAt,
      "randevu",
    ),
    buildMilestone(
      "first_ai_campaign",
      "İlk AI kampanya",
      "Akıllı Kampanya Motoru ile ilk üretim yapıldı.",
      businessCreatedAt,
      signals.firstCampaignAt,
      "araclar",
    ),
    buildMilestone(
      "first_decision_approval",
      "Karar Merkezi ilk onay",
      "Bir AI önerisi onaylandı ve aksiyona dönüştürüldü.",
      businessCreatedAt,
      signals.firstDecisionApprovalAt,
      "karar",
    ),
  ];

  const completedCount = milestones.filter((item) => item.completed).length;
  const onboardingCompletionRate = Math.round(
    (completedCount / milestones.length) * 100,
  );

  return {
    businessCreatedAt,
    profileCreatedAt,
    onboardingDurationHours,
    onboardingDurationLabel: formatDurationHours(onboardingDurationHours),
    onboardingCompletionRate,
    milestones,
  };
}

export function buildDraftOnboardingRate(currentStep: number, totalSteps = 5): number {
  const safeStep = Math.max(0, Math.min(currentStep, totalSteps));
  return Math.round((safeStep / totalSteps) * 100);
}