export type Locale = "tr" | "en";

export const MESSAGES: Record<Locale, Record<string, string>> = {
  tr: {
    "dashboard.title": "Yönetim Paneli",
    "dashboard.signOut": "Çıkış Yap",
    "platform.title": "Platform",
    "platform.team": "Ekip ve Roller",
    "platform.audit": "Audit Log",
    "platform.api": "Public API",
    "platform.webhooks": "Webhook'lar",
    "platform.language": "Dil",
    "platform.readOnly": "Salt okunur moddasınız. Değişiklik yapamazsınız.",
    "platform.businessSwitcher": "İşletme seç",
    "platform.agencyMode": "Ajans modu aktif",
    "platform.partnerProgram": "Partner Programı",
  },
  en: {
    "dashboard.title": "Dashboard",
    "dashboard.signOut": "Sign out",
    "platform.title": "Platform",
    "platform.team": "Team & Roles",
    "platform.audit": "Audit Log",
    "platform.api": "Public API",
    "platform.webhooks": "Webhooks",
    "platform.language": "Language",
    "platform.readOnly": "You are in read-only mode. Changes are disabled.",
    "platform.businessSwitcher": "Select business",
    "platform.agencyMode": "Agency mode active",
    "platform.partnerProgram": "Partner Program",
  },
};

export function translate(
  locale: Locale,
  key: string,
  fallback?: string,
): string {
  return MESSAGES[locale][key] ?? fallback ?? key;
}