import type { Appointment, Business } from "../domain-types";
import type { CalendarSyncEvent, CalendarSyncState, IntegrationStatus } from "./types";

const CALENDAR_SYNC_STORAGE_PREFIX = "localpilot-calendar-sync-";
const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

export function getGoogleCalendarIntegrationStatus(): IntegrationStatus {
  return {
    provider: "google_calendar",
    status: "ready",
    label: "ICS + Google URL senkronu",
    detail:
      "Randevular ICS dosyası veya Google Calendar bağlantısı ile dışa aktarılabilir. OAuth iki yönlü sync sonraki fazda.",
  };
}

export function getCalendarSyncStorageKey(businessId: string) {
  return `${CALENDAR_SYNC_STORAGE_PREFIX}${businessId}`;
}

export function readCalendarSyncState(
  businessId: string,
): CalendarSyncState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getCalendarSyncStorageKey(businessId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalendarSyncState;
  } catch {
    return null;
  }
}

export function writeCalendarSyncState(
  businessId: string,
  state: CalendarSyncState,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getCalendarSyncStorageKey(businessId),
    JSON.stringify(state),
  );
}

export function appointmentToCalendarEvent(
  appointment: Appointment,
  business: Business,
): CalendarSyncEvent {
  const startsAt = new Date(appointment.startsAt);
  const endsAt = new Date(startsAt.getTime() + DEFAULT_EVENT_DURATION_MS);
  const location = business.address || business.city || undefined;

  return {
    id: appointment.id,
    title: `${appointment.service} — ${appointment.customerName}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    description: [
      `Müşteri: ${appointment.customerName}`,
      appointment.phone ? `Telefon: ${appointment.phone}` : "",
      appointment.notes ? `Not: ${appointment.notes}` : "",
      `Durum: ${appointment.status}`,
      business.name ? `İşletme: ${business.name}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    location,
  };
}

function formatIcsDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsFileContent(
  events: CalendarSyncEvent[],
  businessName?: string,
) {
  const calendarName = businessName
    ? `${businessName} Randevuları`
    : "LocalPilot Randevuları";

  const body = events
    .map((event) => {
      return [
        "BEGIN:VEVENT",
        `UID:${event.id}@localpilot.ai`,
        `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
        `DTSTART:${formatIcsDate(event.startsAt)}`,
        `DTEND:${formatIcsDate(event.endsAt)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.description)}`,
        event.location ? `LOCATION:${escapeIcsText(event.location)}` : "",
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LocalPilot AI//TR",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    body,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(event: CalendarSyncEvent) {
  const start = formatIcsDate(event.startsAt).replace("Z", "Z");
  const end = formatIcsDate(event.endsAt).replace("Z", "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function exportAppointmentsToCalendar(
  appointments: Appointment[],
  business: Business,
  mode: CalendarSyncState["mode"],
) {
  const events = appointments.map((appointment) =>
    appointmentToCalendarEvent(appointment, business),
  );

  if (mode === "google_url" && events[0]) {
    window.open(buildGoogleCalendarUrl(events[0]), "_blank", "noopener,noreferrer");
    return { exportedCount: 1, mode };
  }

  const content = buildIcsFileContent(events, business.name);
  downloadIcsFile(
    `${(business.name || "localpilot").replace(/\s+/g, "-").toLowerCase()}-randevular.ics`,
    content,
  );
  return { exportedCount: events.length, mode: "ics_export" as const };
}