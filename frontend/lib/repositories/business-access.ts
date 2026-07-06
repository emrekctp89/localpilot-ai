import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/domain-types";
import type { BusinessMember, ProfileRole } from "@/lib/platform/access";

export interface UserProfileSnapshot {
  isPro: boolean;
  proActivatedAt: string | null;
  profileRole: ProfileRole;
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

export async function listAccessibleBusinesses(
  userId: string,
): Promise<Business[]> {
  const [ownedResult, memberResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId),
  ]);

  const owned = (ownedResult.data as Business[] | null) ?? [];
  const memberIds = (memberResult.data ?? [])
    .map((row) => row.business_id as string)
    .filter(Boolean);

  if (memberIds.length === 0) {
    return owned;
  }

  const { data: memberBusinesses } = await supabase
    .from("businesses")
    .select("*")
    .in("id", memberIds);

  const merged = new Map<string, Business>();
  for (const business of [...owned, ...((memberBusinesses as Business[]) ?? [])]) {
    if (business.id) merged.set(business.id, business);
  }
  return Array.from(merged.values());
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