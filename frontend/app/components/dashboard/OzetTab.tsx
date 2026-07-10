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
    <div className="space-y-6 animate-fade-in-up sm:space-y-8">
      {/* Karşılama + AI teşhis */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-5 text-white shadow-xl sm:rounded-3xl sm:p-8">
        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200">
            Bugünkü vitrin
          </p>
          <div className="mt-2 flex items-start gap-3">
            <span className="text-2xl sm:text-3xl" aria-hidden="true">
              👋
            </span>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Hoş geldin
              {business?.name ? (
                <>
                  ,{" "}
                  <span className="text-indigo-100">{business.name}</span>
                </>
              ) : null}
            </h2>
          </div>

          {diagnosis.summary ? (
            <p className="mt-4 max-w-2xl border-l-4 border-indigo-300/80 pl-4 text-base leading-relaxed text-indigo-50 sm:text-lg">
              &quot;{diagnosis.summary}&quot;
            </p>
          ) : (
            <p className="mt-3 max-w-2xl text-base text-indigo-100 sm:text-lg">
              İşletmenizin dijital kontrol merkezi. Alttaki sekmelerden
              operasyonu yönetin, AI önerilerini uygulayın.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            <button
              type="button"
              onClick={() => window.open(`/site/${business?.id}`, "_blank")}
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-indigo-800 shadow-md transition hover:bg-indigo-50"
            >
              Mini sitemi görüntüle ➔
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ayarlar")}
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Ayarlar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("karar")}
              className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-bold text-indigo-100 transition hover:bg-white/10"
            >
              Karar Merkezi
            </button>
          </div>
        </div>

        <div
          className="pointer-events-none absolute -right-8 -bottom-10 text-8xl opacity-15 sm:text-9xl"
          aria-hidden="true"
        >
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
