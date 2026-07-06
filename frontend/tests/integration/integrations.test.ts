import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appointmentToCalendarEvent,
  buildGoogleProfileSuggestions,
  buildIcsFileContent,
  buildWhatsAppTemplateSendPlan,
} from "../../lib/integrations";
import type { Appointment, Business } from "../../lib/domain-types";

describe("integrations layer", () => {
  const business: Business = {
    id: "biz-1",
    name: "Yıldız Kuaför",
    industry: "Kuaför & Güzellik Salonu",
    city: "Düzce",
    address: "Merkez Mah. No:5",
    whatsapp_number: "0555 111 22 33",
    working_hours: "09:00-19:00",
  };

  it("builds google profile suggestions for pending checklist items", () => {
    const suggestions = buildGoogleProfileSuggestions(business, {
      completedItemIds: ["profile-claimed"],
    });

    assert.ok(suggestions.length > 0);
    assert.ok(
      suggestions.some((item) => item.checklistItemId === "description-written"),
    );
    assert.match(
      suggestions.find((item) => item.checklistItemId === "contact-complete")
        ?.suggestedText || "",
      /Adres:/,
    );
  });

  it("maps appointments to calendar events and ics output", () => {
    const appointment: Appointment = {
      id: "apt-1",
      customerName: "Ayşe",
      service: "Saç kesimi",
      startsAt: "2026-07-10T10:00:00.000Z",
      status: "planlandi",
      createdAt: "2026-07-01T10:00:00.000Z",
    };

    const event = appointmentToCalendarEvent(appointment, business);
    assert.match(event.title, /Saç kesimi/);
    const ics = buildIcsFileContent([event], business.name);
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /SUMMARY:Saç kesimi/);
  });

  it("assesses whatsapp template readiness with fallback blockers", () => {
    const plan = buildWhatsAppTemplateSendPlan(business, [
      {
        id: 1,
        name: "Randevu Hatırlatma",
        text: "Yarın randevunuz var.",
        created_at: "2026-07-01T10:00:00.000Z",
      },
    ]);

    assert.equal(plan.length, 1);
    assert.equal(plan[0].ready, true);
    assert.equal(plan[0].suggestedCategory, "utility");
    assert.ok(plan[0].blockers.some((item) => item.includes("Meta Business")));
  });
});