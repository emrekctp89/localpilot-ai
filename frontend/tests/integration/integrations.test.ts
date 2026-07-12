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

  it("infers google checklist from real business website fields", async () => {
    const { inferGoogleChecklistFromBusiness } = await import(
      "../../lib/integrations/google-business"
    );
    const ids = inferGoogleChecklistFromBusiness(
      {
        name: "Demo Kuaför",
        city: "İstanbul",
        address: "Kadıköy Mah. 1",
        whatsapp_number: "05551234567",
        working_hours: "09:00-19:00",
        industry: "Kuaför & Güzellik Salonu",
        top_products: "Saç kesimi, Boya, Bakım",
      },
      {
        aboutUs: "2010'dan beri Kadıköy'de profesyonel saç ve güzellik hizmeti sunuyoruz.",
        currentDigitalStatus: ["Google Haritalarda Varız"],
        hasWebsite: true,
      },
    );
    assert.ok(ids.includes("contact-complete"));
    assert.ok(ids.includes("category-selected"));
    assert.ok(ids.includes("description-written"));
    assert.ok(ids.includes("products-added"));
    assert.ok(ids.includes("review-link-ready"));
    assert.ok(ids.includes("profile-claimed"));
  });

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
    assert.ok(
      plan[0].blockers.some((item) => item.includes("Cloud API")),
    );
  });
});