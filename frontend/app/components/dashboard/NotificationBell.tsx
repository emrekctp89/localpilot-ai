"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { BusinessNotification } from "@/lib/repositories/business-notifications";
import {
  listBusinessNotifications,
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
  subscribeBusinessNotifications,
} from "@/lib/repositories/business-notifications";
import {
  isNotificationTypeEnabled,
  leadFocusFromMetadata,
  readNotificationPrefs,
  type CrmLeadFocus,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import {
  buildWhatsAppDeepLink,
  normalizeWhatsAppNumber,
} from "@/lib/mini-site";
import { showBrowserNotification } from "@/lib/browser-notify";
import { useToast } from "../Toast";

interface NotificationBellProps {
  businessId?: string | null;
  onOpenCrm?: (focus?: CrmLeadFocus) => void;
  onOpenSettings?: () => void;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.round((Date.now() - then) / 60_000);
  if (diffMin < 1) return "şimdi";
  if (diffMin < 60) return `${diffMin} dk`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.round(hours / 24);
  return `${days} g`;
}

function iconForType(type: string): string {
  if (type === "lead.created") return "📩";
  if (type === "mini_site.published") return "🚀";
  if (type === "mini_site.draft") return "📝";
  if (type === "mini_site.updated") return "✏️";
  return "🔔";
}

function leadPhoneFromItem(item: BusinessNotification): string {
  const phone =
    typeof item.metadata?.phone === "string" ? item.metadata.phone : "";
  return phone.trim();
}

function leadNameFromItem(item: BusinessNotification): string {
  const name =
    typeof item.metadata?.full_name === "string"
      ? item.metadata.full_name
      : "";
  return name.trim();
}

export default function NotificationBell({
  businessId,
  onOpenCrm,
  onOpenSettings,
}: NotificationBellProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BusinessNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() =>
    businessId
      ? readNotificationPrefs(businessId)
      : {
          notifyLeads: true,
          notifyMiniSite: true,
          toastOnNew: true,
          browserPush: true,
        },
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!businessId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const list = await listBusinessNotifications(businessId, 25);
    const nextPrefs = readNotificationPrefs(businessId);
    setPrefs(nextPrefs);
    const filtered = list.filter((item) =>
      isNotificationTypeEnabled(item.type, nextPrefs),
    );
    setItems(filtered);
    knownIdsRef.current = new Set(filtered.map((item) => item.id));
    bootstrappedRef.current = true;
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    bootstrappedRef.current = false;
    knownIdsRef.current = new Set();
    void refresh();
    if (!businessId) return;

    // Poll fallback (Realtime may be unavailable until migration 018)
    const timer = window.setInterval(() => {
      void refresh();
    }, 45_000);

    const unsub = subscribeBusinessNotifications(businessId, {
      onInsert: (item) => {
        const currentPrefs = readNotificationPrefs(businessId);
        if (!isNotificationTypeEnabled(item.type, currentPrefs)) return;
        if (knownIdsRef.current.has(item.id)) return;
        knownIdsRef.current.add(item.id);
        setItems((current) => [item, ...current].slice(0, 25));
        if (bootstrappedRef.current && !item.read_at) {
          if (currentPrefs.toastOnNew) {
            showToast(
              item.title + (item.body ? `: ${item.body}` : ""),
              "success",
            );
          }
          if (currentPrefs.browserPush) {
            showBrowserNotification({
              title: item.title,
              body: item.body || undefined,
              tag: item.id,
              onClickUrl: "/dashboard",
            });
          }
        }
      },
      onUpdate: (item) => {
        setItems((current) =>
          current.map((row) => (row.id === item.id ? item : row)),
        );
      },
    });

    const onPrefs = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string }>).detail;
      if (detail?.businessId && detail.businessId !== businessId) return;
      void refresh();
    };
    window.addEventListener("localpilot:notification-prefs", onPrefs);

    return () => {
      window.clearInterval(timer);
      unsub();
      window.removeEventListener("localpilot:notification-prefs", onPrefs);
    };
  }, [businessId, refresh, showToast]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: globalThis.MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = items.filter((item) => !item.read_at).length;

  const handleClickItem = async (item: BusinessNotification) => {
    if (!item.read_at) {
      await markBusinessNotificationRead(item.id);
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, read_at: new Date().toISOString() }
            : row,
        ),
      );
    }
    setOpen(false);
    if (item.type === "lead.created") {
      onOpenCrm?.(leadFocusFromMetadata(item.metadata, item.id));
    } else if (
      item.type === "mini_site.updated" ||
      item.type === "mini_site.published" ||
      item.type === "mini_site.draft"
    ) {
      onOpenSettings?.();
    }
  };

  const handleMarkAll = async () => {
    if (!businessId || unread === 0) return;
    await markAllBusinessNotificationsRead(businessId);
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((row) => (row.read_at ? row : { ...row, read_at: now })),
    );
  };

  const handleWhatsApp = (
    event: ReactMouseEvent,
    item: BusinessNotification,
  ) => {
    event.stopPropagation();
    const phone = leadPhoneFromItem(item);
    const name = leadNameFromItem(item);
    const url = buildWhatsAppDeepLink(
      phone,
      name
        ? `Merhaba ${name}, mini siteden ilettiğiniz talebiniz hakkında yazıyorum.`
        : "Merhaba, mini siteden ilettiğiniz talebiniz hakkında yazıyorum.",
    );
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCall = (
    event: ReactMouseEvent,
    item: BusinessNotification,
  ) => {
    event.stopPropagation();
    const phone = leadPhoneFromItem(item);
    const digits = normalizeWhatsAppNumber(phone) || phone.replace(/\D/g, "");
    if (!digits) return;
    // tel: prefers national format when possible
    const tel = digits.startsWith("90") ? `0${digits.slice(2)}` : digits;
    window.location.href = `tel:${tel}`;
  };

  if (!businessId) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void refresh();
        }}
        className="lp-btn-ghost relative min-h-11 px-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
        aria-label={
          unread > 0
            ? `Bildirimler, ${unread} okunmamış`
            : "Bildirimler"
        }
        aria-expanded={open}
      >
        <span aria-hidden="true" className="text-lg">
          🔔
        </span>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-slate-900">Bildirimler</p>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={unread === 0}
              className="text-xs font-bold text-indigo-600 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              Tümünü okundu
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Yükleniyor…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {prefs.notifyLeads
                  ? "Henüz bildirim yok. Mini site lead’leri burada görünür."
                  : "Lead bildirimleri kapalı. Ayarlar’dan açabilirsiniz."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((item) => {
                  const phone = leadPhoneFromItem(item);
                  const isLead = item.type === "lead.created" && Boolean(phone);
                  return (
                    <li key={item.id}>
                      <div
                        className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          item.read_at ? "opacity-70" : "bg-indigo-50/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => void handleClickItem(item)}
                          className="flex min-w-0 flex-1 gap-3 text-left"
                        >
                          <span className="text-lg" aria-hidden="true">
                            {iconForType(item.type)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {item.title}
                              </span>
                              <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                                {formatRelative(item.created_at)}
                              </span>
                            </span>
                            {item.body ? (
                              <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                                {item.body}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {isLead ? (
                          <span className="flex shrink-0 flex-col gap-1 self-center">
                            <button
                              type="button"
                              onClick={(e) => handleWhatsApp(e, item)}
                              className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-black text-white hover:bg-emerald-600"
                              title="WhatsApp ile yaz"
                            >
                              WA
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCall(e, item)}
                              className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-black text-white hover:bg-slate-900"
                              title="Ara"
                            >
                              Ara
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
