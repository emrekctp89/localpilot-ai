import { supabase } from "@/lib/supabase";
import { isMissingTableError } from "@/lib/repositories/errors";

export type BusinessNotificationType =
  | "lead.created"
  | "mini_site.updated"
  | "mini_site.published"
  | "mini_site.draft";

export interface BusinessNotification {
  id: string;
  business_id: string;
  type: BusinessNotificationType | string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function listBusinessNotifications(
  businessId: string,
  limit = 30,
): Promise<BusinessNotification[]> {
  const { data, error } = await supabase
    .from("business_notifications")
    .select("id, business_id, type, title, body, metadata, read_at, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("listBusinessNotifications", error.message);
    return [];
  }

  return (data || []) as BusinessNotification[];
}

export async function countUnreadBusinessNotifications(
  businessId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("business_notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .is("read_at", null);

  if (error) {
    if (isMissingTableError(error)) return 0;
    console.error("countUnreadBusinessNotifications", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function markBusinessNotificationRead(
  notificationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("business_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) {
    if (isMissingTableError(error)) return false;
    console.error("markBusinessNotificationRead", error.message);
    return false;
  }
  return true;
}

export async function markAllBusinessNotificationsRead(
  businessId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("business_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .is("read_at", null);

  if (error) {
    if (isMissingTableError(error)) return false;
    console.error("markAllBusinessNotificationsRead", error.message);
    return false;
  }
  return true;
}

/** Public mini-site lead → owner notification (SECURITY DEFINER RPC). */
export async function notifyBusinessLead(input: {
  businessId: string;
  fullName: string;
  phone?: string;
  notes?: string;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc("notify_business_lead", {
    p_business_id: input.businessId,
    p_full_name: input.fullName,
    p_phone: input.phone || "",
    p_notes: input.notes || "",
  });

  if (error) {
    // Migration not applied yet — soft fail
    if (
      isMissingTableError(error) ||
      error.message?.toLowerCase().includes("notify_business_lead") ||
      error.code === "PGRST202"
    ) {
      return null;
    }
    console.error("notifyBusinessLead", error.message);
    return null;
  }

  return (data as string) || null;
}

/** Authenticated owner/member insert (settings save, publish). */
export async function createBusinessNotification(input: {
  businessId: string;
  type: BusinessNotificationType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("business_notifications")
    .insert({
      business_id: input.businessId,
      type: input.type,
      title: input.title,
      body: input.body || "",
      metadata: input.metadata || {},
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.error("createBusinessNotification", error.message);
    return null;
  }

  return data?.id ?? null;
}
