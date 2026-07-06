import type {
  Appointment,
  Customer,
  CustomerFollowUp,
  DecisionCycle,
  GoogleBusinessChecklist,
  MiniSiteData,
  Order,
  StaffTask,
  Transaction,
} from "./domain-types";

export type AutomationAction =
  | "create_task"
  | "send_message"
  | "publish_campaign"
  | "financial_transaction";

export type FinanceTrend = "up" | "down" | "flat";

export interface BusinessSignals {
  pendingPayment: number;
  openOrders: number;
  overdueTasks: number;
  upcomingAppointments: number;
  googleProgress: number;
  financeTrend: FinanceTrend;
  monthlyIncomeChangePct: number;
  recentMonthIncome: number;
  churnRiskCustomers: number;
  overdueFollowUps: number;
  emptyAppointmentSlots: number;
}

export interface DecisionContext
  extends Pick<
    MiniSiteData,
    "appointments" | "orders" | "tasks" | "google_business_checklist"
  > {
  transactions: Transaction[];
  customers: Customer[];
  crmFollowUps: Record<string, CustomerFollowUp>;
}

export interface DecisionDashboardSummary {
  total: number;
  pendingApproval: number;
  inAutomation: number;
  measured: number;
  successRate: number;
  activeStep: string;
}

export interface LearningHistoryItem {
  key: DecisionCycle["recommendationKey"];
  label: string;
  confidence: number;
  evidenceCount: number;
  successes: number;
  failures: number;
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

export const RECOMMENDATION_LABELS: Record<
  DecisionCycle["recommendationKey"],
  string
> = {
  pending_payment: "Tahsilat",
  overdue_tasks: "Geciken Görevler",
  open_orders: "Açık Siparişler",
  google_profile: "Google Profil",
  growth_review: "Büyüme",
  finance_decline: "Finans Trendi",
  crm_churn_risk: "CRM Churn",
  empty_appointment_slots: "Boş Randevu",
  review_insight: "Yorum Analizi",
};

export const APPROVAL_POLICY: Record<AutomationAction, true> = {
  create_task: true,
  send_message: true,
  publish_campaign: true,
  financial_transaction: true,
};

export const AUTOMATION_ACTION_UX: Record<
  AutomationAction,
  {
    approveLabel: string;
    automateLabel: string;
    approveHint: string;
    badgeClass: string;
    buttonClass: string;
  }
> = {
  create_task: {
    approveLabel: "Görev Planını Onayla",
    automateLabel: "Göreve Dönüştür",
    approveHint: "Onay sonrası görev listesine otomatik kayıt oluşturulur.",
    badgeClass: "bg-slate-100 text-slate-700",
    buttonClass: "bg-violet-600 hover:bg-violet-500",
  },
  send_message: {
    approveLabel: "Mesaj Gönderimini Onayla",
    automateLabel: "CRM'de Mesaj Hazırla",
    approveHint: "Onay sonrası müşteri listesinde iletişim akışı başlatılır.",
    badgeClass: "bg-rose-100 text-rose-700",
    buttonClass: "bg-rose-600 hover:bg-rose-500",
  },
  publish_campaign: {
    approveLabel: "Kampanyayı Onayla",
    automateLabel: "İçerik Sekmesine Geç",
    approveHint: "Onay sonrası kampanya ve içerik planı hazırlanır.",
    badgeClass: "bg-purple-100 text-purple-700",
    buttonClass: "bg-purple-600 hover:bg-purple-500",
  },
  financial_transaction: {
    approveLabel: "Finans Aksiyonunu Onayla",
    automateLabel: "Finans Sekmesine Geç",
    approveHint: "Onay sonrası gelir-gider kayıtları gözden geçirilir.",
    badgeClass: "bg-emerald-100 text-emerald-700",
    buttonClass: "bg-emerald-600 hover:bg-emerald-500",
  },
};

const WEEKLY_APPOINTMENT_TARGET = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeContext(
  input: DecisionContext | MiniSiteData,
): DecisionContext {
  if ("transactions" in input) return input;
  return {
    appointments: input.appointments,
    orders: input.orders,
    tasks: input.tasks,
    google_business_checklist: input.google_business_checklist,
    transactions: [],
    customers: [],
    crmFollowUps: {},
  };
}

function computeFinanceSignals(
  transactions: Transaction[],
  referenceTime: number,
) {
  const recentStart = referenceTime - 30 * DAY_MS;
  const priorStart = referenceTime - 60 * DAY_MS;

  const recentIncome = transactions
    .filter((tx) => {
      const createdAt = new Date(tx.created_at).getTime();
      return tx.type === "gelir" && createdAt >= recentStart && createdAt <= referenceTime;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const priorIncome = transactions
    .filter((tx) => {
      const createdAt = new Date(tx.created_at).getTime();
      return tx.type === "gelir" && createdAt >= priorStart && createdAt < recentStart;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const monthlyIncomeChangePct =
    priorIncome > 0
      ? Math.round(((recentIncome - priorIncome) / priorIncome) * 100)
      : 0;

  const financeTrend: FinanceTrend =
    monthlyIncomeChangePct <= -10
      ? "down"
      : monthlyIncomeChangePct >= 10
        ? "up"
        : "flat";

  return { financeTrend, monthlyIncomeChangePct, recentMonthIncome: recentIncome };
}

function computeCrmSignals(
  customers: Customer[],
  crmFollowUps: Record<string, CustomerFollowUp>,
  referenceTime: number,
) {
  const staleThreshold = referenceTime - 30 * DAY_MS;
  const today = new Date(referenceTime).toISOString().slice(0, 10);

  const churnRiskCustomers = customers.filter((customer) => {
    const status = customer.status || "";
    if (status.includes("Kaybedildi") || status.includes("İptal")) return true;
    if (status === "Kazanıldı") return false;

    const createdAt = customer.created_at
      ? new Date(customer.created_at).getTime()
      : 0;
    return createdAt > 0 && createdAt < staleThreshold;
  }).length;

  const overdueFollowUps = Object.values(crmFollowUps).filter(
    (followUp) => followUp.followUpDate && followUp.followUpDate < today,
  ).length;

  return { churnRiskCustomers, overdueFollowUps };
}

function countUpcomingAppointments(
  appointments: Appointment[],
  referenceTime: number,
  windowDays: number,
) {
  const windowEnd = referenceTime + windowDays * DAY_MS;
  return appointments.filter(
    (appointment) =>
      appointment.status === "planlandi" &&
      new Date(appointment.startsAt).getTime() >= referenceTime &&
      new Date(appointment.startsAt).getTime() <= windowEnd,
  ).length;
}

export function collectBusinessSignals(
  input: DecisionContext | MiniSiteData,
  referenceTime: number,
): BusinessSignals {
  const context = normalizeContext(input);
  const appointments = Array.isArray(context.appointments)
    ? (context.appointments as Appointment[])
    : [];
  const orders = Array.isArray(context.orders) ? (context.orders as Order[]) : [];
  const tasks = Array.isArray(context.tasks) ? (context.tasks as StaffTask[]) : [];
  const checklist = context.google_business_checklist as
    | GoogleBusinessChecklist
    | undefined;

  const finance = computeFinanceSignals(context.transactions, referenceTime);
  const crm = computeCrmSignals(
    context.customers,
    context.crmFollowUps,
    referenceTime,
  );
  const upcomingInWeek = countUpcomingAppointments(
    appointments,
    referenceTime,
    7,
  );

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
    financeTrend: finance.financeTrend,
    monthlyIncomeChangePct: finance.monthlyIncomeChangePct,
    recentMonthIncome: finance.recentMonthIncome,
    churnRiskCustomers: crm.churnRiskCustomers,
    overdueFollowUps: crm.overdueFollowUps,
    emptyAppointmentSlots: Math.max(
      0,
      WEEKLY_APPOINTMENT_TARGET - upcomingInWeek,
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
      key: "finance_decline",
      active:
        signals.financeTrend === "down" && signals.recentMonthIncome > 0,
      basePriority: 88,
      signal: `Son 30 günde gelir %${Math.abs(signals.monthlyIncomeChangePct)} düştü.`,
      analysis:
        "Gelir gerilemesi devam ederse nakit rezervi ve yatırım planı etkilenebilir.",
      recommendation:
        "Gider kalemlerini ve düşük marjlı ürünleri inceleyip haftalık nakit hedefi belirleyin.",
      expectedResult: "Gelir düşüş trendini durdurmak.",
      metric: "Aylık gelir değişimi",
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
      key: "crm_churn_risk",
      active:
        signals.churnRiskCustomers > 0 || signals.overdueFollowUps > 0,
      basePriority: 78,
      signal: `${signals.churnRiskCustomers} müşteri churn riskinde, ${signals.overdueFollowUps} takip gecikmiş.`,
      analysis:
        "Geciken takipler ve uzun süredir kapanmayan fırsatlar müşteri kaybına yol açabilir.",
      recommendation:
        "Riskli müşteriler için kişiselleştirilmiş geri kazanım mesajı planlayın.",
      expectedResult: "Churn riskindeki müşteri sayısını azaltmak.",
      metric: "Churn riski + geciken takip",
    },
    {
      key: "empty_appointment_slots",
      active: signals.emptyAppointmentSlots >= 3,
      basePriority: 72,
      signal: `Önümüzdeki hafta ${signals.emptyAppointmentSlots} boş randevu slotu var.`,
      analysis: "Boş slotlar kapasite kullanımını ve gelir potansiyelini düşürüyor.",
      recommendation:
        "Boş saatler için sosyal medya veya WhatsApp kampanyasıyla hızlı doluluk hedefleyin.",
      expectedResult: "Haftalık randevu doluluk oranını artırmak.",
      metric: "Boş randevu slotu",
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
    successes,
    failures,
  };
}

export function getAutomationActionForKey(
  key: DecisionCycle["recommendationKey"],
): AutomationAction {
  switch (key) {
    case "pending_payment":
    case "crm_churn_risk":
      return "send_message";
    case "finance_decline":
      return "financial_transaction";
    case "growth_review":
    case "empty_appointment_slots":
      return "publish_campaign";
    case "review_insight":
      return "create_task";
    default:
      return "create_task";
  }
}

export interface ReviewDecisionBridge {
  signal: string;
  analysis: string;
  recommendation: string;
  expected_result: string;
  metric: string;
  priority?: "high" | "medium" | "low";
}

export function buildReviewDecisionCycle(
  bridge: ReviewDecisionBridge,
): Omit<DecisionCycle, "id" | "createdAt"> {
  const priorityScore =
    bridge.priority === "high" ? 82 : bridge.priority === "low" ? 58 : 70;

  return {
    recommendationKey: "review_insight",
    signal: bridge.signal,
    analysis: bridge.analysis,
    recommendation: bridge.recommendation,
    expectedResult: bridge.expected_result,
    metric: bridge.metric,
    status: "oneri",
    confidenceScore: priorityScore,
    learningEvidenceCount: 0,
  };
}

export function getLearningHistory(
  cycles: DecisionCycle[],
): LearningHistoryItem[] {
  return (Object.keys(RECOMMENDATION_LABELS) as DecisionCycle["recommendationKey"][])
    .map((key) => {
      const learning = learningScore(key, cycles);
      return {
        key,
        label: RECOMMENDATION_LABELS[key],
        confidence: learning.confidence,
        evidenceCount: learning.evidenceCount,
        successes: learning.successes,
        failures: learning.failures,
      };
    })
    .filter((item) => item.evidenceCount > 0)
    .sort((a, b) => b.evidenceCount - a.evidenceCount);
}

export function buildDecisionDashboardSummary(
  cycles: DecisionCycle[],
): DecisionDashboardSummary {
  const pendingApproval = cycles.filter((cycle) => cycle.status === "oneri").length;
  const inAutomation = cycles.filter(
    (cycle) => cycle.status === "otomasyonda",
  ).length;
  const measured = cycles.filter((cycle) => cycle.status === "olculdu").length;
  const successes = cycles.filter((cycle) => cycle.result === "basarili").length;
  const successRate =
    measured > 0 ? Math.round((successes / measured) * 100) : 0;

  const activeStep =
    pendingApproval > 0
      ? "Onay bekleyen öneriler var"
      : inAutomation > 0
        ? "Otomasyon sonuçları ölçülmeyi bekliyor"
        : measured > 0
          ? "Öğrenme geçmişi güncelleniyor"
          : "Yeni analiz için hazır";

  return {
    total: cycles.length,
    pendingApproval,
    inAutomation,
    measured,
    successRate,
    activeStep,
  };
}

export function generateRecommendation(
  input: DecisionContext | MiniSiteData,
  cycles: DecisionCycle[],
  referenceTime: number,
): Omit<DecisionCycle, "id" | "createdAt"> {
  const signals = collectBusinessSignals(input, referenceTime);
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

  const dueDate = new Date(referenceTime + DAY_MS).toISOString().slice(0, 10);
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

export function applyApprovedAutomation(
  cycle: DecisionCycle,
  existingTasks: StaffTask[],
  referenceTime: number,
): {
  cycle: DecisionCycle;
  tasks?: StaffTask[];
  redirectTab?: string;
} {
  const action = getAutomationActionForKey(cycle.recommendationKey);

  if (!isActionApproved(cycle, action)) {
    throw new Error("Bu otomasyon açık kullanıcı onayı olmadan çalıştırılamaz.");
  }

  if (action === "create_task") {
    const automation = createApprovedTaskAutomation(
      cycle,
      existingTasks,
      referenceTime,
    );
    return {
      cycle: automation.cycle,
      tasks: automation.tasks,
    };
  }

  return {
    cycle: {
      ...cycle,
      status: "otomasyonda",
      automatedAt: new Date().toISOString(),
    },
    redirectTab:
      action === "send_message"
        ? "crm"
        : action === "publish_campaign"
          ? "icerik"
          : "kasa",
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