"use client";

import React, { useEffect, useRef } from "react";

interface TabMenuProps {
  visibleTabIds: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ALL_TABS = [
  {
    id: "ozet",
    title: "Vitrin",
    short: "Vitrin",
    icon: "📊",
    activeClass: "bg-gray-900 text-white shadow-xl shadow-gray-900/20",
  },
  {
    id: "karar",
    title: "Karar Merkezi",
    short: "Karar",
    icon: "🎯",
    activeClass: "bg-violet-700 text-white shadow-xl shadow-violet-700/20",
  },
  {
    id: "is_akisi",
    title: "İş Akışı",
    short: "Akış",
    icon: "🔄",
    activeClass: "bg-cyan-700 text-white shadow-xl shadow-cyan-700/20",
  },
  {
    id: "icerik",
    title: "İçerik",
    short: "İçerik",
    icon: "📱",
    activeClass: "bg-purple-600 text-white shadow-xl shadow-purple-600/20",
  },
  {
    id: "crm",
    title: "Müşteri",
    short: "CRM",
    icon: "👥",
    activeClass: "bg-rose-600 text-white shadow-xl shadow-rose-600/20",
  },
  {
    id: "randevu",
    title: "Randevu",
    short: "Randevu",
    icon: "📅",
    activeClass: "bg-teal-600 text-white shadow-xl shadow-teal-600/20",
  },
  {
    id: "siparis",
    title: "Sipariş",
    short: "Sipariş",
    icon: "📦",
    activeClass: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20",
  },
  {
    id: "menu",
    title: "Menü",
    short: "Menü",
    icon: "📋",
    activeClass: "bg-pink-600 text-white shadow-xl shadow-pink-600/20",
  },
  {
    id: "kasa",
    title: "Finans",
    short: "Finans",
    icon: "💰",
    activeClass: "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20",
  },
  {
    id: "google_business",
    title: "Google Profil",
    short: "Google",
    icon: "📍",
    activeClass: "bg-yellow-600 text-white shadow-xl shadow-yellow-600/20",
  },
  {
    id: "personel",
    title: "Görevler",
    short: "Görev",
    icon: "✅",
    activeClass: "bg-slate-600 text-white shadow-xl shadow-slate-600/20",
  },
  {
    id: "araclar",
    title: "AI Modelleri",
    short: "AI",
    icon: "✨",
    activeClass: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20",
  },
  {
    id: "ayarlar",
    title: "Ayarlar",
    short: "Ayar",
    icon: "⚙️",
    activeClass: "bg-gray-800 text-white shadow-xl shadow-gray-800/20",
  },
  {
    id: "platform",
    title: "Platform",
    short: "Platform",
    icon: "🛡️",
    activeClass: "bg-slate-800 text-white shadow-xl shadow-slate-800/20",
  },
] as const;

export default function TabMenu({
  visibleTabIds,
  activeTab,
  setActiveTab,
}: TabMenuProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const visibleTabs = ALL_TABS.filter((tab) =>
    (visibleTabIds || []).includes(tab.id),
  );

  useEffect(() => {
    if (!visibleTabs.length) return;
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab, visibleTabs.length]);

  if (!visibleTabIds || visibleTabIds.length === 0) return null;

  return (
    <>
      {/* Desktop / tablet: top chip strip */}
      <div
        ref={scrollerRef}
        className="mb-6 hidden touch-pan-x overflow-x-auto overscroll-x-contain scrollbar-hide md:mb-8 md:block"
      >
        <div className="inline-flex min-w-full items-center gap-2 rounded-full border border-white/40 bg-white/70 p-2 shadow-sm backdrop-blur-xl">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                ref={isActive ? activeRef : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? `${tab.activeClass} scale-[1.02]`
                    : "bg-transparent text-gray-500 hover:bg-white/60 hover:text-gray-900"
                }`}
              >
                <span className="mr-1.5" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: sticky bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200/80 bg-white/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Panel sekmeleri"
      >
        <div className="flex touch-pan-x gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 scrollbar-hide">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold transition ${
                  isActive
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-500 active:bg-gray-100"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="max-w-[4rem] truncate">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
