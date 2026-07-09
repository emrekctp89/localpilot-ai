export type PartnerType = "referral" | "agency";

export const REFERRAL_STORAGE_KEY = "localpilot_referral_code";

/** Basis points — 1000 = %10 */
export const PARTNER_COMMISSION_RATES: Record<PartnerType, number> = {
  referral: 1000,
  agency: 2000,
};

export const PRO_GROSS_AMOUNTS_TRY = {
  monthly: 299,
  yearly: 2990,
} as const;

export interface PartnerProfile {
  id: string;
  user_id: string;
  partner_type: PartnerType;
  referral_code: string;
  commission_rate_bps: number;
  status: "active" | "paused";
  created_at?: string;
  updated_at?: string;
}

export interface ReferralAttribution {
  id: string;
  partner_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: "pending" | "converted" | "expired";
  attributed_at?: string;
  converted_at?: string | null;
}

export interface CommissionLedgerEntry {
  id: string;
  partner_user_id: string;
  attribution_id: string | null;
  event_type: "pro_activation" | "subscription_payment";
  gross_amount_try: number;
  commission_rate_bps: number;
  commission_amount_try: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface PartnerDashboardStats {
  totalReferrals: number;
  convertedReferrals: number;
  pendingCommissionTry: number;
  approvedCommissionTry: number;
  paidCommissionTry: number;
}

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function generateReferralCode(): string {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `LP-${token}`;
}

export function commissionRateLabel(rateBps: number): string {
  return `%${(rateBps / 100).toFixed(0)}`;
}

export function calculateCommissionAmount(
  grossAmountTry: number,
  rateBps: number,
): number {
  return Math.round((grossAmountTry * rateBps) / 10000 * 100) / 100;
}

export function buildReferralLink(
  code: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const normalized = normalizeReferralCode(code);
  return `${origin}/auth?ref=${encodeURIComponent(normalized)}`;
}

export function resolvePartnerType(
  profileRole: string,
  requested?: PartnerType,
): PartnerType {
  if (profileRole === "agency") return "agency";
  return requested === "agency" ? "agency" : "referral";
}

export function buildPartnerDashboardStats(
  attributions: ReferralAttribution[],
  ledger: CommissionLedgerEntry[],
): PartnerDashboardStats {
  const convertedReferrals = attributions.filter(
    (item) => item.status === "converted",
  ).length;

  const sumByStatus = (status: CommissionLedgerEntry["status"]) =>
    ledger
      .filter((entry) => entry.status === status)
      .reduce((sum, entry) => sum + Number(entry.commission_amount_try), 0);

  return {
    totalReferrals: attributions.length,
    convertedReferrals,
    pendingCommissionTry: sumByStatus("pending"),
    approvedCommissionTry: sumByStatus("approved"),
    paidCommissionTry: sumByStatus("paid"),
  };
}

export function formatTryAmount(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type CommissionStatus = CommissionLedgerEntry["status"];

export function allowedCommissionTransitions(
  status: CommissionStatus,
): Array<Extract<CommissionStatus, "approved" | "paid" | "cancelled">> {
  if (status === "pending") return ["approved", "paid", "cancelled"];
  if (status === "approved") return ["paid", "cancelled"];
  return [];
}