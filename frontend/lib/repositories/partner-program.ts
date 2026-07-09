import { supabase } from "@/lib/supabase";
import {
  generateReferralCode,
  normalizeReferralCode,
  PARTNER_COMMISSION_RATES,
  type CommissionLedgerEntry,
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