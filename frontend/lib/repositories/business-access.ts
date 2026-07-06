import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/domain-types";
import type { BusinessMember, ProfileRole } from "@/lib/platform/access";

export interface UserProfileSnapshot {
  isPro: boolean;
  proActivatedAt: string | null;
  profileRole: ProfileRole;
}

export interface BusinessListResult {
  businesses: Business[];
  error: string | null;
}

export async function fetchUserProfile(
  userId: string,
): Promise<UserProfileSnapshot> {
  const { data } = await supabase
    .from("profiles")
    .select("is_pro, pro_activated_at, role")
    .eq("id", userId)
    .single();

  const role = (data?.role as ProfileRole | undefined) ?? "owner";

  return {
    isPro: Boolean(data?.is_pro),
    proActivatedAt: (data?.pro_activated_at as string | null) ?? null,
    profileRole: role === "agency" ? "agency" : role === "staff" ? "staff" : "owner",
  };
}

export async function fetchBusinessById(
  businessId: string,
): Promise<{ business: Business | null; error: string | null }> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  return {
    business: (data as Business | null) ?? null,
    error: error?.message ?? null,
  };
}

export async function listAccessibleBusinesses(
  userId: string,
): Promise<BusinessListResult> {
  const ownedResult = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const owned = (ownedResult.data as Business[] | null) ?? [];
  const errors: string[] = [];
  if (ownedResult.error) {
    errors.push(ownedResult.error.message);
  }

  let memberIds: string[] = [];
  const memberResult = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId);

  if (memberResult.error) {
    if (memberResult.error.code !== "42P01") {
      errors.push(memberResult.error.message);
    }
    return {
      businesses: owned,
      error: errors.length > 0 ? errors.join(" | ") : null,
    };
  }

  memberIds = (memberResult.data ?? [])
    .map((row) => row.business_id as string)
    .filter(Boolean);

  if (memberIds.length === 0) {
    return {
      businesses: owned,
      error: errors.length > 0 ? errors.join(" | ") : null,
    };
  }

  const memberBusinessesResult = await supabase
    .from("businesses")
    .select("*")
    .in("id", memberIds);

  if (memberBusinessesResult.error) {
    errors.push(memberBusinessesResult.error.message);
  }

  const merged = new Map<string, Business>();
  for (const business of [
    ...owned,
    ...((memberBusinessesResult.data as Business[] | null) ?? []),
  ]) {
    if (business.id) merged.set(business.id, business);
  }

  return {
    businesses: Array.from(merged.values()),
    error: errors.length > 0 ? errors.join(" | ") : null,
  };
}

export async function getBusinessMemberRecord(
  businessId: string,
  userId: string,
): Promise<BusinessMember | null> {
  const { data } = await supabase
    .from("business_members")
    .select("*")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as BusinessMember | null) ?? null;
}