import { AiServiceError, requireAiServiceUrl } from "./ai-client";
import { ensureSupabaseSession } from "./supabase-auth";
import type { IntegrationConnectionStatus } from "./integrations/types";

export interface IntegrationProviderStatus {
  provider: string;
  configured?: boolean;
  status: IntegrationConnectionStatus;
  label: string;
  detail: string;
  phone_number_id?: string | null;
  location_id?: string | null;
  account_name?: string | null;
}

export interface IntegrationStatusResponse {
  whatsapp: IntegrationProviderStatus;
  google: IntegrationProviderStatus;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const session = await ensureSupabaseSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function getJson<T>(path: string): Promise<T> {
  const baseUrl = requireAiServiceUrl();
  const headers = await buildAuthHeaders();
  const response = await fetch(`${baseUrl}${path}`, { method: "GET", headers });
  const data = await response.json();
  if (!response.ok) {
    const detail =
      typeof data.detail === "string" ? data.detail : "İstek başarısız oldu.";
    throw new AiServiceError(detail);
  }
  return data as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = requireAiServiceUrl();
  const headers = await buildAuthHeaders();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const detail =
      typeof data.detail === "string" ? data.detail : "İstek başarısız oldu.";
    throw new AiServiceError(detail);
  }
  return data as T;
}

export async function fetchIntegrationStatus(
  businessId: string,
): Promise<IntegrationStatusResponse> {
  return getJson(`/integration/status?business_id=${encodeURIComponent(businessId)}`);
}

export async function sendWhatsAppCloudMessage(input: {
  business_id: string;
  recipient_phone: string;
  message: string;
}): Promise<{ status: string; message_id?: string; recipient: string }> {
  return postJson("/integration/whatsapp/send", input);
}

export async function startGoogleOAuth(
  businessId: string,
): Promise<{ auth_url: string }> {
  return getJson(
    `/integration/google/oauth/start?business_id=${encodeURIComponent(businessId)}`,
  );
}

export async function applyGoogleSuggestion(input: {
  business_id: string;
  checklist_item_id: string;
  suggested_text: string;
}): Promise<{ status: string; field: string }> {
  return postJson("/integration/google/apply-suggestion", input);
}

export async function submitAiQualityFeedback(input: {
  business_id: string;
  feature: "content" | "campaign" | "review_analysis" | "google_suggestion" | "decision";
  rating: -1 | 1;
  context?: Record<string, unknown>;
}): Promise<{ status: string }> {
  return postJson("/integration/ai-feedback", input);
}