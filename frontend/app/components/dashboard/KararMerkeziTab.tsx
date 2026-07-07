"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyApprovedAutomation,
  AUTOMATION_ACTION_UX,
  buildDecisionDashboardSummary,
  collectBusinessSignals,
  generateRecommendation,
  getAutomationActionForKey,
  getLearningHistory,
  measureDecisionOutcome,
  RECOMMENDATION_LABELS,
} from "@/lib/business-os";
import type { DecisionContext } from "@/lib/business-os";
import type {
  Business,
  DecisionCycle,
  MiniSiteData,
  StaffTask,
} from "@/lib/domain-types";
import {
  getDecisionQuickActions,
  type DecisionQuickAction,
} from "@/lib/decision-quick-actions";
import {
  listDecisionCycles,
  loadDecisionContext,
  saveDecisionCycles,
  saveStaffTasks,
} from "@/lib/repositories";
import { triggerBusinessWebhooks } from "@/lib/platform/webhooks";

interface KararMerkeziTabProps {
  business: Business;
  setActiveTab: (tab: string) => void;
}

const statusLabels: Record<DecisionCycle["status"], string> = {
  oneri: "Öneri",
  onaylandi: "Onaylandı",
  otomasyonda: "Göreve Dönüştü",
  olculdu: "Sonuç Ölçüldü",
};

export default function KararMerkeziTab({
  business,
  setActiveTab,
}: KararMerkeziTabProps) {
  const [decisionContext, setDecisionContext] = useState<DecisionContext>({
    appointments: [],
    orders: [],
    tasks: [],
    google_business_checklist: { completedItemIds: [] },
    transactions: [],
    customers: [],
    crmFollowUps: {},
  });
  const [cycles, setCycles] = useState<DecisionCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [referenceTime] = useState(() => Date.now());

  useEffect(() => {
    const loadDecisionData = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      const [context, storedCycles] = await Promise.all([
        loadDecisionContext(business.id),
        listDecisionCycles(business.id),
      ]);

      setDecisionContext(context);
      setCycles(storedCycles);
      setLoading(false);
    };

    loadDecisionData();
  }, [business.id]);

  const signals = useMemo(
    () => collectBusinessSignals(decisionContext, referenceTime),
    [decisionContext, referenceTime],
  );
  const summary = useMemo(
    () => buildDecisionDashboardSummary(cycles),
    [cycles],
  );
  const learningHistory = useMemo(() => getLearningHistory(cycles), [cycles]);

  const persistCycles = async (
    nextCycles: DecisionCycle[],
    additionalData: Partial<MiniSiteData> = {},
  ) => {
    if (!business.id) return false;
    setSaveStatus("saving");

    const savedCycles = await saveDecisionCycles(business.id, nextCycles);
    if (!savedCycles) {
      setSaveStatus("error");
      return false;
    }

    if (additionalData.tasks) {
      const savedTasks = await saveStaffTasks(
        business.id,
        additionalData.tasks as StaffTask[],
      );
      if (!savedTasks) {
        setSaveStatus("error");
        return false;
      }
    }

    setDecisionContext((current) => ({
      ...current,
      ...additionalData,
    }));
    setCycles(nextCycles);
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const handleAnalyze = () => {
    const recommendation = generateRecommendation(
      decisionContext,
      cycles,
      referenceTime,
    );
    const duplicate = cycles.some(
      (cycle) =>
        cycle.recommendation === recommendation.recommendation &&
        cycle.status !== "olculdu",
    );
    if (duplicate) return;

    const nextCycle: DecisionCycle = {
      ...recommendation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    persistCycles([nextCycle, ...cycles]);
  };

  const updateCycle = (
    cycleId: string,
    updates: Partial<DecisionCycle>,
  ) =>
    persistCycles(
      cycles.map((cycle) =>
        cycle.id === cycleId ? { ...cycle, ...updates } : cycle,
      ),
    );

  const handleApprove = (cycleId: string) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    if (cycle && business.id) {
      void triggerBusinessWebhooks({
        businessId: business.id,
        event: "decision.approved",
        data: {
          cycle_id: cycle.id,
          recommendation_key: cycle.recommendationKey,
          recommendation: cycle.recommendation,
        },
      });
    }

    return updateCycle(cycleId, {
      status: "onaylandi",
      approvedAt: new Date().toISOString(),
    });
  };

  const handleAutomate = (cycle: DecisionCycle) => {
    const existingTasks = Array.isArray(decisionContext.tasks)
      ? (decisionContext.tasks as StaffTask[])
      : [];
    const automation = applyApprovedAutomation(
      cycle,
      existingTasks,
      referenceTime,
    );
    const nextCycles = cycles.map((item) =>
      item.id === cycle.id ? automation.cycle : item,
    );

    persistCycles(nextCycles, automation.tasks ? { tasks: automation.tasks } : {});

    if (business.id) {
      void triggerBusinessWebhooks({
        businessId: business.id,
        event: "decision.automated",
        data: {
          cycle_id: cycle.id,
          recommendation_key: cycle.recommendationKey,
          action: getAutomationActionForKey(cycle.recommendationKey),
        },
      });
    }

    if (automation.redirectTab) {
      setActiveTab(automation.redirectTab);
    }
  };

  const handleQuickAction = async (action: DecisionQuickAction) => {
    if (action.kind === "whatsapp" || action.kind === "google_open") {
      if (action.url) window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (action.kind === "copy_text" && action.copyText) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(action.copyText);
      }
      return;
    }

    if (action.kind === "navigate" && action.tab) {
      setActiveTab(action.tab);
    }
  };

  const handleMeasure = (
    cycleId: string,
    result: DecisionCycle["result"],
  ) =>
    persistCycles(
      cycles.map((cycle) =>
        cycle.id === cycleId && result
          ? measureDecisionOutcome(cycle, result)
          : cycle,
      ),
    );

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center font-medium text-gray-500">
        Karar döngüsü hazırlanıyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 p-6 text-white shadow-lg md:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-violet-200">
          İşletmenin Üst Aklı
        </p>
        <h2 className="mt-2 text-3xl font-black">Karar Merkezi</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100">
          Veri → analiz → öneri → onay → otomasyon → sonuç ölçümü
        </p>
        <p className="mt-2 text-sm font-semibold text-violet-200">
          {summary.activeStep}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={saveStatus === "saving"}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60"
          >
            Verileri Analiz Et
          </button>
          <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">
            {summary.total} döngü · {summary.pendingApproval} onay ·{" "}
            {summary.inAutomation} otomasyon
          </span>
          <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">
            %{summary.successRate} başarı ({summary.measured} ölçüm)
          </span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Tahsilat", `${signals.pendingPayment.toLocaleString("tr-TR")} ₺`],
          ["Finans", `%${signals.monthlyIncomeChangePct} (${signals.financeTrend === "down" ? "düşüş" : signals.financeTrend === "up" ? "artış" : "durağan"})`],
          ["CRM Risk", `${signals.churnRiskCustomers} müşteri`],
          ["Boş Slot", `${signals.emptyAppointmentSlots} slot`],
          ["Geciken", `${signals.overdueTasks} görev`],
          ["Randevu", `${signals.upcomingAppointments} yaklaşan`],
        ].map(([title, value]) => (
          <div
            key={title}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wide text-gray-400">
              {title}
            </p>
            <p className="mt-1 text-sm font-black text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ["Veri", "Operasyon + finans + CRM"],
          ["Analiz", "Risk ve fırsat"],
          ["Onay", "Aksiyon tipine göre"],
          ["Otomasyon", "Görev / mesaj / kampanya"],
          ["Ölçüm", "Sonuç ve öğrenme"],
        ].map(([title, detail], index) => (
          <div
            key={title}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black text-indigo-600">
              {index + 1}. ADIM
            </p>
            <p className="mt-1 font-black text-gray-900">{title}</p>
            <p className="mt-1 text-xs text-gray-500">{detail}</p>
          </div>
        ))}
      </div>

      {learningHistory.length > 0 && (
        <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
          <h3 className="text-lg font-black text-gray-900">Öğrenme Geçmişi</h3>
          <p className="mt-1 text-sm text-gray-500">
            Geçmiş ölçümlerden güven skoru ve kanıt sayısı
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {learningHistory.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-white bg-white p-4 shadow-sm"
              >
                <p className="font-black text-gray-900">{item.label}</p>
                <p className="mt-2 text-sm text-gray-600">
                  %{item.confidence} güven · {item.evidenceCount} ölçüm
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {item.successes} başarılı · {item.failures} başarısız
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {cycles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-12 text-center">
          <h3 className="font-black text-gray-900">Henüz karar döngüsü yok.</h3>
          <p className="mt-2 text-sm text-gray-500">
            İlk öneriyi üretmek için mevcut işletme verilerini analiz edin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const action = getAutomationActionForKey(cycle.recommendationKey);
            const actionUx = AUTOMATION_ACTION_UX[action];
            const quickActions = getDecisionQuickActions(
              cycle,
              business,
              decisionContext.google_business_checklist || {
                completedItemIds: [],
              },
            );

            return (
              <article
                key={cycle.id}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                        {statusLabels[cycle.status]}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${actionUx.badgeClass}`}
                      >
                        {RECOMMENDATION_LABELS[cycle.recommendationKey]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-gray-500">
                      {cycle.signal}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-gray-900">
                      {cycle.recommendation}
                    </h3>
                  </div>
                  {typeof cycle.confidenceScore === "number" && (
                    <div className="text-right">
                      <span className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                        %{cycle.confidenceScore} güven
                      </span>
                      {typeof cycle.learningEvidenceCount === "number" &&
                        cycle.learningEvidenceCount > 0 && (
                          <p className="mt-2 text-xs font-semibold text-gray-500">
                            {cycle.learningEvidenceCount} geçmiş ölçüm
                          </p>
                        )}
                    </div>
                  )}
                </div>

                <p className="mt-4 text-sm text-gray-600">{cycle.analysis}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  Beklenen sonuç: {cycle.expectedResult}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {cycle.status === "oneri" && (
                    <button
                      type="button"
                      onClick={() => handleApprove(cycle.id)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
                    >
                      {actionUx.approveLabel}
                    </button>
                  )}
                  {cycle.status === "oneri" && (
                    <span className="self-center text-xs text-gray-500">
                      {actionUx.approveHint}
                    </span>
                  )}
                  {cycle.status === "onaylandi" && (
                    <button
                      type="button"
                      onClick={() => handleAutomate(cycle)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${actionUx.buttonClass}`}
                    >
                      {actionUx.automateLabel}
                    </button>
                  )}
                  {cycle.status === "otomasyonda" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMeasure(cycle.id, "basarili")}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
                      >
                        Başarılı
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMeasure(cycle.id, "basarisiz")}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
                      >
                        Başarısız
                      </button>
                    </>
                  )}
                  {cycle.status === "otomasyonda" && cycle.taskId && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("personel")}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Görevleri Gör
                    </button>
                  )}
                  {cycle.status === "otomasyonda" && !cycle.taskId && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          action === "send_message"
                            ? "crm"
                            : action === "publish_campaign"
                              ? "icerik"
                              : "kasa",
                        )
                      }
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      İlgili Sekmeye Git
                    </button>
                  )}
                </div>

                {quickActions.length > 0 && (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
                      Tek Tık Aksiyon
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickActions.map((quickAction) => (
                        <button
                          key={quickAction.id}
                          type="button"
                          onClick={() => handleQuickAction(quickAction)}
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${
                            quickAction.kind === "whatsapp"
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : quickAction.kind === "google_open"
                                ? "bg-blue-600 text-white hover:bg-blue-500"
                                : "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                          }`}
                        >
                          {quickAction.label}
                        </button>
                      ))}
                    </div>
                    {quickActions[0]?.hint && (
                      <p className="mt-2 text-xs text-indigo-700">
                        {quickActions[0].hint}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}