import type { Business } from "./domain-types";

/** TabMenu.tsx ile aynı sıra — filtre sonrası tutarlı görünüm için. */
export const DASHBOARD_TAB_ORDER = [
  "ozet",
  "karar",
  "is_akisi",
  "icerik",
  "crm",
  "randevu",
  "siparis",
  "menu",
  "kasa",
  "google_business",
  "personel",
  "araclar",
  "ayarlar",
  "platform",
] as const;

/** Panel iskeleti — her hesapta (özet, karar, ayarlar…). */
export const CORE_TABS = [
  "ozet",
  "karar",
  "ayarlar",
  "platform",
  "araclar",
] as const;

/**
 * Tüm işletme modellerinde sabit operasyon sekmeleri.
 * ML / active_modules bunları gizleyemez.
 * - kasa: finans
 * - crm: müşteri
 * - icerik: WA / sosyal / kampanya
 * - is_akisi: iş akışı
 */
export const UNIVERSAL_TABS = [
  "kasa",
  "crm",
  "icerik",
  "is_akisi",
] as const;

const MODULE_TO_TAB: Record<string, string> = {
  is_akisi: "is_akisi",
  icerik: "icerik",
  sosyal_medya: "icerik",
  whatsapp: "icerik",
  kampanya: "icerik",
  crm: "crm",
  randevu: "randevu",
  siparis: "siparis",
  menu: "menu",
  kasa: "kasa",
  google_business: "google_business",
  gorevler: "personel",
  personel: "personel",
};

const DEFAULT_OPERATIONAL_TABS = [
  "is_akisi",
  "icerik",
  "crm",
  "randevu",
  "siparis",
  "kasa",
  "personel",
  "google_business",
] as const;

function sortTabIds(tabIds: Iterable<string>): string[] {
  const set = new Set(tabIds);
  return DASHBOARD_TAB_ORDER.filter((tabId) => set.has(tabId));
}

const KNOWN_TAB_IDS = new Set<string>(DASHBOARD_TAB_ORDER);

function withAlwaysOnTabs(tabs: Iterable<string>): string[] {
  const merged = new Set<string>([
    ...CORE_TABS,
    ...UNIVERSAL_TABS,
    ...tabs,
  ]);
  return sortTabIds(merged);
}

function tabsFromActiveModules(activeModules: string[]): string[] {
  const tabs = new Set<string>();
  for (const moduleId of activeModules) {
    const mapped = MODULE_TO_TAB[moduleId] || moduleId;
    if (mapped && KNOWN_TAB_IDS.has(mapped)) {
      tabs.add(mapped);
    }
  }
  // CORE + UNIVERSAL her zaman (ML listesinde olmasa bile)
  return withAlwaysOnTabs(tabs);
}

export function getVisibleTabs(business: Business | null): string[] {
  if (!business) return [];

  // ML / setup ile gelen active_modules — model sekmelerini ekler; universal sabit kalır
  const modules = (business.active_modules || []).filter(Boolean);
  if (modules.length > 0) {
    return tabsFromActiveModules(modules);
  }

  const visibleTabs = new Set<string>();
  const type = (business.business_type || "").trim();
  const isUrun = type === "urun" || type === "ikisi";
  const isHizmet = type === "hizmet" || type === "ikisi";

  if (!type) {
    for (const tabId of DEFAULT_OPERATIONAL_TABS) {
      visibleTabs.add(tabId);
    }
    return withAlwaysOnTabs(visibleTabs);
  }

  // Modele özel sekmeler
  if (isUrun) {
    visibleTabs.add("siparis");
    visibleTabs.add("menu");
  }

  if (isHizmet) {
    visibleTabs.add("randevu");
    visibleTabs.add("personel");
  }

  if ((business.top_products || "").trim().length > 0) {
    visibleTabs.add("menu");
  }

  if ((business.address || "").trim().length > 0) {
    visibleTabs.add("google_business");
  }

  // goals artık icerik için şart değil — UNIVERSAL_TABS'ta sabit
  return withAlwaysOnTabs(visibleTabs);
}
