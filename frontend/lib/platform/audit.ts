import { supabase } from "@/lib/supabase";

export interface AuditLogEntry {
  id: string;
  business_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function logAuditEvent(input: {
  businessId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("audit_logs").insert([
      {
        id: crypto.randomUUID(),
        business_id: input.businessId,
        actor_id: input.actorId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        metadata: input.metadata ?? {},
      },
    ]);
    return !error;
  } catch {
    return false;
  }
}