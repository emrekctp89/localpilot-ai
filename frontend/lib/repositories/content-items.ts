import { supabase } from "@/lib/supabase";
import type { SocialPost, WhatsappTemplate } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";

type ContentType = "social_post" | "whatsapp_template";

interface ContentItemRow {
  id: string;
  business_id: string;
  content_type: ContentType;
  platform: string | null;
  label: string | null;
  body: string;
  image_prompt: string | null;
  created_at: string;
}

interface LegacyContent {
  socialPosts: SocialPost[];
  waTemplates: WhatsappTemplate[];
}

function rowToSocialPost(row: ContentItemRow): SocialPost {
  return {
    id: row.id,
    platform: row.platform || "Instagram",
    type: row.label || "Gönderi",
    text: row.body,
    image_prompt: row.image_prompt || undefined,
    created_at: row.created_at,
  };
}

function rowToWhatsappTemplate(row: ContentItemRow): WhatsappTemplate {
  return {
    id: row.id,
    name: row.label || "WhatsApp Şablonu",
    text: row.body,
    created_at: row.created_at,
  };
}

function socialPostToRow(businessId: string, post: SocialPost): ContentItemRow {
  return {
    id: String(post.id || crypto.randomUUID()),
    business_id: businessId,
    content_type: "social_post",
    platform: post.platform,
    label: post.type || "Gönderi",
    body: post.text,
    image_prompt: post.image_prompt || null,
    created_at: post.created_at || new Date().toISOString(),
  };
}

function whatsappTemplateToRow(
  businessId: string,
  template: WhatsappTemplate,
): ContentItemRow {
  return {
    id: String(template.id || crypto.randomUUID()),
    business_id: businessId,
    content_type: "whatsapp_template",
    platform: null,
    label: template.name,
    body: template.text,
    image_prompt: null,
    created_at: template.created_at || new Date().toISOString(),
  };
}

const normalizeSocialPosts = (items: unknown[]): SocialPost[] =>
  items.reduce<SocialPost[]>((posts, item, index) => {
    const record = item as Record<string, unknown>;
    const text = String(
      record.text || record.caption || record.content || "",
    ).trim();
    if (!text) return posts;

    posts.push({
      id: (record.id as string | number | undefined) || `post-${index}`,
      platform: String(record.platform || "Instagram"),
      type: String(
        record.type || (record.day ? `${record.day}. Gün` : "") || "Gönderi",
      ),
      text,
      image_prompt: record.image_prompt
        ? String(record.image_prompt)
        : undefined,
      created_at: record.created_at ? String(record.created_at) : undefined,
    });
    return posts;
  }, []);

const normalizeWhatsappTemplates = (items: unknown[]): WhatsappTemplate[] =>
  items.reduce<WhatsappTemplate[]>((templates, item, index) => {
    const record = item as Record<string, unknown>;
    const text = String(record.text || record.message || "").trim();
    if (!text) return templates;

    templates.push({
      id: (record.id as string | number | undefined) || `wa-${index}`,
      name: String(record.name || record.scenario || "WhatsApp Şablonu"),
      text,
      created_at: record.created_at ? String(record.created_at) : undefined,
    });
    return templates;
  }, []);

async function loadLegacyContent(businessId: string): Promise<LegacyContent> {
  const { data } = await supabase
    .from("generated_plans")
    .select("social_media_calendar, whatsapp_templates")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    socialPosts: normalizeSocialPosts(data?.social_media_calendar || []),
    waTemplates: normalizeWhatsappTemplates(data?.whatsapp_templates || []),
  };
}

async function replaceAllInTable(
  businessId: string,
  socialPosts: SocialPost[],
  waTemplates: WhatsappTemplate[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("content_items")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;

  const rows = [
    ...socialPosts.map((post) => socialPostToRow(businessId, post)),
    ...waTemplates.map((template) => whatsappTemplateToRow(businessId, template)),
  ];

  if (rows.length === 0) return true;

  const { error: insertError } = await supabase.from("content_items").insert(rows);
  return !insertError;
}

async function clearLegacyPlanContent(businessId: string): Promise<void> {
  const { data: planData } = await supabase
    .from("generated_plans")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!planData?.id) return;

  await supabase
    .from("generated_plans")
    .update({
      social_media_calendar: [],
      whatsapp_templates: [],
    })
    .eq("id", planData.id);
}

export async function listContentItems(
  businessId: string,
): Promise<LegacyContent> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      const rows = data as ContentItemRow[];
      return {
        socialPosts: rows
          .filter((row) => row.content_type === "social_post")
          .map(rowToSocialPost),
        waTemplates: rows
          .filter((row) => row.content_type === "whatsapp_template")
          .map(rowToWhatsappTemplate),
      };
    }

    const legacy = await loadLegacyContent(businessId);
    if (legacy.socialPosts.length > 0 || legacy.waTemplates.length > 0) {
      await replaceAllInTable(
        businessId,
        legacy.socialPosts,
        legacy.waTemplates,
      );
      await clearLegacyPlanContent(businessId);
      return legacy;
    }
    return { socialPosts: [], waTemplates: [] };
  }

  return loadLegacyContent(businessId);
}

export async function saveContentItems(
  businessId: string,
  socialPosts: SocialPost[],
  waTemplates: WhatsappTemplate[],
): Promise<boolean> {
  const savedToTable = await replaceAllInTable(
    businessId,
    socialPosts,
    waTemplates,
  );
  if (!savedToTable) return false;
  await clearLegacyPlanContent(businessId);
  return true;
}