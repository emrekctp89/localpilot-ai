import type { Business, WhatsappTemplate } from "../domain-types";
import type { IntegrationProviderStatus } from "../integration-client";
import { buildWhatsAppDeepLink } from "../mini-site";
import type { IntegrationStatus, WhatsAppTemplateReadiness } from "./types";

export const WHATSAPP_BUSINESS_API_NOTES = [
  "Meta Cloud API için doğrulanmış işletme numarası gerekir.",
  "Şablonlar önce Meta Business Manager'da onaylanmalıdır.",
  "Utility şablonları işlem bildirimi, marketing şablonları kampanya duyurusu içindir.",
  "OAuth bağlantısı tamamlanana kadar wa.me derin linki yedek kanal olarak kullanılır.",
];

export function getWhatsAppBusinessIntegrationStatus(
  remote?: IntegrationProviderStatus | null,
): IntegrationStatus {
  if (remote) {
    return {
      provider: "whatsapp_business",
      status: remote.status,
      label: remote.label,
      detail: remote.detail,
    };
  }

  return {
    provider: "whatsapp_business",
    status: "pending_oauth",
    label: "Cloud API yapılandırması bekleniyor",
    detail:
      "Meta token eklenene kadar derin link + şablon hazırlığı aktif kalır.",
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
  remote?: IntegrationProviderStatus | null,
): WhatsAppTemplateReadiness {
  const blockers: string[] = [];
  const hasPhone = Boolean(business.whatsapp_number?.trim());
  const hasBody = Boolean(template.text?.trim());
  const hasName = Boolean(template.name?.trim());
  const cloudReady = remote?.status === "connected";

  if (!hasPhone) blockers.push("İşletme WhatsApp numarası eksik.");
  if (!hasBody) blockers.push("Şablon metni boş.");
  if (!hasName) blockers.push("Şablon adı eksik.");
  if (!cloudReady) {
    blockers.push("Cloud API token yapılandırması bekleniyor.");
  }

  const fallbackMessage = template.text?.trim() || "";
  const deepLink = hasPhone
    ? buildWhatsAppDeepLink(business.whatsapp_number || "", fallbackMessage)
    : "";

  if (!deepLink) blockers.push("Derin link üretilemedi.");

  return {
    templateId: String(template.id ?? template.name),
    templateName: template.name,
    channel: cloudReady && blockers.length <= 0 ? "cloud_api" : "deep_link_fallback",
    ready: hasPhone && hasBody && Boolean(deepLink),
    blockers,
    suggestedCategory: inferTemplateCategory(template),
    fallbackMessage,
  };
}

export function buildWhatsAppTemplateSendPlan(
  business: Business,
  templates: WhatsappTemplate[],
  remote?: IntegrationProviderStatus | null,
) {
  return templates.map((template) =>
    assessWhatsAppTemplateReadiness(business, template, remote),
  );
}

export function buildWhatsAppFallbackUrl(
  business: Business,
  message: string,
) {
  if (!business.whatsapp_number?.trim()) return "";
  return buildWhatsAppDeepLink(business.whatsapp_number, message);
}