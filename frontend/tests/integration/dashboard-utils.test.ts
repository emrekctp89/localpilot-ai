import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CORE_TABS,
  UNIVERSAL_TABS,
  getVisibleTabs,
} from "../../lib/dashboard-utils";
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
    assert.ok(tabs.includes("kasa"));
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

  it("keeps universal tabs even when ML omits them", () => {
    const tabs = getVisibleTabs({
      business_type: "hizmet",
      active_modules: ["menu", "siparis"],
      goals: ["x"],
      address: "Ankara",
    });
    assert.ok(tabs.includes("menu"));
    assert.ok(tabs.includes("siparis"));
    // UNIVERSAL — ML listesinde yoksa bile
    for (const tab of UNIVERSAL_TABS) {
      assert.ok(tabs.includes(tab), `missing universal tab: ${tab}`);
    }
    for (const tab of CORE_TABS) {
      assert.ok(tabs.includes(tab), `missing core tab: ${tab}`);
    }
    // Modele özel ama ML'de yok → eklenmez
    assert.equal(tabs.includes("randevu"), false);
  });

  it("always shows kasa/crm/icerik/is_akisi for urun and hizmet", () => {
    for (const business_type of ["urun", "hizmet"] as const) {
      const tabs = getVisibleTabs({ business_type });
      assert.ok(tabs.includes("kasa"), `${business_type}: kasa`);
      assert.ok(tabs.includes("crm"), `${business_type}: crm`);
      assert.ok(tabs.includes("icerik"), `${business_type}: icerik`);
      assert.ok(tabs.includes("is_akisi"), `${business_type}: is_akisi`);
    }
  });
});
