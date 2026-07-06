import { supabase } from "@/lib/supabase";
import type { BusinessMember, BusinessMemberRole } from "@/lib/platform/access";
import { isMissingTableError } from "./errors";

export async function listBusinessMembers(
  businessId: string,
): Promise<BusinessMember[]> {
  try {
    const { data, error } = await supabase
      .from("business_members")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as BusinessMember[]) ?? [];
  } catch {
    return [];
  }
}

export async function inviteBusinessMember(input: {
  businessId: string;
  invitedEmail: string;
  role: BusinessMemberRole;
}): Promise<BusinessMember | null> {
  const payload = {
    id: crypto.randomUUID(),
    business_id: input.businessId,
    user_id: null,
    invited_email: input.invitedEmail.trim().toLowerCase(),
    role: input.role,
  };

  const { data, error } = await supabase
    .from("business_members")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as BusinessMember;
}

export async function removeBusinessMember(memberId: string): Promise<boolean> {
  const { error } = await supabase
    .from("business_members")
    .delete()
    .eq("id", memberId);
  return !error;
}