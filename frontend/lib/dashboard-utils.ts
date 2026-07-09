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

const CORE_TABS = ["ozet", "karar", "ayarlar", "platform", "araclar"] as const;

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
  "personel",
  "google_business",
] as const;

function sortTabIds(tabIds: Iterable<string>): string[] {
  const set = new Set(tabIds);
  return DASHBOARD_TAB_ORDER.filter((tabId) => set.has(tabId));
}

function tabsFromActiveModules(activeModules: string[]): string[] {
  const tabs = new Set<string>(CORE_TABS);
  for (const moduleId of activeModules) {
    const mapped = MODULE_TO_TAB[moduleId];
    if (mapped) tabs.add(mapped);
  }
  return sortTabIds(tabs);
}

export function getVisibleTabs(business: Business | null): string[] {
  if (!business) return [];

  const visibleTabs = new Set<string>(CORE_TABS);
  const type = (business.business_type || "").trim();
  const isUrun = type === "urun" || type === "ikisi";
  const isHizmet = type === "hizmet" || type === "ikisi";

  if (!type) {
    const modules = business.active_modules || [];
    if (modules.length > 0) {
      return tabsFromActiveModules(modules);
    }
    for (const tabId of DEFAULT_OPERATIONAL_TABS) {
      visibleTabs.add(tabId);
    }
    return sortTabIds(visibleTabs);
  }

  if (isUrun) {
    visibleTabs.add("siparis");
    visibleTabs.add("kasa");
    visibleTabs.add("is_akisi");
    visibleTabs.add("crm");
    visibleTabs.add("menu");
  }

  if (isHizmet) {
    visibleTabs.add("randevu");
    visibleTabs.add("crm");
    visibleTabs.add("personel");
    visibleTabs.add("is_akisi");
    visibleTabs.add("kasa");
  }

  if ((business.top_products || "").trim().length > 0) {
    visibleTabs.add("menu");
  }

  const goals = business.goals || [];
  if (goals.length > 0) {
    visibleTabs.add("icerik");
  }

  if ((business.address || "").trim().length > 0) {
    visibleTabs.add("google_business");
  }

  return sortTabIds(visibleTabs);
}