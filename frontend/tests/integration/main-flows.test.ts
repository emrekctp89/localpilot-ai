import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyApprovedAutomation,
  createApprovedTaskAutomation,
  isActionApproved,
} from "../../lib/business-os";
import type { DecisionCycle, StaffTask } from "../../lib/domain-types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("main flows smoke (Faz D · checklist §6)", () => {
  it("wires appointment create/update/delete through repository layer", () => {
    const source = readSource("app/components/dashboard/RandevuTab.tsx");
    assert.match(source, /listAppointments/);
    assert.match(source, /saveAppointments/);
    assert.match(source, /Randevuyu Kaydet/);
    assert.match(source, /handleDelete/);
  });

  it("wires order create and payment status updates", () => {
    const source = readSource("app/components/dashboard/SiparisTab.tsx");
    assert.match(source, /listOrders/);
    assert.match(source, /saveOrders/);
    assert.match(source, /paymentStatus/);
  });

  it("wires CRM customer and follow-up persistence", () => {
    const crmSource = readSource("app/components/dashboard/CrmTab.tsx");
    assert.match(crmSource, /saveCustomerFollowUps/);
    assert.match(crmSource, /followUpDate/);
    assert.match(crmSource, /Müşteri/);
  });

  it("wires AI campaign generation entry point", () => {
    const aiSource = readSource("app/components/dashboard/AiAraclarTab.tsx");
    const dashboardSource = readSource("app/dashboard/page.tsx");
    assert.match(aiSource, /handleGenerateCampaigns/);
    assert.match(dashboardSource, /campaignsApi/);
    assert.match(dashboardSource, /handleGenerateCampaigns/);
  });

  it("wires mini site publish and lead capture to CRM webhook", () => {
    const settingsSource = readSource("app/components/dashboard/AyarlarTab.tsx");
    const leadSource = readSource("app/site/[id]/LeadForm.tsx");
    const sitePage = readSource("app/site/[id]/page.tsx");
    assert.match(settingsSource, /publish_status/);
    assert.match(settingsSource, /handlePublishStatusChange/);
    assert.match(leadSource, /triggerBusinessWebhooks/);
    assert.match(leadSource, /lead\.created/);
    assert.match(leadSource, /isValidLeadPhone/);
    assert.match(sitePage, /MiniSiteStickyCta/);
    assert.match(sitePage, /MiniSiteShare/);
    assert.match(sitePage, /MiniSiteTopBar/);
    assert.match(sitePage, /mapsHref|google\.com\/maps/);
    assert.match(sitePage, /loadPublicMiniSite|loadMiniSiteContext/);
  });

  it("approving a decision cycle can create a staff task", () => {
    const cycle: DecisionCycle = {
      id: "cycle-1",
      recommendationKey: "overdue_tasks",
      signal: "2 geciken görev",
      analysis: "Operasyon birikiyor",
      recommendation: "Geciken görevleri önceliklendir",
      expectedResult: "Gecikmeyi azalt",
      metric: "Geciken görev",
      status: "onaylandi",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const existingTasks: StaffTask[] = [];
    assert.equal(isActionApproved(cycle, "create_task"), true);

    const automation = createApprovedTaskAutomation(
      cycle,
      existingTasks,
      Date.now(),
    );

    assert.equal(automation.cycle.status, "otomasyonda");
    assert.ok(automation.task.id);
    assert.equal(automation.tasks.length, 1);

    const applied = applyApprovedAutomation(cycle, existingTasks, Date.now());
    assert.equal(applied.cycle.status, "otomasyonda");
    assert.ok(applied.tasks?.length);
  });

  it("documents E2E specs for live appointment and decision flows", () => {
    const appointmentE2E = readSource("e2e/appointment.spec.ts");
    const decisionE2E = readSource("e2e/decision-center.spec.ts");
    assert.match(appointmentE2E, /creates a new appointment/);
    assert.match(decisionE2E, /generates a recommendation cycle/);
  });

  it("maps checklist §6 items in production-checklist", () => {
    const checklist = readFileSync(
      join(root, "../docs/production-checklist.md"),
      "utf8",
    );
    assert.match(checklist, /## 6\. Ana akışlar/);
    assert.match(checklist, /Randevu oluştur/);
    assert.match(checklist, /Karar Merkezi öneri onayla/);
  });
});