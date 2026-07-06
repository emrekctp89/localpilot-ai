"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/domain-types";
import type { BusinessAccess, BusinessMemberRole } from "@/lib/platform/access";
import { roleLabel } from "@/lib/platform/access";
import { logAuditEvent } from "@/lib/platform/audit";
import { WEBHOOK_EVENTS } from "@/lib/platform/webhooks";
import { useLocale } from "@/hooks/useLocale";
import { listAuditLogs } from "@/lib/repositories/audit-logs";
import {
  inviteBusinessMember,
  listBusinessMembers,
  removeBusinessMember,
} from "@/lib/repositories/business-members";
import {
  createBusinessApiKey,
  createBusinessWebhook,
  deleteBusinessWebhook,
  listBusinessApiKeys,
  listBusinessWebhooks,
  revokeBusinessApiKey,
  type BusinessApiKeyRecord,
  type BusinessWebhookRecord,
} from "@/lib/repositories/platform-integrations";
import type { AuditLogEntry } from "@/lib/platform/audit";
import type { BusinessMember } from "@/lib/platform/access";

interface PlatformTabProps {
  business: Business;
  access: BusinessAccess;
  businesses: Business[];
  accountEmail?: string;
}

export default function PlatformTab({
  business,
  access,
  businesses,
  accountEmail = "",
}: PlatformTabProps) {
  const { locale, setLocale, t } = useLocale();
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<BusinessApiKeyRecord[]>([]);
  const [webhooks, setWebhooks] = useState<BusinessWebhookRecord[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BusinessMemberRole>("staff");
  const [apiKeyLabel, setApiKeyLabel] = useState("Entegrasyon");
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "lead.created",
  ]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const businessId = business.id || "";

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    const loadPlatformData = async () => {
      setLoading(true);
      const [nextMembers, nextAudit, nextKeys, nextHooks] = await Promise.all([
        listBusinessMembers(businessId),
        listAuditLogs(businessId),
        listBusinessApiKeys(businessId),
        listBusinessWebhooks(businessId),
      ]);
      if (cancelled) return;
      setMembers(nextMembers);
      setAuditLogs(nextAudit);
      setApiKeys(nextKeys);
      setWebhooks(nextHooks);
      setLoading(false);
    };

    void loadPlatformData();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const handleInvite = async () => {
    if (!access.canManageTeam || !businessId || !inviteEmail.trim()) return;
    try {
      const member = await inviteBusinessMember({
        businessId,
        invitedEmail: inviteEmail,
        role: inviteRole,
      });
      if (!member) return;
      setMembers((current) => [...current, member]);
      setInviteEmail("");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await logAuditEvent({
        businessId,
        actorId: session?.user.id,
        action: "member.invited",
        entityType: "business_member",
        entityId: member.id,
        metadata: { email: member.invited_email, role: member.role },
      });
      setStatusMessage("Ekip daveti kaydedildi.");
    } catch {
      setStatusMessage("Davet kaydedilemedi.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!access.canManageTeam) return;
    const ok = await removeBusinessMember(memberId);
    if (!ok) {
      setStatusMessage("Üye silinemedi.");
      return;
    }
    setMembers((current) => current.filter((member) => member.id !== memberId));
    setStatusMessage("Üye kaldırıldı.");
  };

  const handleCreateApiKey = async () => {
    if (!access.canManageIntegrations || !businessId) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { record, rawKey } = await createBusinessApiKey({
        businessId,
        createdBy: session.user.id,
        label: apiKeyLabel,
      });
      setApiKeys((current) => [record, ...current]);
      setCreatedApiKey(rawKey);
      await logAuditEvent({
        businessId,
        actorId: session.user.id,
        action: "api_key.created",
        entityType: "business_api_key",
        entityId: record.id,
        metadata: { label: record.label },
      });
      setStatusMessage("API anahtarı oluşturuldu.");
    } catch {
      setStatusMessage("API anahtarı oluşturulamadı.");
    }
  };

  const handleCreateWebhook = async () => {
    if (!access.canManageIntegrations || !businessId || !webhookUrl.trim()) return;
    try {
      const record = await createBusinessWebhook({
        businessId,
        url: webhookUrl,
        events: selectedEvents,
      });
      setWebhooks((current) => [record, ...current]);
      setWebhookUrl("");
      setStatusMessage("Webhook kaydedildi.");
    } catch {
      setStatusMessage("Webhook kaydedilemedi.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
          {t("platform.title")}
        </p>
        <h2 className="mt-1 text-2xl font-black text-gray-900">
          {business.name || "İşletme"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Rol: {roleLabel(access.role, locale)} · Hesap: {accountEmail}
          {access.isAgencyAccount ? ` · ${t("platform.agencyMode")}` : ""}
        </p>
        {businesses.length > 1 && (
          <p className="mt-2 text-sm text-gray-500">
            Ajans görünümü: {businesses.length} işletme yönetiliyor.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">{t("platform.language")}</h3>
        <div className="mt-4 flex gap-2">
          {(["tr", "en"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                locale === value
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">{t("platform.team")}</h3>
        {access.canManageTeam ? (
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="personel@ornek.com"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3"
            />
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as BusinessMemberRole)
              }
              className="rounded-xl border border-gray-200 px-4 py-3"
            >
              <option value="staff">Personel</option>
              <option value="read_only">Salt okunur</option>
            </select>
            <button
              type="button"
              onClick={handleInvite}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
            >
              Davet Et
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Ekip yönetimi yalnızca işletme sahibi tarafından yapılabilir.
          </p>
        )}

        <ul className="mt-5 space-y-2">
          <li className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
            {accountEmail || "Sahip"} — {roleLabel("owner", locale)}
          </li>
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm"
            >
              <span>
                {member.invited_email || member.user_id} —{" "}
                {roleLabel(member.role, locale)}
              </span>
              {access.canManageTeam && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  className="font-bold text-red-600"
                >
                  Kaldır
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">{t("platform.audit")}</h3>
        {loading ? (
          <p className="mt-3 text-sm text-gray-500">Yükleniyor...</p>
        ) : auditLogs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Henüz kayıt yok.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {auditLogs.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-gray-100 px-4 py-3 text-sm"
              >
                <p className="font-bold text-gray-900">{entry.action}</p>
                <p className="text-gray-500">
                  {entry.entity_type}
                  {entry.entity_id ? ` · ${entry.entity_id}` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">{t("platform.api")}</h3>
        {access.canManageIntegrations ? (
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={apiKeyLabel}
              onChange={(event) => setApiKeyLabel(event.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3"
              placeholder="Anahtar etiketi"
            />
            <button
              type="button"
              onClick={handleCreateApiKey}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"
            >
              API Anahtarı Oluştur
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            API anahtarları yalnızca işletme sahibi tarafından yönetilebilir.
          </p>
        )}
        {createdApiKey && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Yeni anahtar (bir kez gösterilir): <code>{createdApiKey}</code>
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {apiKeys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm"
            >
              <span>
                {key.label} · {key.key_prefix}...
              </span>
              {access.canManageIntegrations && (
                <button
                  type="button"
                  onClick={async () => {
                    await revokeBusinessApiKey(key.id);
                    setApiKeys((current) =>
                      current.filter((item) => item.id !== key.id),
                    );
                  }}
                  className="font-bold text-red-600"
                >
                  İptal
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">{t("platform.webhooks")}</h3>
        {access.canManageIntegrations ? (
          <>
            <input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://example.com/webhook"
              className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={(changeEvent) => {
                      setSelectedEvents((current) =>
                        changeEvent.target.checked
                          ? [...current, event]
                          : current.filter((item) => item !== event),
                      );
                    }}
                  />
                  {event}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreateWebhook}
              className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
            >
              Webhook Ekle
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Webhook yönetimi yalnızca işletme sahibi tarafından yapılabilir.
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {webhooks.map((hook) => (
            <li
              key={hook.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm"
            >
              <span>
                {hook.url} · {hook.events.join(", ")}
              </span>
              {access.canManageIntegrations && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteBusinessWebhook(hook.id);
                    setWebhooks((current) =>
                      current.filter((item) => item.id !== hook.id),
                    );
                  }}
                  className="font-bold text-red-600"
                >
                  Sil
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {statusMessage && (
        <p className="text-sm font-medium text-indigo-700">{statusMessage}</p>
      )}
    </div>
  );
}