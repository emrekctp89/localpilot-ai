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
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <div className="pointer-events-none fixed left-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-5%] h-[30rem] w-[30rem] rounded-full bg-blue-300/20 blur-[120px]" />

      <MarketingNav currentPath="/" />

      <main>
        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                Yerel işletmeler için AI OS
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                İşletmenizi yönetin, AI ile büyütün.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
                LocalPilot; CRM, randevu, mini site, kampanya motoru ve Karar
                Merkezi&apos;ni sektörünüze göre tek panelde birleştirir.
                Kurulumdan itibaren uygulanabilir AI planı alırsınız.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/auth"
                  className="rounded-full bg-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700"
                >
                  Ücretsiz Başla
                </Link>
                <Link
                  href="/fiyatlandirma"
                  className="rounded-full border border-gray-200 bg-white px-8 py-4 text-sm font-bold text-gray-800 transition hover:bg-gray-50"
                >
                  Fiyatları Gör
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                {[
                  { label: "Kurulum", value: "5 dk" },
                  { label: "Sektör paketi", value: "7+" },
                  { label: "AI modül", value: "6+" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
                  >
                    <p className="text-2xl font-black text-indigo-700">
                      {stat.value}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 p-6 text-white">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-300">
                  Panel önizleme
                </p>
                <h2 className="mt-2 text-2xl font-black">Operasyon + AI özeti</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "Bugünkü randevu", value: "14" },
                    { label: "Açık lead", value: "9" },
                    { label: "AI kampanya", value: "3 hazır" },
                    { label: "Aktivasyon", value: "%80" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-white/10 p-4 backdrop-blur"
                    >
                      <p className="text-xs text-indigo-200">{item.label}</p>
                      <p className="mt-1 text-xl font-black">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-bold text-indigo-200">
                    Karar Merkezi önerisi
                  </p>
                  <p className="mt-1 text-sm text-white/90">
                    Geciken ödemeler için hatırlatma mesajı gönder — beklenen
                    etki: nakit akışı iyileşmesi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="ozellikler"
          className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
              Değer önerisi
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 sm:text-4xl">
              Tek panel, uçtan uca işletme büyümesi
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {MARKETING_VALUE_PROPS.map((prop) => (
              <article
                key={prop.id}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-3xl" aria-hidden="true">
                  {prop.icon}
                </span>
                <h3 className="mt-4 text-lg font-black text-gray-900">
                  {prop.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {prop.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
              Nasıl çalışır
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">
              3 adımda canlıya geçin
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <article
                key={step.step}
                className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                  {step.step}
                </span>
                <h3 className="mt-4 text-lg font-black text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="sektorler"
          className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
              Sektör demoları
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 sm:text-4xl">
              Sektörünüze özel panel deneyimi
            </h2>
            <p className="mt-3 text-gray-600">
              Her sektör paketi; metrik kartları, iş akışı aşamaları ve AI
              otomasyon önerileriyle gelir.
            </p>
          </div>

          <div className="mt-10">
            <SectorDemoShowcase demos={SECTOR_DEMOS} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-700 to-blue-800 px-8 py-12 text-white shadow-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-black">
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
                  className="rounded-full bg-white px-8 py-4 text-sm font-bold text-indigo-800 transition hover:bg-indigo-50"
                >
                  Hemen Başla
                </Link>
                <Link
                  href="/fiyatlandirma"
                  className="rounded-full border border-white/30 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
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