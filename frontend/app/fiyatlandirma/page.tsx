import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "../components/marketing/MarketingFooter";
import MarketingNav from "../components/marketing/MarketingNav";
import PricingCards from "../components/marketing/PricingCards";
import { MARKETING_FAQ, PRICING_PLANS } from "@/lib/marketing-site";
import { FREE_AI_DAILY_LIMIT, FREE_AI_MONTHLY_LIMIT } from "@/lib/pro-funnel";

export const metadata: Metadata = {
  title: "Fiyatlandırma — LocalPilot AI",
  description:
    "Ücretsiz plan ile başlayın, Pro ile sınırsız AI ve gelişmiş büyüme araçlarına geçin.",
};

export default function PricingPage() {
  return (
    <div className="lp-page">
      <MarketingNav currentPath="/fiyatlandirma" />

      <main className="lp-container py-12 sm:py-16">
        <div className="max-w-3xl animate-fade-in-up">
          <p className="lp-eyebrow">Fiyatlandırma</p>
          <h1 className="lp-title mt-2 text-4xl sm:text-5xl">
            Basit planlar, net değer
          </h1>
          <p className="lp-lead mt-4">
            Ücretsiz planda tüm operasyon modüllerine erişin. Pro ile AI
            limitlerini kaldırın ve büyüme araçlarını tam açın.
          </p>
        </div>

        <div className="mt-12">
          <PricingCards plans={PRICING_PLANS} />
        </div>

        <section className="lp-card mt-16 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Plan farkları</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 pr-4 font-bold">Özellik</th>
                  <th className="py-3 pr-4 font-bold">Ücretsiz</th>
                  <th className="py-3 font-bold">Pro</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Operasyon paneli</td>
                  <td className="py-3 pr-4">✓</td>
                  <td className="py-3">✓</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Mini site + lead</td>
                  <td className="py-3 pr-4">✓</td>
                  <td className="py-3">✓</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">AI günlük / aylık limit</td>
                  <td className="py-3 pr-4">
                    {FREE_AI_DAILY_LIMIT} / {FREE_AI_MONTHLY_LIMIT}
                  </td>
                  <td className="py-3">Sınırsız</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Kampanya motoru</td>
                  <td className="py-3 pr-4">Kotalı</td>
                  <td className="py-3">Sınırsız</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Finans tahmini & churn</td>
                  <td className="py-3 pr-4">Kotalı</td>
                  <td className="py-3">Sınırsız</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Pro faturalandırma</td>
                  <td className="py-3 pr-4">—</td>
                  <td className="py-3">₺299/ay veya ₺2.990/yıl</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-black text-gray-900">Sık sorulanlar</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MARKETING_FAQ.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <h3 className="font-bold text-gray-900">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-gray-900 px-8 py-10 text-white">
          <h2 className="text-2xl font-black">Hazır mısınız?</h2>
          <p className="mt-2 max-w-2xl text-gray-300">
            Hesabınızı oluşturun, onboarding ile işletmenizi kurun ve panelde
            Pro yükseltmesini tek tıkla tamamlayın.
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-full bg-indigo-500 px-8 py-4 text-sm font-bold text-white transition hover:bg-indigo-400"
          >
            Ücretsiz Başla
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}