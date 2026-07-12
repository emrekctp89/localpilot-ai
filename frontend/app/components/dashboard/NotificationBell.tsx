"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessNotification } from "@/lib/repositories/business-notifications";
import {
  listBusinessNotifications,
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
} from "@/lib/repositories/business-notifications";

interface NotificationBellProps {
  businessId?: string | null;
  onOpenCrm?: () => void;
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

export default function NotificationBell({
  businessId,
  onOpenCrm,
  onOpenSettings,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BusinessNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!businessId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const list = await listBusinessNotifications(businessId, 25);
    setItems(list);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    void refresh();
    if (!businessId) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [businessId, refresh]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
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
      onOpenCrm?.();
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
                Henüz bildirim yok. Mini site lead’leri burada görünür.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleClickItem(item)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        item.read_at ? "opacity-70" : "bg-indigo-50/40"
                      }`}
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
