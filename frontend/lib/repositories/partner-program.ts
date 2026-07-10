import { supabase } from "@/lib/supabase";
import {
  allowedCommissionTransitions,
  generateReferralCode,
  normalizeReferralCode,
  PARTNER_COMMISSION_RATES,
  type CommissionLedgerEntry,
  type CommissionStatus,
  type PartnerProfile,
  type PartnerType,
  type ReferralAttribution,
} from "@/lib/partner-program";
import { isMissingTableError } from "./errors";

async function isCodeAvailable(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
  return !data;
}

export async function fetchPartnerProfile(
  userId: string,
): Promise<PartnerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("partner_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }
    return (data as PartnerProfile | null) ?? null;
  } catch {
    return null;
  }
}

export async function createPartnerProfile(input: {
  userId: string;
  partnerType: PartnerType;
}): Promise<PartnerProfile | null> {
  let referralCode = generateReferralCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await isCodeAvailable(referralCode)) break;
    referralCode = generateReferralCode();
  }

  const payload = {
    user_id: input.userId,
    partner_type: input.partnerType,
    referral_code: referralCode,
    commission_rate_bps: PARTNER_COMMISSION_RATES[input.partnerType],
    status: "active",
  };

  const { data, error } = await supabase
    .from("partner_profiles")
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data as PartnerProfile;
}

export async function ensurePartnerProfile(input: {
  userId: string;
  partnerType: PartnerType;
}): Promise<PartnerProfile | null> {
  const existing = await fetchPartnerProfile(input.userId);
  if (existing) return existing;
  return createPartnerProfile(input);
}

export async function fetchReferredUserAttribution(
  userId: string,
): Promise<ReferralAttribution | null> {
  try {
    const { data, error } = await supabase
      .from("referral_attributions")
      .select("*")
      .eq("referred_user_id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }
    return (data as ReferralAttribution | null) ?? null;
  } catch {
    return null;
  }
}

export async function listPartnerAttributions(
  partnerUserId: string,
): Promise<ReferralAttribution[]> {
  try {
    const { data, error } = await supabase
      .from("referral_attributions")
      .select("*")
      .eq("partner_user_id", partnerUserId)
      .order("attributed_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as ReferralAttribution[]) ?? [];
  } catch {
    return [];
  }
}

export async function listPartnerCommissionLedger(
  partnerUserId: string,
): Promise<CommissionLedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from("commission_ledger")
      .select("*")
      .eq("partner_user_id", partnerUserId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as CommissionLedgerEntry[]) ?? [];
  } catch {
    return [];
  }
}

export async function attributeReferralCode(
  code: string,
): Promise<{ status: string; detail?: string }> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    return { status: "error", detail: "Geçersiz referans kodu." };
  }

  const { data, error } = await supabase.rpc("attribute_referral", {
    p_code: normalized,
  });

  if (error) {
    if (isMissingTableError(error)) {
      return { status: "error", detail: "Partner programı henüz aktif değil." };
    }
    return { status: "error", detail: error.message };
  }

  const payload = (data ?? {}) as { status?: string; detail?: string };
  return {
    status: payload.status || "error",
    detail: payload.detail,
  };
}

export interface AdminCommissionRow extends CommissionLedgerEntry {
  partner_referral_code: string;
  partner_type: PartnerType;
  referred_user_id?: string;
}

export async function listAdminCommissionQueue(): Promise<AdminCommissionRow[]> {
  try {
    const { data: ledger, error: ledgerError } = await supabase
      .from("commission_ledger")
      .select("*")
      .order("created_at", { ascending: false });

    if (ledgerError) {
      if (isMissingTableError(ledgerError)) return [];
      throw ledgerError;
    }

    const entries = (ledger as CommissionLedgerEntry[]) ?? [];
    if (entries.length === 0) return [];

    const partnerIds = [...new Set(entries.map((entry) => entry.partner_user_id))];
    const { data: partners, error: partnerError } = await supabase
      .from("partner_profiles")
      .select("user_id, referral_code, partner_type")
      .in("user_id", partnerIds);

    if (partnerError) {
      if (isMissingTableError(partnerError)) return [];
      throw partnerError;
    }

    const partnerMap = new Map(
      (partners ?? []).map((partner) => [partner.user_id as string, partner]),
    );

    return entries.map((entry) => {
      const partner = partnerMap.get(entry.partner_user_id);
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return {
        ...entry,
        partner_referral_code: (partner?.referral_code as string) || "—",
        partner_type: (partner?.partner_type as PartnerType) || "referral",
        referred_user_id:
          typeof metadata.referred_user_id === "string"
            ? metadata.referred_user_id
            : undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function updateCommissionStatus(
  ledgerId: string,
  currentStatus: CommissionStatus,
  nextStatus: Extract<CommissionStatus, "approved" | "paid" | "cancelled">,
): Promise<{ ok: boolean; detail?: string }> {
  if (!allowedCommissionTransitions(currentStatus).includes(nextStatus)) {
    return {
      ok: false,
      detail: `${currentStatus} durumundan ${nextStatus} geçişine izin yok.`,
    };
  }

  const { data, error } = await supabase
    .from("commission_ledger")
    .update({ status: nextStatus })
    .eq("id", ledgerId)
    .eq("status", currentStatus)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: false, detail: "Komisyon yönetimi henüz aktif değil." };
    }
    return { ok: false, detail: error.message };
  }

  if (!data) {
    return {
      ok: false,
      detail: "Kayıt güncellenemedi. Yetkiniz veya kayıt durumu değişmiş olabilir.",
    };
  }

  return { ok: true };
}

/**
 * After manual SQL Pro activation, commission admin can create ledger row.
 * Requires migration 014 (record_manual_pro_commission).
 */
export async function triggerManualProCommission(
  referredUserId: string,
  billingInterval: "monthly" | "yearly" = "monthly",
): Promise<{ status: string; detail?: string; commission_amount_try?: number }> {
  const userId = referredUserId.trim();
  if (!userId) {
    return { status: "error", detail: "Kullanıcı UUID gerekli." };
  }

  const { data, error } = await supabase.rpc("record_manual_pro_commission", {
    p_referred_user_id: userId,
    p_billing_interval: billingInterval,
  });

  if (error) {
    if (isMissingTableError(error)) {
      return {
        status: "error",
        detail: "Migration 014 henüz uygulanmamış olabilir.",
      };
    }
    return { status: "error", detail: error.message };
  }

  const payload = (data ?? {}) as {
    status?: string;
    detail?: string;
    commission_amount_try?: number;
  };

  return {
    status: payload.status || "error",
    detail: payload.detail,
    commission_amount_try:
      typeof payload.commission_amount_try === "number"
        ? payload.commission_amount_try
        : undefined,
  };
}