import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Business,
  SocialPost,
  WhatsappTemplate,
} from "@/lib/domain-types";

interface IcerikTabProps {
  business: Business;
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
          record.type ||
            (record.day ? `${record.day}. Gün` : "") ||
            "Gönderi",
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

const formatHistoryDate = (date?: string) =>
  date
    ? new Date(date).toLocaleString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "İlk kurulum içeriği";

export default function IcerikTab({ business }: IcerikTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"sosyal" | "whatsapp">(
    "sosyal",
  );
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsappTemplate[]>([]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const targetId = business?.id || "preview";

      const { data } = await supabase
        .from("generated_plans")
        .select("social_media_calendar, whatsapp_templates")
        .eq("business_id", targetId)
        .maybeSingle();

      if (data) {
        setSocialPosts(
          normalizeSocialPosts(data.social_media_calendar || []),
        );
        setWaTemplates(
          normalizeWhatsappTemplates(data.whatsapp_templates || []),
        );
      } else if (!business?.id) {
        setSocialPosts([
          {
            id: 1,
            platform: "Instagram",
            type: "Gonderi",
            text: "Gunun yorgunlugunu atmak icin harika bir firsat. Sizi de en kisa surede bekliyoruz. #kalite #hizmet",
            image_prompt: "Sicak bir mekan gorseli",
            created_at: new Date().toISOString(),
          },
        ]);
        setWaTemplates([
          {
            id: 1,
            name: "Hos geldin Mesaji",
            text: "Merhaba. Size nasil yardimci olabiliriz? Fiyat ve hizmetlerimiz web sitemizde.",
            created_at: new Date().toISOString(),
          },
        ]);
      }

      setLoading(false);
    };

    fetchContent();
  }, [business?.id]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const persistContent = async (
    updates: Partial<{
      social_media_calendar: SocialPost[];
      whatsapp_templates: WhatsappTemplate[];
    }>,
  ) => {
    if (!business?.id) return;

    setHistoryStatus("saving");
    const { data: existingPlan, error: findError } = await supabase
      .from("generated_plans")
      .select("id")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      setHistoryStatus("error");
      throw findError;
    }

    const { error } = existingPlan?.id
      ? await supabase
          .from("generated_plans")
          .update(updates)
          .eq("id", existingPlan.id)
      : await supabase.from("generated_plans").insert([
          {
            business_id: business.id,
            mini_site_data: {},
            social_media_calendar: updates.social_media_calendar || [],
            whatsapp_templates: updates.whatsapp_templates || [],
          },
        ]);

    if (error) {
      setHistoryStatus("error");
      throw error;
    }

    setHistoryStatus("saved");
    window.setTimeout(() => setHistoryStatus("idle"), 2000);
  };

  const handleGenerateAI = () => {
    setIsGenerating(true);

    window.setTimeout(async () => {
      const createdAt = new Date().toISOString();

      if (activeSubTab === "sosyal") {
        const newPost: SocialPost = {
          id: Date.now(),
          platform: "Instagram",
          type: "Trend Gönderi",
          text: `Sadece en iyiyi arayanlar için. İşletmemizde yeni bir döneme başlıyoruz. Siz de bu kalitenin bir parçası olmak için sitemizi ziyaret edin veya DM atın.\n\n#Yenilik #${business?.city || "Şehir"} #${business?.industry?.replace(/\s+/g, "") || "Hizmet"}`,
          image_prompt: "Profesyonel ve dikkat çekici bir hizmet/ürün fotoğrafı",
          created_at: createdAt,
        };

        const newPostsList = [newPost, ...socialPosts];
        setSocialPosts(newPostsList);
        try {
          await persistContent({ social_media_calendar: newPostsList });
        } catch {
          setSocialPosts(socialPosts);
        }
      } else {
        const newTemplate: WhatsappTemplate = {
          id: Date.now(),
          name: "Yeni Kampanya Fikri",
          text: "Merhaba. Size özel yeni bir kampanya hazırladık. Bu hafta sonuna kadar geçerli fırsattan yararlanmak için sitemizi inceleyin: [LINK]",
          created_at: createdAt,
        };

        const newTemplatesList = [newTemplate, ...waTemplates];
        setWaTemplates(newTemplatesList);
        try {
          await persistContent({ whatsapp_templates: newTemplatesList });
        } catch {
          setWaTemplates(waTemplates);
        }
      }

      setIsGenerating(false);
    }, 1000);
  };

  const handleDeleteSocialPost = async (postId: SocialPost["id"]) => {
    const previousPosts = socialPosts;
    const nextPosts = socialPosts.filter((post) => post.id !== postId);
    setSocialPosts(nextPosts);

    try {
      await persistContent({ social_media_calendar: nextPosts });
    } catch {
      setSocialPosts(previousPosts);
    }
  };

  const handleDeleteWhatsappTemplate = async (
    templateId: WhatsappTemplate["id"],
  ) => {
    const previousTemplates = waTemplates;
    const nextTemplates = waTemplates.filter(
      (template) => template.id !== templateId,
    );
    setWaTemplates(nextTemplates);

    try {
      await persistContent({ whatsapp_templates: nextTemplates });
    } catch {
      setWaTemplates(previousTemplates);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 animate-pulse font-medium">
        Yapay zeka icerikleriniz yukleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block backdrop-blur-sm">
              Yapay Zeka Asistani
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Icerik ve Iletisim Merkezi
            </h2>
            <p className="text-purple-100 text-sm max-w-xl">
              Sosyal medya paylasimlari ve musterilere gondereceginiz WhatsApp
              mesajlari burada hazirlanir.
            </p>
          </div>

          <button
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="w-full md:w-auto bg-white text-purple-700 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-purple-50 transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isGenerating
              ? "Uretiliyor..."
              : activeSubTab === "sosyal"
                ? "Yeni Fikir Uret"
                : "Yeni Sablon Uret"}
          </button>
        </div>
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            İçerik Geçmişi
          </p>
          <p className="mt-1 text-sm font-medium text-gray-600">
            {socialPosts.length} sosyal gönderi, {waTemplates.length} WhatsApp
            şablonu kayıtlı.
          </p>
        </div>
        <p
          className={`text-sm font-bold ${
            historyStatus === "error"
              ? "text-red-600"
              : historyStatus === "saved"
                ? "text-emerald-600"
                : "text-gray-400"
          }`}
        >
          {historyStatus === "saving" && "Geçmiş kaydediliyor..."}
          {historyStatus === "saved" && "Geçmiş kaydedildi."}
          {historyStatus === "error" &&
            "Geçmiş kaydedilemedi. Değişiklik geri alındı."}
        </p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
        <button
          onClick={() => setActiveSubTab("sosyal")}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${
            activeSubTab === "sosyal"
              ? "bg-purple-100 text-purple-700"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Sosyal Medya Fikirleri
        </button>
        <button
          onClick={() => setActiveSubTab("whatsapp")}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${
            activeSubTab === "whatsapp"
              ? "bg-green-100 text-green-700"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          WhatsApp Sablonlari
        </button>
      </div>

      {activeSubTab === "sosyal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
          {socialPosts.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-gray-100">
              <h3 className="font-bold text-gray-800">
                Henuz icerik uretilmedi.
              </h3>
              <p className="text-gray-500 mt-1">
                Yeni fikir uret butonuna basarak yapay zekayi calistirin.
              </p>
            </div>
          ) : (
            socialPosts.map((post, idx) => (
              <div
                key={post.id || idx}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
              >
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-start gap-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      {post.platform}
                    </h4>
                    <p className="text-xs text-purple-600 font-medium">
                      {post.type}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-gray-400">
                      {formatHistoryDate(post.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(post.text, `post-${idx}`)}
                      className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition"
                    >
                      {copyStatus === `post-${idx}`
                        ? "Kopyalandı"
                        : "Kopyala"}
                    </button>
                    <button
                      onClick={() => handleDeleteSocialPost(post.id)}
                      disabled={historyStatus === "saving"}
                      className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <div className="p-5 flex-1">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {post.text}
                  </p>
                </div>
                {post.image_prompt && (
                  <div className="p-4 bg-purple-50/50 border-t border-purple-50 m-2 mt-0 rounded-xl">
                    <p className="text-xs font-bold text-purple-800 mb-1">
                      Gorsel Onerisi:
                    </p>
                    <p className="text-xs text-purple-600">
                      {post.image_prompt}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeSubTab === "whatsapp" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {waTemplates.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-gray-100">
              <h3 className="font-bold text-gray-800">
                Henuz sablon uretilmedi.
              </h3>
              <p className="text-gray-500 mt-1">
                Yeni sablon uret butonuna basarak yapay zekayi calistirin.
              </p>
            </div>
          ) : (
            waTemplates.map((template, idx) => (
              <div
                key={template.id || idx}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3 bg-green-50 border-b border-green-100 p-4">
                  <h4 className="font-bold text-green-900 text-sm">
                    {template.name}
                  </h4>
                  <p className="text-[11px] font-medium text-green-700/60">
                    {formatHistoryDate(template.created_at)}
                  </p>
                </div>
                <div className="p-5 flex-1 bg-green-50/40">
                  <div className="bg-green-100 border border-green-200 text-gray-800 p-3 rounded-r-xl rounded-bl-xl text-sm shadow-sm whitespace-pre-wrap inline-block">
                    {template.text}
                  </div>
                </div>
                <div className="bg-white border-t border-gray-100 p-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleCopy(template.text, `wa-${idx}`)}
                    className="bg-gray-50 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition"
                  >
                    {copyStatus === `wa-${idx}` ? "Kopyalandı" : "Kopyala"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(template.text)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-green-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition text-center flex items-center justify-center gap-1"
                  >
                    Gönder
                  </a>
                  <button
                    onClick={() =>
                      handleDeleteWhatsappTemplate(template.id)
                    }
                    disabled={historyStatus === "saving"}
                    className="rounded-lg border border-red-100 bg-white py-2 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
