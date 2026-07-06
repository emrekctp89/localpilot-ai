import { supabase } from "@/lib/supabase";
import { isMissingTableError } from "./errors";

export interface BusinessApiKeyRecord {
  id: string;
  business_id: string;
  key_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface BusinessWebhookRecord {
  id: string;
  business_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function listBusinessApiKeys(
  businessId: string,
): Promise<BusinessApiKeyRecord[]> {
  try {
    const { data, error } = await supabase
      .from("business_api_keys")
      .select("id, business_id, key_prefix, label, created_at, last_used_at, revoked_at")
      .eq("business_id", businessId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as BusinessApiKeyRecord[]) ?? [];
  } catch {
    return [];
  }
}

export async function createBusinessApiKey(input: {
  businessId: string;
  createdBy: string;
  label: string;
}): Promise<{ record: BusinessApiKeyRecord; rawKey: string }> {
  const rawKey = `lp_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await sha256Hex(rawKey);

  const { data, error } = await supabase
    .from("business_api_keys")
    .insert([
      {
        id: crypto.randomUUID(),
        business_id: input.businessId,
        key_hash: keyHash,
        key_prefix: rawKey.slice(0, 10),
        label: input.label,
        created_by: input.createdBy,
      },
    ])
    .select("id, business_id, key_prefix, label, created_at, last_used_at, revoked_at")
    .single();

  if (error) throw error;
  return { record: data as BusinessApiKeyRecord, rawKey };
}

export async function revokeBusinessApiKey(keyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("business_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);
  return !error;
}

export async function listBusinessWebhooks(
  businessId: string,
): Promise<BusinessWebhookRecord[]> {
  try {
    const { data, error } = await supabase
      .from("business_webhooks")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as BusinessWebhookRecord[]) ?? [];
  } catch {
    return [];
  }
}

export async function createBusinessWebhook(input: {
  businessId: string;
  url: string;
  events: string[];
}): Promise<BusinessWebhookRecord> {
  const { data, error } = await supabase
    .from("business_webhooks")
    .insert([
      {
        id: crypto.randomUUID(),
        business_id: input.businessId,
        url: input.url,
        events: input.events,
        secret: crypto.randomUUID().replace(/-/g, ""),
        active: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as BusinessWebhookRecord;
}

export async function deleteBusinessWebhook(webhookId: string): Promise<boolean> {
  const { error } = await supabase
    .from("business_webhooks")
    .delete()
    .eq("id", webhookId);
  return !error;
}