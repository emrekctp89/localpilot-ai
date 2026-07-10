import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "./components/marketing/MarketingFooter";
import MarketingNav from "./components/marketing/MarketingNav";
import SectorDemoShowcase from "./components/marketing/SectorDemoShowcase";
import {
  HOW_IT_WORKS,
  MARKETING_VALUE_PROPS,
  SECTOR_DEMOS,
} from "@/lib/marketing-site";

export const metadata: Metadata = {
  title: "LocalPilot AI — Yerel işletmeler için AI yönetim paneli",
  description:
    "CRM, randevu, mini site, AI kampanya ve Karar Merkezi ile yerel işletmenizi tek panelden büyütün.",
  openGraph: {
    title: "LocalPilot AI",
    description:
      "Yerel işletmeler için yapay zeka destekli operasyon ve büyüme paneli.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="lp-page">
      <div className="pointer-events-none fixed left-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-indigo-300/25 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-5%] h-[30rem] w-[30rem] rounded-full bg-sky-300/20 blur-[120px]" />

      <MarketingNav currentPath="/" />

      <main>
        <section className="lp-container relative pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="animate-fade-in-up">
              <p className="lp-eyebrow">Yerel işletmeler için AI OS</p>
              <h1 className="lp-title mt-4 text-4xl sm:text-5xl lg:text-6xl">
                İşletmenizi yönetin,
                <span className="block bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
                  AI ile büyütün.
                </span>
              </h1>
              <p className="lp-lead mt-6 max-w-xl">
                LocalPilot; CRM, randevu, mini site, kampanya motoru ve Karar
                Merkezi&apos;ni sektörünüze göre tek panelde birleştirir.
                Kurulumdan itibaren uygulanabilir AI planı alırsınız.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth" className="lp-btn-primary px-7 py-3.5">
                  Ücretsiz Başla
                </Link>
                <Link href="/fiyatlandirma" className="lp-btn-secondary px-7 py-3.5">
                  Fiyatları Gör
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500" aria-hidden="true">
                    ✓
                  </span>
                  Kart gerekmez
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500" aria-hidden="true">
                    ✓
                  </span>
                  5 dk kurulum
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500" aria-hidden="true">
                    ✓
                  </span>
                  Sektör paketleri
                </li>
              </ul>

              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                {[
                  { label: "Kurulum", value: "5 dk" },
                  { label: "Sektör", value: "7+" },
                  { label: "AI modül", value: "6+" },
                ].map((stat) => (
                  <div key={stat.label} className="lp-card p-4">
                    <p className="text-2xl font-black text-indigo-700">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel animate-fade-in-up rounded-[2rem] p-4 sm:p-6">
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-300">
                    Panel önizleme
                  </p>
                  <span className="lp-chip bg-white/10 text-indigo-100">
                    Canlı özet
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Operasyon + AI
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "Bugünkü randevu", value: "14" },
                    { label: "Açık lead", value: "9" },
                    { label: "AI kampanya", value: "3 hazır" },
                    { label: "Aktivasyon", value: "%80" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                    >
                      <p className="text-xs text-indigo-200">{item.label}</p>
                      <p className="mt-1 text-xl font-black">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                  <p className="text-sm font-bold text-indigo-200">
                    Karar Merkezi önerisi
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/90">
                    Geciken ödemeler için hatırlatma mesajı gönder — beklenen
                    etki: nakit akışı iyileşmesi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ozellikler" className="lp-container lp-section">
          <div className="max-w-2xl">
            <p className="lp-eyebrow">Değer önerisi</p>
            <h2 className="lp-title mt-2 text-3xl sm:text-4xl">
              Tek panel, uçtan uca işletme büyümesi
            </h2>
            <p className="lp-lead mt-3">
              Operasyon, müşteri ve AI büyümeyi aynı yerde toplayın — sekme
              karmaşası yok.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {MARKETING_VALUE_PROPS.map((prop) => (
              <article key={prop.id} className="lp-card-interactive p-6">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl"
                  aria-hidden="true"
                >
                  {prop.icon}
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-900">
                  {prop.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {prop.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-container lp-section pt-0">
          <div className="max-w-2xl">
            <p className="lp-eyebrow">Nasıl çalışır</p>
            <h2 className="lp-title mt-2 text-3xl">3 adımda canlıya geçin</h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <article
                key={step.step}
                className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white p-6 shadow-sm"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white shadow-md shadow-indigo-600/30">
                  {step.step}
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="sektorler" className="lp-container lp-section pt-0">
          <div className="max-w-2xl">
            <p className="lp-eyebrow">Sektör demoları</p>
            <h2 className="lp-title mt-2 text-3xl sm:text-4xl">
              Sektörünüze özel panel deneyimi
            </h2>
            <p className="lp-lead mt-3">
              Her sektör paketi; metrik kartları, iş akışı aşamaları ve AI
              otomasyon önerileriyle gelir.
            </p>
          </div>

          <div className="mt-10">
            <SectorDemoShowcase demos={SECTOR_DEMOS} />
          </div>
        </section>

        <section className="lp-container pb-20 sm:pb-24">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 px-6 py-12 text-white shadow-xl sm:px-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  İşletmenizi bugün dijitalleştirin
                </h2>
                <p className="mt-3 max-w-xl text-indigo-100">
                  Ücretsiz başlayın, ihtiyaç duyduğunuzda Pro ile sınırsız AI
                  gücüne geçin.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="inline-flex min-h-12 items-center rounded-full bg-white px-7 py-3 text-sm font-bold text-indigo-800 transition hover:bg-indigo-50"
                >
                  Hemen Başla
                </Link>
                <Link
                  href="/fiyatlandirma"
                  className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Planları Karşılaştır
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
