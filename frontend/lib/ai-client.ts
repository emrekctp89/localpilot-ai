import type { Campaign } from "./domain-types";
import { supabase } from "./supabase";

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

export function getAiServiceUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_AI_SERVICE_URL;
}

export function requireAiServiceUrl(): string {
  const url = getAiServiceUrl();
  if (!url) {
    throw new AiServiceError(
      "AI servis adresi tanımlı değil. NEXT_PUBLIC_AI_SERVICE_URL kontrol edin.",
    );
  }
  return url;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
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
      typeof data.detail === "string"
        ? data.detail
        : "İstek başarısız oldu.";
    throw new AiServiceError(detail);
  }
  return data as T;
}

export interface ReviewAnalysisResult {
  positive_highlights?: string[];
  negative_highlights?: string[];
  actionable_advice?: string[];
  overall_sentiment?: string;
  reply_templates?: { type: string; message: string }[];
}

export interface ChurnAnalysisResult {
  status?: string;
  risk_level?: string;
  at_risk_count?: number;
  at_risk_names?: string[];
  insight?: string;
  win_back_message?: string;
  message?: string;
}

export interface FinanceForecastResult {
  status: string;
  message?: string;
  current_revenue?: number;
  predicted_revenue?: number;
  trend_percentage?: number;
  ai_insight?: string;
  action_recommendation?: string;
}

export interface SetupBusinessResult {
  status: string;
  business: Record<string, unknown>;
  ai_decision: Record<string, unknown>;
}

export async function analyzeReviews(input: {
  business_name: string;
  reviews: string[];
}): Promise<ReviewAnalysisResult> {
  return postJson("/analyze-reviews", input);
}

export async function analyzeChurn(input: {
  business_name: string;
  customers: { full_name: string; status?: string; created_at?: string }[];
}): Promise<ChurnAnalysisResult> {
  return postJson("/analyze-churn", input);
}

export async function forecastFinance(input: {
  business_name: string;
  transactions: { date: string; amount: number; type: string }[];
}): Promise<FinanceForecastResult> {
  return postJson("/forecast-finance", input);
}

export async function generateCampaigns(input: {
  business_name: string;
  sector: string;
  city: string;
  target_audience: string;
}): Promise<{ campaigns: Campaign[] }> {
  return postJson("/generate-campaigns", input);
}

export async function setupBusiness(
  input: Record<string, unknown>,
): Promise<SetupBusinessResult> {
  return postJson("/setup-business", input);
}

export async function createCheckoutSession(input: {
  user_id: string;
}): Promise<{ url?: string }> {
  return postJson("/create-checkout-session", input);
}

export async function checkAiServiceHealth(): Promise<boolean> {
  const url = getAiServiceUrl();
  if (!url) return false;
  try {
    const response = await fetch(`${url}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}