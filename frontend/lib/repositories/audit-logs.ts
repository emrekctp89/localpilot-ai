import { supabase } from "@/lib/supabase";
import type { AuditLogEntry } from "@/lib/platform/audit";
import { isMissingTableError } from "./errors";

export async function listAuditLogs(
  businessId: string,
  limit = 30,
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }

    return (data as AuditLogEntry[]) ?? [];
  } catch {
    return [];
  }
}