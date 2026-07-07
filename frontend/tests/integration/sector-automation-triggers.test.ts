import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSectorAutomationExecutable } from "../../lib/sector-automation-triggers";
import {
  getActiveSectorAutomations,
  resolveSectorPack,
} from "../../lib/sector-packs";
import type { Business, SectorWorkflowItem } from "../../lib/domain-types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const business: Business = {
  id: "biz-1",
  name: "Yıldız Kuaför",
  industry: "Kuaför & Güzellik Salonu",
  whatsapp_number: "0555 111 22 33",
};

const items: SectorWorkflowItem[] = [
  {
    id: "sw-1",
    packId: "salon",
    title: "Saç kesimi",
    customer: "Ayşe",
    stage: "randevu",
    createdAt: "2026-07-01T10:00:00.000Z",
  },
];

describe("sector automation triggers (Faz D)", () => {
  it("builds WhatsApp executable for active salon automation", () => {
    const pack = resolveSectorPack(business);
    const automations = getActiveSectorAutomations(pack, items);
    assert.ok(automations.length > 0);

    const executable = buildSectorAutomationExecutable(
      pack,
      automations[0],
      business,
      items,
    );

    assert.ok(executable);
    assert.equal(executable?.channel, "whatsapp");
    assert.ok(executable?.whatsappUrl);
    assert.match(executable?.message || "", /Ayşe/);
  });

  it("exports cron script and workflow", () => {
    const script = readFileSync(
      join(root, "scripts/sector-automation-cron.ts"),
      "utf8",
    );
    assert.match(script, /sector\.automation\.triggered/);

    const workflow = readFileSync(
      join(root, "../.github/workflows/sector-automation-cron.yml"),
      "utf8",
    );
    assert.match(workflow, /SECTOR_AUTOMATION_CRON_ENABLED/);
  });

  it("activates auto gallery automation for stokta-stage items", () => {
    const galleryBusiness: Business = {
      id: "biz-3",
      name: "Yıldız Oto",
      industry: "Otomotiv & Galeri",
      whatsapp_number: "0555 444 33 22",
    };
    const pack = resolveSectorPack(galleryBusiness);
    assert.equal(pack.id, "auto_gallery");

    const automations = getActiveSectorAutomations(pack, [
      {
        id: "sw-3",
        packId: "auto_gallery",
        title: "2020 BMW 320i",
        customer: "Ali",
        stage: "stokta",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
    ]);

    assert.ok(automations.some((item) => item.id === "auto_gallery_new_stock"));
  });

  it("activates generic pack automation for new-stage items", () => {
    const genericBusiness: Business = {
      id: "biz-2",
      name: "Genel Servis",
      industry: "Bilinmeyen Sektör XYZ",
      whatsapp_number: "0555 999 88 77",
    };
    const pack = resolveSectorPack(genericBusiness);
    assert.equal(pack.id, "generic_service");

    const automations = getActiveSectorAutomations(pack, [
      {
        id: "sw-2",
        packId: "generic_service",
        title: "İş 1",
        customer: "Mehmet",
        stage: "yeni",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
    ]);

    assert.ok(automations.some((item) => item.id === "generic_new_items"));
  });

  it("wires sector tab apply button", () => {
    const source = readFileSync(
      join(root, "app/components/dashboard/SektorIsAkisiTab.tsx"),
      "utf8",
    );
    assert.match(source, /handleApplyAutomation/);
    assert.match(source, /triggerBusinessWebhooks/);
  });
});