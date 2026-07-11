import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getVisibleTabs } from "../../lib/dashboard-utils";
import type { Business } from "../../lib/domain-types";

describe("dashboard utils integration", () => {
  it("returns core tabs for null business", () => {
    assert.deepEqual(getVisibleTabs(null), []);
  });

  it("falls back to active_modules when business_type is missing", () => {
    const tabs = getVisibleTabs({
      active_modules: ["crm", "randevu", "kasa", "gorevler"],
    });
    assert.ok(tabs.includes("crm"));
    assert.ok(tabs.includes("randevu"));
    assert.ok(tabs.includes("kasa"));
    assert.ok(tabs.includes("personel"));
    assert.ok(tabs.includes("ozet"));
  });

  it("shows product and service tabs for ikisi model", () => {
    const tabs = getVisibleTabs({
      business_type: "ikisi",
      goals: ["Daha fazla müşteri"],
      address: "İstanbul",
    });
    assert.ok(tabs.includes("siparis"));
    assert.ok(tabs.includes("randevu"));
    assert.ok(tabs.includes("crm"));
    assert.ok(tabs.includes("icerik"));
    assert.ok(tabs.includes("google_business"));
  });

  it("adds menu when top_products is filled for service business", () => {
    const tabs = getVisibleTabs({
      business_type: "hizmet",
      top_products: "Saç kesimi, boya",
    });
    assert.ok(tabs.includes("menu"));
  });

  it("preserves TabMenu display order", () => {
    const tabs = getVisibleTabs({
      business_type: "urun",
      goals: ["B2B satış"],
    } satisfies Business);
    const crmIndex = tabs.indexOf("crm");
    const siparisIndex = tabs.indexOf("siparis");
    assert.ok(crmIndex >= 0);
    assert.ok(siparisIndex >= 0);
    assert.ok(crmIndex < siparisIndex);
  });

  it("prefers active_modules (ML) over business_type heuristics", () => {
    const tabs = getVisibleTabs({
      business_type: "hizmet",
      active_modules: ["menu", "siparis", "kasa"],
      goals: ["x"],
      address: "Ankara",
    });
    assert.ok(tabs.includes("menu"));
    assert.ok(tabs.includes("siparis"));
    assert.ok(tabs.includes("kasa"));
    assert.ok(tabs.includes("ozet"));
    // ML listesinde yoksa randevu eklenmez (heuristic devre dışı)
    assert.equal(tabs.includes("randevu"), false);
  });
});