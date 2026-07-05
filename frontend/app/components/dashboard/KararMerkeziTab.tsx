"use client";

import { useEffect, useState } from "react";
import {
  createApprovedTaskAutomation,
  generateRecommendation,
  measureDecisionOutcome,
} from "@/lib/business-os";
import type {
  Business,
  DecisionCycle,
  MiniSiteData,
  StaffTask,
} from "@/lib/domain-types";
import {
  listDecisionCycles,
  loadOperationalSnapshot,
  saveDecisionCycles,
  saveStaffTasks,
} from "@/lib/repositories";

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
  const [miniSiteData, setMiniSiteData] = useState<MiniSiteData>({});
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

      const [snapshot, storedCycles] = await Promise.all([
        loadOperationalSnapshot(business.id),
        listDecisionCycles(business.id),
      ]);

      setMiniSiteData(snapshot);
      setCycles(storedCycles);
      setLoading(false);
    };

    loadDecisionData();
  }, [business.id]);

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

    setMiniSiteData((current) => ({ ...current, ...additionalData }));
    setCycles(nextCycles);
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const handleAnalyze = () => {
    const recommendation = generateRecommendation(
      miniSiteData,
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

  const handleApprove = (cycleId: string) =>
    updateCycle(cycleId, {
      status: "onaylandi",
      approvedAt: new Date().toISOString(),
    });

  const handleAutomate = (cycle: DecisionCycle) => {
    const existingTasks = Array.isArray(miniSiteData.tasks)
      ? (miniSiteData.tasks as StaffTask[])
      : [];
    const automation = createApprovedTaskAutomation(
      cycle,
      existingTasks,
      referenceTime,
    );
    const nextCycles = cycles.map((item) =>
      item.id === cycle.id ? automation.cycle : item,
    );

    persistCycles(nextCycles, { tasks: automation.tasks });
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

  const measuredCount = cycles.filter(
    (cycle) => cycle.status === "olculdu",
  ).length;
  const successCount = cycles.filter(
    (cycle) => cycle.result === "basarili",
  ).length;

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
            {cycles.length} karar döngüsü
          </span>
          <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">
            {measuredCount} ölçüm · {successCount} başarılı
          </span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ["Veri", "Operasyon kayıtları"],
          ["Analiz", "Risk ve fırsat"],
          ["Onay", "İnsan kontrolü"],
          ["Otomasyon", "Göreve dönüşüm"],
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

      {cycles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-12 text-center">
          <h3 className="font-black text-gray-900">Henüz karar döngüsü yok.</h3>
          <p className="mt-2 text-sm text-gray-500">
            İlk öneriyi üretmek için mevcut işletme verilerini analiz edin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => (
            <article
              key={cycle.id}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    {statusLabels[cycle.status]}
                  </span>
                  <p className="mt-3 text-sm font-bold text-gray-500">
                    {cycle.signal}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-gray-900">
                    {cycle.recommendation}
                  </h3>
                </div>
                {typeof cycle.confidenceScore === "number" && (
                  <span className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                    %{cycle.confidenceScore} güven
                  </span>
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
                    Onayla
                  </button>
                )}
                {cycle.status === "onaylandi" && (
                  <button
                    type="button"
                    onClick={() => handleAutomate(cycle)}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
                  >
                    Göreve Dönüştür
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}