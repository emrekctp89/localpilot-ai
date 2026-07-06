import type { Business, WhatsappTemplate } from "../domain-types";
import { buildWhatsAppDeepLink } from "../mini-site";
import type { IntegrationStatus, WhatsAppTemplateReadiness } from "./types";

export const WHATSAPP_BUSINESS_API_NOTES = [
  "Meta Cloud API için doğrulanmış işletme numarası gerekir.",
  "Şablonlar önce Meta Business Manager'da onaylanmalıdır.",
  "Utility şablonları işlem bildirimi, marketing şablonları kampanya duyurusu içindir.",
  "OAuth bağlantısı tamamlanana kadar wa.me derin linki yedek kanal olarak kullanılır.",
];

export function getWhatsAppBusinessIntegrationStatus(): IntegrationStatus {
  return {
    provider: "whatsapp_business",
    status: "pending_oauth",
    label: "Cloud API araştırma tamamlandı",
    detail:
      "Şablon gönderimi için Meta onayı ve API anahtarı gerekir. Şimdilik derin link + şablon hazırlığı aktif.",
  };
}

function inferTemplateCategory(
  template: WhatsappTemplate,
): WhatsAppTemplateReadiness["suggestedCategory"] {
  const text = `${template.name} ${template.text}`.toLocaleLowerCase("tr-TR");
  if (
    text.includes("onay") ||
    text.includes("randevu") ||
    text.includes("bilgi")
  ) {
    return "utility";
  }
  if (
    text.includes("indirim") ||
    text.includes("kampanya") ||
    text.includes("fırsat")
  ) {
    return "marketing";
  }
  return "utility";
}

export function assessWhatsAppTemplateReadiness(
  business: Business,
  template: WhatsappTemplate,
): WhatsAppTemplateReadiness {
  const blockers: string[] = [];
  const hasPhone = Boolean(business.whatsapp_number?.trim());
  const hasBody = Boolean(template.text?.trim());
  const hasName = Boolean(template.name?.trim());

  if (!hasPhone) blockers.push("İşletme WhatsApp numarası eksik.");
  if (!hasBody) blockers.push("Şablon metni boş.");
  if (!hasName) blockers.push("Şablon adı eksik.");
  blockers.push("Meta Business şablon onayı bekleniyor.");

  const fallbackMessage = template.text?.trim() || "";
  const deepLink = hasPhone
    ? buildWhatsAppDeepLink(business.whatsapp_number || "", fallbackMessage)
    : "";

  if (!deepLink) blockers.push("Derin link üretilemedi.");

  return {
    templateId: String(template.id ?? template.name),
    templateName: template.name,
    channel: blockers.length <= 1 ? "cloud_api" : "deep_link_fallback",
    ready: hasPhone && hasBody && Boolean(deepLink),
    blockers,
    suggestedCategory: inferTemplateCategory(template),
    fallbackMessage,
  };
}

export function buildWhatsAppTemplateSendPlan(
  business: Business,
  templates: WhatsappTemplate[],
) {
  return templates.map((template) =>
    assessWhatsAppTemplateReadiness(business, template),
  );
}

export function buildWhatsAppFallbackUrl(
  business: Business,
  message: string,
) {
  if (!business.whatsapp_number?.trim()) return "";
  return buildWhatsAppDeepLink(business.whatsapp_number, message);
}