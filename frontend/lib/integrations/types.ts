export type IntegrationProvider =
  | "google_business"
  | "whatsapp_business"
  | "google_calendar";

export type IntegrationConnectionStatus =
  | "manual"
  | "ready"
  | "connected"
  | "pending_oauth";

export interface IntegrationStatus {
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  label: string;
  detail: string;
}

export interface GoogleProfileSuggestion {
  checklistItemId: string;
  title: string;
  suggestedText: string;
  actionLabel: string;
  priority: "high" | "medium" | "low";
}

export interface WhatsAppTemplateReadiness {
  templateId: string;
  templateName: string;
  channel: "cloud_api" | "deep_link_fallback";
  ready: boolean;
  blockers: string[];
  suggestedCategory: "utility" | "marketing" | "authentication";
  fallbackMessage: string;
}

export interface CalendarSyncEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description: string;
  location?: string;
}

export interface CalendarSyncState {
  provider: "google_calendar";
  lastSyncedAt?: string;
  exportedCount: number;
  mode: "ics_export" | "google_url";
}