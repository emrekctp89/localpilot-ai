import React from "react";
import type { Business, GeneratedPlan } from "@/lib/domain-types";
import { useActivationMetrics } from "@/hooks/useActivationMetrics";
import AktivasyonMetrikleri from "./AktivasyonMetrikleri";
import OperasyonOzeti from "./OperasyonOzeti";
// import { supabase } from '@/lib/supabase'; // Gerçek projede bunu açın

// --- CANVAS ÖNİZLEME (MOCK) İÇİN GEÇİCİ VERİ ---
// Gerçek ortamda bu veriler 'plan' prop'u üzerinden FastAPI'nin kaydettiği yerlerden (Supabase) gelecek.
const mockPlan = {
  business_diagnosis: {
    summary:
      "Bölgenizdeki potansiyel müşteriler dijitalde sizi bulamıyor. Online varlığınız güçlenmeli.",
    main_growth_opportunity:
      "Paket servis veya online sipariş altyapısı kurarak %40 ciro artışı yakalayabilirsiniz.",
    biggest_risk:
      "Rakiplerinizin dijitalde daha aktif olması müşteri kaybına yol açabilir.",
    ideal_first_focus:
      "Google Benim İşletmem profilinizi optimize etmek ve haritalarda görünür olmak.",
  },
  quick_wins: [
    "WhatsApp işletme hesabınıza menünüzü katalog olarak ekleyin.",
    "Camınıza 'Menümüz ve Sipariş İçin Okutun' yazılı QR kod asın.",
    "Sadık 5 müşterinizden bugün Google haritalarda yorum yapmasını isteyin.",
  ],
  next_7_days_plan: [
    {
      day: 1,
      task: "Google Benim İşletmem hesabını güncelle ve yeni fotoğraflar yükle.",
      expected_result: "Haritalarda görünürlük artışı.",
    },
    {
      day: 2,
      task: "En kârlı 3 ürününü belirle ve WhatsApp kataloğuna fiyatlarıyla ekle.",
      expected_result: "WhatsApp üzerinden hızlı sipariş alabilme.",
    },
    {
      day: 3,
      task: "Eski müşterilerine 'Size özel %10 indirim' temalı WhatsApp mesajı gönder.",
      expected_result: "Tekrar eden satış (Retention) yaratmak.",
    },
  ],
  campaigns: [
    {
      campaign_name: "Hafta Sonu Fırsatı",
      strategy: "Sınırlı süreli indirim hissi yaratmak.",
    },
  ],
};
// ----------------------------------------------------------

interface OzetTabProps {
  business: Business;
  plan?: GeneratedPlan | null;
  setActiveTab: (tab: string) => void; // 🚀 Menü değiştirmek için eklendi
}

export default function OzetTab({
  business,
  plan,
  setActiveTab,
}: OzetTabProps) {
  const activationMetrics = useActivationMetrics(business);

  // Canvas'ta hata vermemesi için plan yoksa mock veriyi kullanıyoruz.
  const activePlan = plan?.business_diagnosis ? plan : mockPlan;

  const diagnosis = activePlan?.business_diagnosis || {};
  const quickWins = activePlan?.quick_wins || [];
  const next7Days = activePlan?.next_7_days_plan || [];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 🌟 1. KARŞILAMA VE ANA TEŞHİS KARTI */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👋</span>
            <h2 className="text-3xl font-black tracking-tight">
              Hoş Geldin, {business?.name || "İşletme Sahibi"}!
            </h2>
          </div>

          {diagnosis.summary ? (
            <p className="text-blue-100 text-lg max-w-2xl mt-4 leading-relaxed border-l-4 border-blue-400 pl-4">
              &quot;{diagnosis.summary}&quot;
            </p>
          ) : (
            <p className="text-blue-100 text-lg max-w-2xl mt-2">
              İşletmenizin dijital kontrol merkezine hoş geldiniz. Soldaki
              menüden modülleri kullanmaya başlayabilirsiniz.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            {/* 🚀 BUTONLAR ARTIK ÇALIŞIYOR */}
            <button
              onClick={() => window.open(`/site/${business?.id}`, "_blank")}
              className="bg-white text-indigo-800 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-50 transition transform hover:-translate-y-0.5"
            >
              Mini Sitemi Görüntüle ➔
            </button>
            <button
              onClick={() => setActiveTab("ayarlar")}
              className="bg-indigo-600/50 border border-indigo-400 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600/70 transition backdrop-blur-sm"
            >
              Ayarlara Git
            </button>
          </div>
        </div>

        {/* Dekoratif Arka Plan */}
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-20 pointer-events-none transform -rotate-12">
          🚀
        </div>
      </div>

      <AktivasyonMetrikleri
        metrics={activationMetrics.metrics}
        loading={activationMetrics.loading}
        error={activationMetrics.error}
        onNavigate={setActiveTab}
      />

      {/* 📊 2. YAPAY ZEKA İŞLETME TEŞHİSİ */}
      <OperasyonOzeti business={business} setActiveTab={setActiveTab} />

      {diagnosis.main_growth_opportunity && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl bg-emerald-100 p-2 rounded-lg">🎯</span>
              <h3 className="font-bold text-gray-800">En Büyük Fırsat</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {diagnosis.main_growth_opportunity}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl bg-red-100 p-2 rounded-lg">⚠️</span>
              <h3 className="font-bold text-gray-800">Ana Risk Faktörü</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {diagnosis.biggest_risk}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl bg-blue-100 p-2 rounded-lg">⚡</span>
              <h3 className="font-bold text-gray-800">İlk Odak Noktası</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {diagnosis.ideal_first_focus}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ⚡ 3. HIZLI KAZANIMLAR */}
        {quickWins.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  💸 Hızlı Kazanımlar
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Bugün uygulayıp hemen sonuç alabileceğiniz tavsiyeler.
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {quickWins.map((win: string, index: number) => (
                <li
                  key={index}
                  className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed pt-1 group-hover:text-gray-900 transition">
                    {win}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 🗓️ 4. 7 GÜNLÜK CEO REÇETESİ */}
        {next7Days.length > 0 && (
          <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-800 p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🗓️ 7 Günlük Büyüme Ajandası
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Sisteminizi oturtmak için adım adım görevleriniz.
              </p>
            </div>

            <div className="space-y-4 relative z-10">
              {next7Days.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-gray-800 text-gray-400"}`}
                    >
                      G{item.day}
                    </div>
                    {index !== next7Days.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-800 my-1"></div>
                    )}
                  </div>
                  <div
                    className={`pb-6 pt-2 ${index === 0 ? "opacity-100" : "opacity-70"}`}
                  >
                    <h4 className="font-bold text-gray-200 text-sm mb-1">
                      {item.task}
                    </h4>
                    <p className="text-xs text-indigo-400 flex items-center gap-1">
                      <span>🎯</span> Hedef: {item.expected_result}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
