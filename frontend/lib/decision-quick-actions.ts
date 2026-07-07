import type {
  Business,
  DecisionCycle,
  GoogleBusinessChecklist,
} from "./domain-types";
import {
  buildGoogleProfileSuggestions,
  getGoogleBusinessManagerUrl,
} from "./integrations/google-business";
import { buildWhatsAppFallbackUrl } from "./integrations/whatsapp-business";
import { getAutomationActionForKey } from "./business-os";

export type DecisionQuickActionKind =
  | "whatsapp"
  | "google_open"
  | "copy_text"
  | "navigate";

export interface DecisionQuickAction {
  id: string;
  kind: DecisionQuickActionKind;
  label: string;
  url?: string;
  copyText?: string;
  tab?: string;
  hint?: string;
}

function buildWhatsAppMessage(cycle: DecisionCycle, business: Business): string {
  switch (cycle.recommendationKey) {
    case "pending_payment":
      return `Merhaba, ${business.name} olarak bekleyen ödemeniz hakkında bilgi vermek istedik. Uygun olduğunuzda dönüş yapabilir misiniz?`;
    case "crm_churn_risk":
      return `Merhaba, ${business.name} olarak sizinle tekrar iletişime geçmek istedik. Size özel bir teklifimiz var — uygun olduğunuzda yazabilir misiniz?`;
    case "empty_appointment_slots":
      return `${business.name}: Bu hafta boş randevu saatlerimiz var. Hemen yer ayırtmak için yazın, size uygun saati planlayalım.`;
    case "growth_review":
      return `${business.name}: Yeni müşterilerimize özel fırsatlarımızı paylaşmak istiyoruz. Detaylar için bize yazın.`;
    default:
      return `${business.name}: ${cycle.recommendation}`;
  }
}

export function getDecisionQuickActions(
  cycle: DecisionCycle,
  business: Business,
  checklist: GoogleBusinessChecklist,
): DecisionQuickAction[] {
  if (!["onaylandi", "otomasyonda"].includes(cycle.status)) {
    return [];
  }

  const actions: DecisionQuickAction[] = [];
  const action = getAutomationActionForKey(cycle.recommendationKey);

  if (
    action === "send_message" ||
    cycle.recommendationKey === "empty_appointment_slots"
  ) {
    const message = buildWhatsAppMessage(cycle, business);
    const url = buildWhatsAppFallbackUrl(business, message);
    if (url) {
      actions.push({
        id: "whatsapp-send",
        kind: "whatsapp",
        label: "WhatsApp'ta Aç",
        url,
        copyText: message,
        hint: "Mesaj taslağı hazır; müşteri seçip gönderin.",
      });
      actions.push({
        id: "whatsapp-copy",
        kind: "copy_text",
        label: "Mesajı Kopyala",
        copyText: message,
      });
    }
  }

  if (cycle.recommendationKey === "google_profile") {
    const suggestions = buildGoogleProfileSuggestions(business, checklist);
    const topSuggestion =
      suggestions.find((item) => item.priority === "high") || suggestions[0];

    actions.push({
      id: "google-open",
      kind: "google_open",
      label: "Google İşletme Profilini Aç",
      url: getGoogleBusinessManagerUrl(),
      hint: "Profil panelinde sıradaki adımı tamamlayın.",
    });

    if (topSuggestion) {
      actions.push({
        id: "google-copy",
        kind: "copy_text",
        label: topSuggestion.actionLabel,
        copyText: topSuggestion.suggestedText,
        hint: topSuggestion.title,
      });
    }

    actions.push({
      id: "google-tab",
      kind: "navigate",
      label: "Google Sekmesine Git",
      tab: "google",
    });
  }

  if (action === "publish_campaign" && cycle.recommendationKey !== "empty_appointment_slots") {
    actions.push({
      id: "content-tab",
      kind: "navigate",
      label: "İçerik Sekmesine Git",
      tab: "icerik",
    });
  }

  if (action === "financial_transaction") {
    actions.push({
      id: "finance-tab",
      kind: "navigate",
      label: "Finans Sekmesine Git",
      tab: "kasa",
    });
  }

  return actions;
}