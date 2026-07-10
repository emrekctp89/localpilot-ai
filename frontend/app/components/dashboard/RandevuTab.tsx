"use client";

import { useEffect, useMemo, useState } from "react";
import type { Appointment, Business } from "@/lib/domain-types";
import {
  appointmentToCalendarEvent,
  buildGoogleCalendarUrl,
  exportAppointmentsToCalendar,
  getGoogleCalendarIntegrationStatus,
  readCalendarSyncState,
  writeCalendarSyncState,
} from "@/lib/integrations";
import { listAppointments, saveAppointments } from "@/lib/repositories";
import EmptyState from "./EmptyState";

interface RandevuTabProps {
  business: Business;
}

const EMPTY_FORM = {
  customerName: "",
  phone: "",
  service: "",
  date: "",
  time: "",
  notes: "",
};

const statusLabels: Record<Appointment["status"], string> = {
  planlandi: "Planlandı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};

export default function RandevuTab({ business }: RandevuTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState<"yaklasan" | "tum" | "gecmis">(
    "yaklasan",
  );
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [referenceTime] = useState(() => Date.now());
  const [calendarSyncState, setCalendarSyncState] = useState(
    readCalendarSyncState(business.id || "preview"),
  );
  const calendarIntegration = getGoogleCalendarIntegrationStatus();

  useEffect(() => {
    const loadAppointments = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      const storedAppointments = await listAppointments(business.id);
      setAppointments(
        storedAppointments.sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      );
      setLoading(false);
    };

    loadAppointments();
  }, [business.id]);

  const persistAppointments = async (nextAppointments: Appointment[]) => {
    if (!business.id) return false;
    setSaveStatus("saving");

    const saved = await saveAppointments(business.id, nextAppointments);
    if (!saved) {
      setSaveStatus("error");
      return false;
    }

    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const updateAppointments = async (nextAppointments: Appointment[]) => {
    const previousAppointments = appointments;
    const sortedAppointments = [...nextAppointments].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    setAppointments(sortedAppointments);

    const saved = await persistAppointments(sortedAppointments);
    if (!saved) setAppointments(previousAppointments);
    return saved;
  };

  const handleAddAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customerName || !form.service || !form.date || !form.time) return;

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      customerName: form.customerName.trim(),
      phone: form.phone.trim() || undefined,
      service: form.service.trim(),
      startsAt: new Date(`${form.date}T${form.time}`).toISOString(),
      notes: form.notes.trim() || undefined,
      status: "planlandi",
      createdAt: new Date().toISOString(),
    };

    const saved = await updateAppointments([...appointments, appointment]);
    if (saved) setForm(EMPTY_FORM);
  };

  const handleStatusChange = (
    appointmentId: string,
    status: Appointment["status"],
  ) =>
    updateAppointments(
      appointments.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, status }
          : appointment,
      ),
    );

  const handleDelete = (appointmentId: string) =>
    updateAppointments(
      appointments.filter(
        (appointment) => appointment.id !== appointmentId,
      ),
    );

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (filter === "tum") return true;
        const appointmentTime = new Date(appointment.startsAt).getTime();
        return filter === "yaklasan"
          ? appointmentTime >= referenceTime
          : appointmentTime < referenceTime;
      }),
    [appointments, filter, referenceTime],
  );
  const upcomingCount = appointments.filter(
    (appointment) =>
      appointment.status === "planlandi" &&
      new Date(appointment.startsAt).getTime() >= referenceTime,
  ).length;
  const today = new Date(referenceTime).toLocaleDateString("en-CA");
  const todayCount = appointments.filter(
    (appointment) =>
      new Date(appointment.startsAt).toLocaleDateString("en-CA") === today,
  ).length;
  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "planlandi" &&
      new Date(appointment.startsAt).getTime() >= referenceTime,
  );

  const recordCalendarSync = (exportedCount: number, mode: "ics_export" | "google_url") => {
    if (!business.id) return;
    const nextState = {
      provider: "google_calendar" as const,
      lastSyncedAt: new Date().toISOString(),
      exportedCount,
      mode,
    };
    writeCalendarSyncState(business.id, nextState);
    setCalendarSyncState(nextState);
  };

  const handleExportUpcomingIcs = () => {
    const result = exportAppointmentsToCalendar(
      upcomingAppointments,
      business,
      "ics_export",
    );
    recordCalendarSync(result.exportedCount, result.mode);
  };

  const handleOpenInGoogleCalendar = (appointment: Appointment) => {
    const event = appointmentToCalendarEvent(appointment, business);
    window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
    recordCalendarSync(1, "google_url");
  };

  if (loading) {
    return (
      <div className="lp-card p-12 text-center text-sm font-medium text-slate-500">
        Randevular yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-slate-900 p-5 text-white shadow-lg sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-teal-100">
              Operasyon Merkezi
            </p>
            <h2 className="mt-2 text-3xl font-black">Randevu Yönetimi</h2>
            <p className="mt-2 text-sm text-teal-100">
              Müşteri randevularını planlayın ve sonuçlarını tek yerden takip
              edin.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
              <p className="text-2xl font-black">{todayCount}</p>
              <p className="text-xs font-bold text-teal-100">Bugün</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
              <p className="text-2xl font-black">{upcomingCount}</p>
              <p className="text-xs font-bold text-teal-100">Yaklaşan</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
              Google Calendar Sync
            </p>
            <h3 className="mt-1 text-lg font-black text-gray-900">
              {calendarIntegration.label}
            </h3>
            <p className="mt-2 text-sm text-cyan-900">
              {calendarIntegration.detail}
            </p>
            {calendarSyncState?.lastSyncedAt && (
              <p className="mt-2 text-xs font-medium text-cyan-800">
                Son dışa aktarma:{" "}
                {new Date(calendarSyncState.lastSyncedAt).toLocaleString("tr-TR")}{" "}
                ({calendarSyncState.exportedCount} randevu)
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleExportUpcomingIcs}
            disabled={upcomingAppointments.length === 0}
            className="lp-btn-primary bg-cyan-700 shadow-cyan-700/20 hover:bg-cyan-800"
          >
            Yaklaşan Randevuları ICS İndir
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleAddAppointment}
          className="lp-card space-y-3 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-gray-900">Yeni Randevu</h3>
            <span className="text-xs font-bold text-gray-400">
              {saveStatus === "saving" && "Kaydediliyor..."}
              {saveStatus === "saved" && "Kaydedildi"}
              {saveStatus === "error" && "Kaydedilemedi"}
            </span>
          </div>
          <input
            required
            value={form.customerName}
            onChange={(event) =>
              setForm({ ...form, customerName: event.target.value })
            }
            placeholder="Müşteri adı"
            className="lp-input"
          />
          <input
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
            placeholder="Telefon"
            className="lp-input"
          />
          <input
            required
            value={form.service}
            onChange={(event) =>
              setForm({ ...form, service: event.target.value })
            }
            placeholder="Hizmet / görüşme konusu"
            className="lp-input"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
              className="lp-input"
            />
            <input
              required
              type="time"
              value={form.time}
              onChange={(event) =>
                setForm({ ...form, time: event.target.value })
              }
              className="lp-input"
            />
          </div>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="Notlar"
            className="lp-input resize-none"
          />
          <button
            type="submit"
            disabled={saveStatus === "saving"}
            className="lp-btn-primary lp-btn-block bg-teal-600 shadow-teal-600/20 hover:bg-teal-700"
          >
            Randevuyu Kaydet
          </button>
        </form>

        <div className="lp-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Randevu Takvimi
              </h3>
              <p className="text-sm text-gray-500">
                {filteredAppointments.length} kayıt gösteriliyor.
              </p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1">
              {[
                ["yaklasan", "Yaklaşan"],
                ["tum", "Tümü"],
                ["gecmis", "Geçmiş"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(value as "yaklasan" | "tum" | "gecmis")
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    filter === value
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Bu görünümde randevu yok"
              description="Yeni randevuyu soldaki formdan ekleyebilirsiniz."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {filteredAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-gray-900">
                        {appointment.customerName}
                      </h4>
                      <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-bold text-teal-700">
                        {statusLabels[appointment.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-gray-600">
                      {appointment.service}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(appointment.startsAt).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {appointment.phone ? ` · ${appointment.phone}` : ""}
                    </p>
                    {appointment.notes && (
                      <p className="mt-2 text-sm text-gray-500">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInGoogleCalendar(appointment)}
                      className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-50"
                    >
                      Takvime Ekle
                    </button>
                    <select
                      value={appointment.status}
                      onChange={(event) =>
                        handleStatusChange(
                          appointment.id,
                          event.target.value as Appointment["status"],
                        )
                      }
                      disabled={saveStatus === "saving"}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
                    >
                      <option value="planlandi">Planlandı</option>
                      <option value="tamamlandi">Tamamlandı</option>
                      <option value="iptal">İptal</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(appointment.id)}
                      disabled={saveStatus === "saving"}
                      className="rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
