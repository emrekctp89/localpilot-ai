"use client";

import { useEffect, useMemo, useState } from "react";
import type { Business, StaffTask } from "@/lib/domain-types";
import { listStaffTasks, saveStaffTasks } from "@/lib/repositories";

interface GorevlerTabProps {
  business: Business;
}

const EMPTY_FORM = {
  title: "",
  assignee: "",
  dueDate: "",
  priority: "normal" as StaffTask["priority"],
  notes: "",
};

const statusLabels: Record<StaffTask["status"], string> = {
  bekliyor: "Bekliyor",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
};

const priorityLabels: Record<StaffTask["priority"], string> = {
  dusuk: "Düşük",
  normal: "Normal",
  yuksek: "Yüksek",
};

export default function GorevlerTab({ business }: GorevlerTabProps) {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState<"acik" | "tum" | "tamamlanan">("acik");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [referenceTime] = useState(() => Date.now());

  useEffect(() => {
    const loadTasks = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      const storedTasks = await listStaffTasks(business.id);
      setTasks(storedTasks);
      setLoading(false);
    };

    loadTasks();
  }, [business.id]);

  const persistTasks = async (nextTasks: StaffTask[]) => {
    if (!business.id) return false;
    setSaveStatus("saving");

    const saved = await saveStaffTasks(business.id, nextTasks);
    if (!saved) {
      setSaveStatus("error");
      return false;
    }

    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const updateTasks = async (nextTasks: StaffTask[]) => {
    const previousTasks = tasks;
    setTasks(nextTasks);
    const saved = await persistTasks(nextTasks);
    if (!saved) setTasks(previousTasks);
    return saved;
  };

  const handleAddTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.assignee) return;

    const task: StaffTask = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      assignee: form.assignee.trim(),
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      status: "bekliyor",
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await updateTasks([task, ...tasks]);
    if (saved) setForm(EMPTY_FORM);
  };

  const handleStatusChange = (
    taskId: string,
    status: StaffTask["status"],
  ) =>
    updateTasks(
      tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );

  const handleDelete = (taskId: string) =>
    updateTasks(tasks.filter((task) => task.id !== taskId));

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (filter === "tum") return true;
        if (filter === "tamamlanan") return task.status === "tamamlandi";
        return task.status !== "tamamlandi";
      }),
    [filter, tasks],
  );
  const openCount = tasks.filter(
    (task) => task.status !== "tamamlandi",
  ).length;
  const overdueCount = tasks.filter(
    (task) =>
      task.status !== "tamamlandi" &&
      task.dueDate &&
      new Date(`${task.dueDate}T23:59:59`).getTime() < referenceTime,
  ).length;
  const completedCount = tasks.filter(
    (task) => task.status === "tamamlandi",
  ).length;

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center font-medium text-gray-500">
        Görevler yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-gray-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-300">
              Operasyon Merkezi
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Görev ve Personel Planlama
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Günlük işleri atayın, önceliklendirin ve tamamlanma durumunu takip
              edin.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-black">{openCount}</p>
              <p className="text-xs font-bold text-gray-300">Açık</p>
            </div>
            <div className="rounded-xl bg-red-500/20 px-4 py-3 text-center">
              <p className="text-2xl font-black">{overdueCount}</p>
              <p className="text-xs font-bold text-red-100">Geciken</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 px-4 py-3 text-center">
              <p className="text-2xl font-black">{completedCount}</p>
              <p className="text-xs font-bold text-emerald-100">Tamamlanan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleAddTask}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-gray-900">Yeni Görev</h3>
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
            placeholder="Görev başlığı"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-slate-500"
          />
          <input
            required
            value={form.assignee}
            onChange={(event) =>
              setForm({ ...form, assignee: event.target.value })
            }
            placeholder="Sorumlu kişi"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-slate-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm({ ...form, dueDate: event.target.value })
              }
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:border-slate-500"
            />
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({
                  ...form,
                  priority: event.target.value as StaffTask["priority"],
                })
              }
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold text-gray-700"
            >
              <option value="dusuk">Düşük Öncelik</option>
              <option value="normal">Normal Öncelik</option>
              <option value="yuksek">Yüksek Öncelik</option>
            </select>
          </div>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="Görev notları"
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            disabled={saveStatus === "saving"}
            className="w-full rounded-xl bg-slate-800 py-3 font-bold text-white transition hover:bg-slate-700 disabled:bg-gray-400"
          >
            Görevi Kaydet
          </button>
        </form>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Günlük İş Planı
              </h3>
              <p className="text-sm text-gray-500">
                {filteredTasks.length} görev gösteriliyor.
              </p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1">
              {[
                ["acik", "Açık"],
                ["tum", "Tümü"],
                ["tamamlanan", "Tamamlanan"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(value as "acik" | "tum" | "tamamlanan")
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    filter === value
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-bold text-gray-700">
                Bu görünümde görev yok.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Yeni görevi soldaki formdan ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.status !== "tamamlandi" &&
                  task.dueDate &&
                  new Date(`${task.dueDate}T23:59:59`).getTime() <
                    referenceTime;

                return (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-gray-900">
                            {task.title}
                          </h4>
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                            {priorityLabels[task.priority]}
                          </span>
                          {isOverdue && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-600">
                              Gecikti
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-gray-600">
                          Sorumlu: {task.assignee}
                        </p>
                        {task.dueDate && (
                          <p className="mt-1 text-xs text-gray-400">
                            Son tarih:{" "}
                            {new Date(
                              `${task.dueDate}T12:00:00`,
                            ).toLocaleDateString("tr-TR")}
                          </p>
                        )}
                        {task.notes && (
                          <p className="mt-2 text-sm text-gray-500">
                            {task.notes}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600">
                        {statusLabels[task.status]}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 border-t border-gray-200 pt-3 sm:grid-cols-[1fr_auto]">
                      <select
                        value={task.status}
                        onChange={(event) =>
                          handleStatusChange(
                            task.id,
                            event.target.value as StaffTask["status"],
                          )
                        }
                        disabled={saveStatus === "saving"}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
                      >
                        <option value="bekliyor">Bekliyor</option>
                        <option value="devam_ediyor">Devam Ediyor</option>
                        <option value="tamamlandi">Tamamlandı</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        disabled={saveStatus === "saving"}
                        className="rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
