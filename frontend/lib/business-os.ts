import type {
  Appointment,
  DecisionCycle,
  GoogleBusinessChecklist,
  MiniSiteData,
  Order,
  StaffTask,
} from "./domain-types";

export type AutomationAction =
  | "create_task"
  | "send_message"
  | "publish_campaign"
  | "financial_transaction";

export interface BusinessSignals {
  pendingPayment: number;
  openOrders: number;
  overdueTasks: number;
  upcomingAppointments: number;
  googleProgress: number;
}

interface RecommendationTemplate {
  key: DecisionCycle["recommendationKey"];
  active: boolean;
  basePriority: number;
  signal: string;
  analysis: string;
  recommendation: string;
  expectedResult: string;
  metric: string;
}

export const APPROVAL_POLICY: Record<AutomationAction, true> = {
  create_task: true,
  send_message: true,
  publish_campaign: true,
  financial_transaction: true,
};

export function collectBusinessSignals(
  data: MiniSiteData,
  referenceTime: number,
): BusinessSignals {
  const appointments = Array.isArray(data.appointments)
    ? (data.appointments as Appointment[])
    : [];
  const orders = Array.isArray(data.orders) ? (data.orders as Order[]) : [];
  const tasks = Array.isArray(data.tasks) ? (data.tasks as StaffTask[]) : [];
  const checklist = data.google_business_checklist as
    | GoogleBusinessChecklist
    | undefined;

  return {
    pendingPayment: orders
      .filter(
        (order) =>
          order.paymentStatus === "bekliyor" && order.status !== "iptal",
      )
      .reduce((sum, order) => sum + Number(order.total), 0),
    openOrders: orders.filter(
      (order) => !["teslim_edildi", "iptal"].includes(order.status),
    ).length,
    overdueTasks: tasks.filter(
      (task) =>
        task.status !== "tamamlandi" &&
        task.dueDate &&
        new Date(`${task.dueDate}T23:59:59`).getTime() < referenceTime,
    ).length,
    upcomingAppointments: appointments.filter(
      (appointment) =>
        appointment.status === "planlandi" &&
        new Date(appointment.startsAt).getTime() >= referenceTime,
    ).length,
    googleProgress: Math.round(
      ((checklist?.completedItemIds?.length || 0) / 9) * 100,
    ),
  };
}

function getTemplates(signals: BusinessSignals): RecommendationTemplate[] {
  return [
    {
      key: "pending_payment",
      active: signals.pendingPayment > 0,
      basePriority: 100,
      signal: `${signals.pendingPayment.toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      })} tahsilat bekliyor.`,
      analysis: "Bekleyen ödemeler nakit akışını yavaşlatıyor.",
      recommendation:
        "Ödemesi bekleyen siparişleri bugün kontrol edip müşterilerle iletişime geçin.",
      expectedResult: "Bekleyen tahsilat tutarını azaltmak.",
      metric: "Bekleyen ödeme tutarı",
    },
    {
      key: "overdue_tasks",
      active: signals.overdueTasks > 0,
      basePriority: 90,
      signal: `${signals.overdueTasks} geciken görev bulunuyor.`,
      analysis: "Geciken işler operasyon akışında birikme oluşturuyor.",
      recommendation:
        "Geciken görevleri sorumlularıyla birlikte önceliklendirip bugün sonuçlandırın.",
      expectedResult: "Geciken görev sayısını sıfıra yaklaştırmak.",
      metric: "Geciken görev sayısı",
    },
    {
      key: "open_orders",
      active: signals.openOrders > 0,
      basePriority: 80,
      signal: `${signals.openOrders} açık sipariş işlem bekliyor.`,
      analysis: "Açık siparişler teslimat süresini uzatabilir.",
      recommendation:
        "Açık siparişleri teslimat önceliğine göre sıralayın ve durumlarını güncelleyin.",
      expectedResult: "Açık sipariş sayısını azaltmak.",
      metric: "Açık sipariş sayısı",
    },
    {
      key: "google_profile",
      active: signals.googleProgress < 100,
      basePriority: 60,
      signal: `Google profil hazırlığı %${signals.googleProgress} seviyesinde.`,
      analysis: "Eksik profil bilgileri yerel görünürlüğü sınırlayabilir.",
      recommendation:
        "Google İşletme Profili kontrol listesindeki sıradaki üç adımı tamamlayın.",
      expectedResult: "Google profil hazırlık oranını yükseltmek.",
      metric: "Google profil ilerlemesi",
    },
    {
      key: "growth_review",
      active: true,
      basePriority: 30,
      signal: `${signals.upcomingAppointments} yaklaşan randevu bulunuyor.`,
      analysis: "Kritik operasyon riski görünmüyor; büyüme odağına geçilebilir.",
      recommendation:
        "Haftalık müşteri kazanımı ve tekrar satış sonuçlarını değerlendirin.",
      expectedResult: "Bir sonraki hafta için ölçülebilir büyüme hedefi belirlemek.",
      metric: "Haftalık büyüme hedefi",
    },
  ];
}

function learningScore(
  key: DecisionCycle["recommendationKey"],
  cycles: DecisionCycle[],
) {
  const measured = cycles.filter(
    (cycle) =>
      cycle.recommendationKey === key &&
      cycle.status === "olculdu" &&
      cycle.result,
  );
  const successes = measured.filter(
    (cycle) => cycle.result === "basarili",
  ).length;
  const failures = measured.filter(
    (cycle) => cycle.result === "basarisiz",
  ).length;

  return {
    adjustment: successes * 8 - failures * 12,
    confidence: Math.max(
      20,
      Math.min(95, 55 + successes * 10 - failures * 8),
    ),
    evidenceCount: measured.length,
  };
}

export function generateRecommendation(
  data: MiniSiteData,
  cycles: DecisionCycle[],
  referenceTime: number,
): Omit<DecisionCycle, "id" | "createdAt"> {
  const signals = collectBusinessSignals(data, referenceTime);
  const ranked = getTemplates(signals)
    .filter((template) => template.active)
    .map((template) => {
      const learning = learningScore(template.key, cycles);
      return {
        ...template,
        ...learning,
        score: template.basePriority + learning.adjustment,
      };
    })
    .sort((a, b) => b.score - a.score);
  const selected = ranked[0];

  return {
    recommendationKey: selected.key,
    signal: selected.signal,
    analysis: selected.analysis,
    recommendation: selected.recommendation,
    expectedResult: selected.expectedResult,
    metric: selected.metric,
    status: "oneri",
    confidenceScore: selected.confidence,
    learningEvidenceCount: selected.evidenceCount,
  };
}

export function isActionApproved(
  cycle: DecisionCycle,
  action: AutomationAction,
) {
  if (!APPROVAL_POLICY[action]) return true;
  return cycle.status === "onaylandi";
}

export function createApprovedTaskAutomation(
  cycle: DecisionCycle,
  existingTasks: StaffTask[],
  referenceTime: number,
) {
  if (!isActionApproved(cycle, "create_task")) {
    throw new Error("Bu otomasyon açık kullanıcı onayı olmadan çalıştırılamaz.");
  }

  const dueDate = new Date(referenceTime + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const task: StaffTask = {
    id: crypto.randomUUID(),
    title: cycle.recommendation,
    assignee: "İşletme sahibi",
    dueDate,
    priority: "yuksek",
    status: "bekliyor",
    notes: `Karar Merkezi hedefi: ${cycle.expectedResult}`,
    createdAt: new Date().toISOString(),
  };

  return {
    task,
    tasks: [task, ...existingTasks],
    cycle: {
      ...cycle,
      status: "otomasyonda" as const,
      automatedAt: new Date().toISOString(),
      taskId: task.id,
    },
  };
}

export function measureDecisionOutcome(
  cycle: DecisionCycle,
  result: NonNullable<DecisionCycle["result"]>,
): DecisionCycle {
  return {
    ...cycle,
    status: "olculdu",
    result,
    measuredAt: new Date().toISOString(),
  };
}
