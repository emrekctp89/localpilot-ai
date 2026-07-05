import React from "react";

interface TabMenuProps {
  activeModules: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function TabMenu({
  activeModules,
  activeTab,
  setActiveTab,
}: TabMenuProps) {
  if (!activeModules) return null;

  const RENDERED_TABS = new Set([
    "ozet",
    "karar",
    "is_akisi",
    "icerik",
    "crm",
    "randevu",
    "siparis",
    "personel",
    "google_business",
    "kasa",
    "menu",
    "araclar",
    "ayarlar",
  ]);

  const ALL_TABS = [
    {
      id: "ozet",
      title: "📊 Vitrin",
      activeClass: "bg-gray-900 text-white shadow-xl shadow-gray-900/20",
    },
    {
      id: "karar",
      title: "Karar Merkezi",
      activeClass: "bg-violet-700 text-white shadow-xl shadow-violet-700/20",
    },
    {
      id: "is_akisi",
      title: "İş Akışı",
      activeClass: "bg-cyan-700 text-white shadow-xl shadow-cyan-700/20",
    },
    {
      id: "icerik",
      title: "📱 İçerik",
      activeClass: "bg-purple-600 text-white shadow-xl shadow-purple-600/20",
    },
    {
      id: "crm",
      title: "👥 Müşteri",
      activeClass: "bg-rose-600 text-white shadow-xl shadow-rose-600/20",
    },
    {
      id: "randevu",
      title: "📅 Randevu",
      activeClass: "bg-teal-600 text-white shadow-xl shadow-teal-600/20",
    },
    {
      id: "siparis",
      title: "📦 Sipariş",
      activeClass: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20",
    },
    {
      id: "menu",
      title: "📋 Menü",
      activeClass: "bg-pink-600 text-white shadow-xl shadow-pink-600/20",
    },
    {
      id: "kasa",
      title: "💰 Finans",
      activeClass: "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20",
    },
    {
      id: "sosyal_medya",
      title: "📲 Sosyal",
      activeClass: "bg-sky-600 text-white shadow-xl shadow-sky-600/20",
    },
    {
      id: "google_business",
      title: "Google Profil",
      activeClass: "bg-yellow-600 text-white shadow-xl shadow-yellow-600/20",
    },
    {
      id: "personel",
      title: "✅ Görevler",
      activeClass: "bg-slate-600 text-white shadow-xl shadow-slate-600/20",
    },
    {
      id: "araclar",
      title: "✨ AI Modelleri",
      activeClass: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20",
    },
    {
      id: "ayarlar",
      title: "⚙️ Ayarlar",
      activeClass: "bg-gray-800 text-white shadow-xl shadow-gray-800/20",
    },
  ];

  // Görünür sekmeleri filtreleme
  const visibleTabs = ALL_TABS.filter(
    (tab) =>
      RENDERED_TABS.has(tab.id) &&
      (activeModules.includes(tab.id) ||
        tab.id === "ozet" ||
        tab.id === "karar" ||
        tab.id === "is_akisi" ||
        tab.id === "icerik" ||
        tab.id === "randevu" ||
        tab.id === "siparis" ||
        tab.id === "personel" ||
        tab.id === "google_business" ||
        tab.id === "araclar" ||
        tab.id === "ayarlar"),
  );

  return (
    <div className="flex overflow-x-auto gap-2 mb-8 p-2 scrollbar-hide glass-panel rounded-full border border-white/40 shadow-sm items-center">
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
              isActive
                ? `${tab.activeClass} scale-105`
                : "bg-transparent text-gray-500 hover:bg-white/60 hover:text-gray-900"
            }`}
          >
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}
