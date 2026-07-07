"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listSectorWorkflowItems,
  listStaffTasks,
  saveSectorWorkflowItems,
  saveStaffTasks,
} from "@/lib/repositories";
import { buildSectorAutomationExecutable } from "@/lib/sector-automation-triggers";
import { triggerBusinessWebhooks } from "@/lib/platform/webhooks";
import {
  computePackMetricCards,
  getActiveSectorAutomations,
  getSectorAutomationEmptyHint,
  resolveSectorPack,
} from "@/lib/sector-packs";
import type { Business, SectorWorkflowItem } from "@/lib/domain-types";

interface SektorIsAkisiTabProps {
  business: Business;
}

export default function SektorIsAkisiTab({
  business,
}: SektorIsAkisiTabProps) {
  const pack = resolveSectorPack(business);
  const [items, setItems] = useState<SectorWorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [applyingAutomationId, setApplyingAutomationId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState({
    title: "",
    customer: "",
    detail: "",
    value: "",
  });

  useEffect(() => {
    const loadItems = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      const storedItems = await listSectorWorkflowItems(business.id, pack.id);
      setItems(storedItems);
      setLoading(false);
    };

    loadItems();
  }, [business.id, pack.id]);

  const persistItems = async (nextItems: SectorWorkflowItem[]) => {
    if (!business.id) return false;
    setSaveStatus("saving");

    const saved = await saveSectorWorkflowItems(
      business.id,
      pack.id,
      nextItems,
    );
    if (!saved) {
      setSaveStatus("error");
      return false;
    }

    setItems(nextItems);
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.customer.trim()) return;

    const item: SectorWorkflowItem = {
      id: crypto.randomUUID(),
      packId: pack.id,
      title: form.title.trim(),
      customer: form.customer.trim(),
      detail: form.detail.trim() || undefined,
      value: form.value ? Number(form.value) : undefined,
      stage: pack.stages[0].id,
      createdAt: new Date().toISOString(),
    };
    const saved = await persistItems([item, ...items]);
    if (saved) setForm({ title: "", customer: "", detail: "", value: "" });
  };

  const handleStageChange = (itemId: string, stage: string) =>
    persistItems(
      items.map((item) => (item.id === itemId ? { ...item, stage } : item)),
    );

  const handleDelete = (itemId: string) =>
    persistItems(items.filter((item) => item.id !== itemId));

  const stageCounts = useMemo(
    () =>
      pack.stages.map((stage) => ({
        ...stage,
        count: items.filter((item) => item.stage === stage.id).length,
      })),
    [items, pack.stages],
  );
  const completedStage = pack.stages[pack.stages.length - 1].id;
  const completedValue = items
    .filter((item) => item.stage === completedStage)
    .reduce((sum, item) => sum + Number(item.value || 0), 0);
  const metricCards = useMemo(
    () => computePackMetricCards(pack, items),
    [items, pack],
  );
  const automationSuggestions = useMemo(
    () => getActiveSectorAutomations(pack, items),
    [items, pack],
  );
  const automationEmptyHint = useMemo(
    () => getSectorAutomationEmptyHint(pack, items),
    [items, pack],
  );

  const handleApplyAutomation = async (
    automation: (typeof automationSuggestions)[number],
  ) => {
    if (!business.id) return;

    const executable = buildSectorAutomationExecutable(
      pack,
      automation,
      business,
      items,
    );
    if (!executable) return;

    setApplyingAutomationId(automation.id);

    try {
      if (executable.channel === "task" && executable.task) {
        const existingTasks = await listStaffTasks(business.id);
        await saveStaffTasks(business.id, [executable.task, ...existingTasks]);
      } else if (executable.whatsappUrl) {
        window.open(executable.whatsappUrl, "_blank", "noopener,noreferrer");
      }

      await triggerBusinessWebhooks({
        businessId: business.id,
        event: "sector.automation.triggered",
        data: {
          automation_id: executable.automationId,
          title: executable.title,
          channel: executable.channel,
          affected_customers: executable.affectedCustomers,
          message: executable.message,
        },
      });
    } finally {
      setApplyingAutomationId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center font-medium text-gray-500">
        Sektörel iş akışı yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="rounded-2xl bg-gradient-to-r from-cyan-700 to-teal-700 p-6 text-white shadow-lg md:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-100">
          Sektör Paketi
        </p>
        <h2 className="mt-2 text-3xl font-black">{pack.name}</h2>
        <p className="mt-2 text-sm text-cyan-100">
          İşletmenizin kendi çalışma sürecine göre uyarlanmış operasyon akışı.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {stageCounts.map((stage) => (
            <span
              key={stage.id}
              className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold"
            >
              {stage.label}: {stage.count}
            </span>
          ))}
          <span className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">
            {pack.metricLabel}: {completedValue.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <article
            key={metric.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">
              {metric.label}
            </p>
            <p className="mt-2 text-3xl font-black text-gray-900">
              {metric.displayValue}
            </p>
          </article>
        ))}
      </section>

      {automationSuggestions.length > 0 ? (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                Sektör Otomasyonları
              </p>
              <h3 className="mt-1 text-lg font-black text-amber-950">
                Şu an uygulanabilir öneriler
              </h3>
            </div>
            <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-amber-800">
              {automationSuggestions.length} kural aktif
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {automationSuggestions.map((automation) => {
              const executable = buildSectorAutomationExecutable(
                pack,
                automation,
                business,
                items,
              );

              return (
              <article
                key={automation.id}
                className="rounded-2xl border border-amber-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-gray-900">
                      {automation.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      {automation.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
                    {automation.affectedCount}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-amber-900">
                  {automation.suggestedAction}
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyAutomation(automation)}
                  disabled={applyingAutomationId === automation.id}
                  className="mt-4 rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {applyingAutomationId === automation.id
                    ? "Uygulanıyor..."
                    : executable?.label || "Uygula"}
                </button>
              </article>
            );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">
            Sektör Otomasyonları
          </p>
          <h3 className="mt-1 text-lg font-black text-gray-900">
            Şu an aktif öneri yok
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {automationEmptyHint ||
              "Kayıt ekleyip ilk aşamada bıraktığınızda otomasyon önerileri burada görünür."}
          </p>
          <p className="mt-3 text-xs font-semibold text-gray-500">
            Paket: {pack.name} · {items.length} kayıt · İlk aşama:{" "}
            {pack.stages[0]?.label}
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-gray-900">Yeni {pack.itemName}</h3>
            <span className="text-xs font-bold text-gray-400">
              {saveStatus === "saving" && "Kaydediliyor..."}
              {saveStatus === "saved" && "Kaydedildi"}
              {saveStatus === "error" && "Kaydedilemedi"}
            </span>
          </div>
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder={pack.titleLabel}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-cyan-500"
          />
          <input
            required
            value={form.customer}
            onChange={(event) =>
              setForm({ ...form, customer: event.target.value })
            }
            placeholder={pack.customerLabel}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-cyan-500"
          />
          <textarea
            rows={3}
            value={form.detail}
            onChange={(event) =>
              setForm({ ...form, detail: event.target.value })
            }
            placeholder={pack.detailLabel}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-cyan-500"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={(event) =>
              setForm({ ...form, value: event.target.value })
            }
            placeholder={pack.valueLabel}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={saveStatus === "saving"}
            className="w-full rounded-xl bg-cyan-700 py-3 font-bold text-white hover:bg-cyan-800 disabled:bg-gray-400"
          >
            Kaydı Oluştur
          </button>
        </form>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-black text-gray-900">{pack.itemName} Akışı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {items.length} kayıt süreçte.
          </p>

          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Bu sektör akışında henüz kayıt yok.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-black text-gray-900">{item.title}</h4>
                      <p className="mt-1 text-sm font-bold text-gray-600">
                        {item.customer}
                      </p>
                      {item.detail && (
                        <p className="mt-2 text-sm text-gray-500">
                          {item.detail}
                        </p>
                      )}
                      {item.value !== undefined && (
                        <p className="mt-2 text-sm font-black text-cyan-700">
                          {item.value.toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={item.stage}
                        onChange={(event) =>
                          handleStageChange(item.id, event.target.value)
                        }
                        disabled={saveStatus === "saving"}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
                      >
                        {pack.stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={saveStatus === "saving"}
                        className="rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
