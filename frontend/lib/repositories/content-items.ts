import { supabase } from "@/lib/supabase";
import type { SocialPost, WhatsappTemplate } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { ensureContentItemId } from "./content-item-ids";
import { isLegacyDualReadEnabled } from "./legacy-config";

export { ensureContentItemId } from "./content-item-ids";

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
    id: ensureContentItemId(post.id),
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
    id: ensureContentItemId(template.id),
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
  items.reduce<SocialPost[]>((posts, item) => {
    const record = item as Record<string, unknown>;
    const text = String(
      record.text || record.caption || record.content || "",
    ).trim();
    if (!text) return posts;

    posts.push({
      id: ensureContentItemId(record.id as string | number | undefined),
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
  items.reduce<WhatsappTemplate[]>((templates, item) => {
    const record = item as Record<string, unknown>;
    const text = String(record.text || record.message || "").trim();
    if (!text) return templates;

    templates.push({
      id: ensureContentItemId(record.id as string | number | undefined),
      name: String(record.name || record.scenario || "WhatsApp Şablonu"),
      text,
      created_at: record.created_at ? String(record.created_at) : undefined,
    });
    return templates;
  }, []);

function rowsFromContent(
  businessId: string,
  socialPosts: SocialPost[],
  waTemplates: WhatsappTemplate[],
): ContentItemRow[] {
  const seen = new Set<string>();
  const rows = [
    ...socialPosts
      .filter((post) => post.text.trim().length > 0)
      .map((post) => socialPostToRow(businessId, post)),
    ...waTemplates
      .filter((template) => template.text.trim().length > 0)
      .map((template) => whatsappTemplateToRow(businessId, template)),
  ];

  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

async function loadTableContent(businessId: string): Promise<LegacyContent> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return EMPTY_LEGACY_CONTENT;
  }

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

const EMPTY_LEGACY_CONTENT: LegacyContent = {
  socialPosts: [],
  waTemplates: [],
};

async function loadPlanContent(businessId: string): Promise<LegacyContent> {
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

async function loadLegacyContent(businessId: string): Promise<LegacyContent> {
  if (!isLegacyDualReadEnabled()) {
    return EMPTY_LEGACY_CONTENT;
  }

  return loadPlanContent(businessId);
}

async function migratePlanContentToTable(businessId: string): Promise<LegacyContent> {
  const planContent = await loadPlanContent(businessId);
  if (
    planContent.socialPosts.length === 0 &&
    planContent.waTemplates.length === 0
  ) {
    return EMPTY_LEGACY_CONTENT;
  }

  const saved = await replaceAllInTable(
    businessId,
    planContent.socialPosts,
    planContent.waTemplates,
  );
  if (!saved) {
    return planContent;
  }

  await clearLegacyPlanContent(businessId);
  const tableContent = await loadTableContent(businessId);
  if (
    tableContent.socialPosts.length > 0 ||
    tableContent.waTemplates.length > 0
  ) {
    return tableContent;
  }

  return planContent;
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

  if (deleteError) {
    console.error("[content_items] delete failed", deleteError);
    return false;
  }

  const rows = rowsFromContent(businessId, socialPosts, waTemplates);
  if (rows.length === 0) return true;

  const { error: insertError } = await supabase.from("content_items").insert(rows);
  if (insertError) {
    console.error("[content_items] insert failed", insertError);
    return false;
  }

  return true;
}

async function savePlanContent(
  businessId: string,
  socialPosts: SocialPost[],
  waTemplates: WhatsappTemplate[],
): Promise<boolean> {
  const { data: planData, error: findError } = await supabase
    .from("generated_plans")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("[content_items] plan lookup failed", findError);
    return false;
  }

  const payload = {
    social_media_calendar: socialPosts
      .filter((post) => post.text.trim().length > 0)
      .map((post) => ({
        id: ensureContentItemId(post.id),
        platform: post.platform,
        type: post.type,
        text: post.text,
        image_prompt: post.image_prompt,
        created_at: post.created_at || new Date().toISOString(),
      })),
    whatsapp_templates: waTemplates
      .filter((template) => template.text.trim().length > 0)
      .map((template) => ({
        id: ensureContentItemId(template.id),
        name: template.name,
        text: template.text,
        created_at: template.created_at || new Date().toISOString(),
      })),
  };

  const { error } = planData?.id
    ? await supabase
        .from("generated_plans")
        .update(payload)
        .eq("id", planData.id)
    : await supabase.from("generated_plans").insert({
        business_id: businessId,
        mini_site_data: {},
        ...payload,
      });

  if (error) {
    console.error("[content_items] plan save failed", error);
    return false;
  }

  return true;
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
      return loadTableContent(businessId);
    }

    const migrated = await migratePlanContentToTable(businessId);
    if (migrated.socialPosts.length > 0 || migrated.waTemplates.length > 0) {
      return migrated;
    }

    return { socialPosts: [], waTemplates: [] };
  }

  if (!isLegacyDualReadEnabled()) {
    return EMPTY_LEGACY_CONTENT;
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
  if (savedToTable) {
    await clearLegacyPlanContent(businessId);
    return true;
  }

  return savePlanContent(businessId, socialPosts, waTemplates);
}