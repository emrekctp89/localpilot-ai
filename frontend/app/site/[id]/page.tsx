import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { MiniSiteData, Product } from "@/lib/domain-types";
import {
  buildDefaultWhatsAppMessage,
  buildLocalBusinessJsonLd,
  buildMiniSiteSeo,
  buildWhatsAppDeepLink,
  isMiniSitePublished,
} from "@/lib/mini-site";
import {
  getMiniSitePublicUrl,
  looksLikeUuid,
  normalizeSiteSlug,
} from "@/lib/mini-site-domain";
import type { Business } from "@/lib/domain-types";
import LeadForm from "./LeadForm";
import MiniSiteDraft from "./MiniSiteDraft";

async function loadBusinessByIdOrSlug(idOrSlug: string) {
  const key = idOrSlug.trim();
  if (!key) return null;

  if (looksLikeUuid(key)) {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", key)
      .maybeSingle();
    return (data as Business | null) ?? null;
  }

  const slug = normalizeSiteSlug(key);
  if (!slug) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("site_slug", slug)
    .maybeSingle();
  return (data as Business | null) ?? null;
}

async function loadMiniSiteContext(idOrSlug: string) {
  const business = await loadBusinessByIdOrSlug(idOrSlug);
  if (!business?.id) {
    return {
      business: null as Business | null,
      siteData: {} as MiniSiteData,
      products: [] as Product[],
    };
  }

  const businessId = business.id;

  const { data: plan } = await supabase
    .from("generated_plans")
    .select("mini_site_data")
    .eq("business_id", businessId)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId);

  return {
    business,
    siteData: (plan?.mini_site_data || {}) as MiniSiteData,
    products: (products || []) as Product[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { business, siteData } = await loadMiniSiteContext(resolvedParams.id);

  if (!business) {
    return {
      title: "Sayfa Bulunamadı",
    };
  }

  const { title, description } = buildMiniSiteSeo(business, siteData);
  const canonicalUrl = getMiniSitePublicUrl(business);
  const published = isMiniSitePublished(siteData);
  const ogImage = siteData.og_image_url?.trim();

  return {
    title,
    description,
    robots: published ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: business.name || "LocalPilot Mini Site",
      locale: "tr_TR",
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: title }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function BusinessSite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const isOwnerPreview = resolvedSearchParams.preview === "1";

  const { business, siteData, products: productList } =
    await loadMiniSiteContext(resolvedParams.id);

  if (!business?.id) return notFound();

  const businessId = business.id;

  if (!isMiniSitePublished(siteData) && !isOwnerPreview) {
    return <MiniSiteDraft business={business} />;
  }
  const activeModules = business.active_modules || [];
  const featuredProducts = productList.slice(0, 3);
  const canonicalUrl = getMiniSitePublicUrl(business);
  const structuredData = buildLocalBusinessJsonLd(
    business,
    siteData,
    productList,
    canonicalUrl,
  );
  const whatsappMessage = buildDefaultWhatsAppMessage(business, siteData);
  const whatsappHref = business.whatsapp_number
    ? buildWhatsAppDeepLink(business.whatsapp_number, whatsappMessage)
    : "";
  const productCategories = Array.from(
    new Set(
      productList
        .map((product) => product.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  );
  const formatPrice = (price?: number | null) =>
    typeof price === "number"
      ? new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(price)
      : "Fiyat al";

  const themeColor = business.theme_config?.primaryColor || "blue";

  const colorMap: Record<
    string,
    {
      bg: string;
      text: string;
      glow: string;
      light: string;
      border: string;
      shadow: string;
    }
  > = {
    blue: {
      bg: "bg-blue-600",
      text: "text-blue-600",
      glow: "bg-blue-400",
      light: "bg-blue-50/50",
      border: "border-blue-100",
      shadow: "shadow-blue-500/30",
    },
    green: {
      bg: "bg-emerald-600",
      text: "text-emerald-600",
      glow: "bg-emerald-400",
      light: "bg-emerald-50/50",
      border: "border-emerald-100",
      shadow: "shadow-emerald-500/30",
    },
    rose: {
      bg: "bg-rose-600",
      text: "text-rose-600",
      glow: "bg-rose-400",
      light: "bg-rose-50/50",
      border: "border-rose-100",
      shadow: "shadow-rose-500/30",
    },
    amber: {
      bg: "bg-amber-500",
      text: "text-amber-600",
      glow: "bg-amber-300",
      light: "bg-amber-50/50",
      border: "border-amber-100",
      shadow: "shadow-amber-500/30",
    },
    purple: {
      bg: "bg-violet-600",
      text: "text-violet-600",
      glow: "bg-violet-400",
      light: "bg-violet-50/50",
      border: "border-violet-100",
      shadow: "shadow-violet-500/30",
    },
    gray: {
      bg: "bg-gray-800",
      text: "text-gray-800",
      glow: "bg-gray-400",
      light: "bg-gray-50/50",
      border: "border-gray-200",
      shadow: "shadow-gray-500/30",
    },
    black: {
      bg: "bg-black",
      text: "text-black",
      glow: "bg-gray-500",
      light: "bg-gray-100/50",
      border: "border-gray-200",
      shadow: "shadow-gray-500/30",
    },
  };

  const theme = colorMap[themeColor] || colorMap.blue;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white text-gray-900 overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {!isMiniSitePublished(siteData) && isOwnerPreview && (
        <div className="bg-amber-500 px-4 py-3 text-center text-sm font-bold text-white">
          Taslak önizleme — site henüz yayında değil.
        </div>
      )}
      {/* Hero section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden px-4">
        {/* Animated Background Globs */}
        <div
          className={`absolute top-0 -left-4 w-72 h-72 ${theme.glow} rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob`}
        />

        <div
          className={`absolute top-0 -right-4 w-72 h-72 ${theme.glow} rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000`}
        />

        <div
          className={`absolute -bottom-8 left-20 w-72 h-72 ${theme.glow} rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000`}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center mt-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-semibold mb-8 animate-fade-in-up">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.bg} opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${theme.bg}`}
              />
            </span>
            {business.city} şehrinde hizmetinizde
          </div>

          <h1
            className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-gray-900 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            {business.name}.
          </h1>

          <p
            className="text-xl md:text-2xl font-medium text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            {siteData.hero_slogan || "Mükemmel hizmetin yeni adresi."}
          </p>

          <div
            className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <a
              href="#iletisim"
              className={`${theme.bg} text-white px-8 py-4 rounded-2xl font-bold shadow-lg ${theme.shadow} hover:scale-105 transition-transform duration-300`}
            >
              {siteData.cta_text || "Bize Ulaşın"}
            </a>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.305-.88-.653-1.473-1.46-1.646-1.758-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.356.194 1.861.118.574-.086 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                WhatsApp Hattı
              </a>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-24 space-y-24">
        {/* About and feature cards */}
        <section className="bento-grid grid-cols-1 md:grid-cols-3">
          {siteData.about_us && (
            <div className="md:col-span-2 glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-32 h-32 ${theme.light} rounded-bl-full -z-10`}
              />

              <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-4">
                Hakkımızda
              </h2>

              <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed">
                {siteData.about_us}
              </p>

              {business.working_hours && (
                <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-gray-500">
                  <span className="bg-gray-100 p-2 rounded-lg">⏰</span>
                  {business.working_hours}
                </div>
              )}
            </div>
          )}

          {siteData.features
            ?.slice(0, 2)
            .map((feature: string, idx: number) => (
              <div
                key={idx}
                className="glass-panel rounded-3xl p-8 flex flex-col justify-center hover:-translate-y-1 transition-transform duration-300"
              >
                <span
                  className={`w-12 h-12 rounded-full ${theme.light} ${theme.text} flex items-center justify-center text-xl mb-6`}
                >
                  {idx === 0 ? "✨" : "🛡️"}
                </span>

                <h3 className="font-bold text-xl text-gray-900">{feature}</h3>
              </div>
            ))}
        </section>

        {/* Products and services */}
        {activeModules.includes("menu") && (
          <section id="menu" className="pt-12">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-10">
              <div>
                <span
                  className={`inline-flex px-4 py-1.5 rounded-full ${theme.light} ${theme.text} text-xs font-black uppercase tracking-widest mb-4`}
                >
                  {productList.length} seçenek yayında
                </span>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                  Ürünler ve Hizmetler
                </h2>
                <p className="text-gray-500 mt-3 max-w-2xl text-lg">
                  En çok tercih edilen ürün ve hizmetleri tek yerde inceleyin.
                  Detay için iletişim formundan ya da WhatsApp hattından
                  ulaşabilirsiniz.
                </p>
              </div>

              {productCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productCategories.slice(0, 5).map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-gray-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-gray-600"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {featuredProducts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {featuredProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={`glass-panel rounded-3xl p-6 relative overflow-hidden min-h-64 flex flex-col justify-between ${
                      index === 0 ? "md:col-span-2" : ""
                    }`}
                  >
                    <div
                      className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${theme.light}`}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <span
                          className={`rounded-full ${theme.light} ${theme.text} px-3 py-1 text-xs font-black uppercase tracking-widest`}
                        >
                          {product.category || "Genel"}
                        </span>
                        <span className={`text-xl font-black ${theme.text}`}>
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      <h3 className="text-2xl font-black text-gray-900 leading-tight">
                        {product.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        {product.description ||
                          "Bu ürün hakkında detaylı bilgi almak için bize ulaşın."}
                      </p>
                    </div>

                    <a
                      href="#iletisim"
                      className={`relative mt-6 inline-flex w-fit rounded-xl ${theme.bg} px-4 py-2 text-sm font-bold text-white shadow-lg ${theme.shadow}`}
                    >
                      Detay Al
                    </a>
                  </article>
                ))}
              </div>
            )}

            {productList.length > featuredProducts.length && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {productList.slice(featuredProducts.length).map((product) => (
                  <article
                    key={product.id}
                    className="group glass-panel rounded-2xl p-5 flex gap-4 items-start hover:border-gray-300 transition-colors"
                  >
                    <div
                      className={`mt-1 h-11 w-11 rounded-2xl ${theme.light} ${theme.text} flex items-center justify-center font-black shrink-0`}
                    >
                      {product.name.slice(0, 1).toLocaleUpperCase("tr-TR")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400">
                            {product.category || "Genel"}
                          </p>
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-gray-600 transition-colors">
                            {product.name}
                          </h3>
                        </div>
                        <span
                          className={`font-black text-lg ${theme.text} whitespace-nowrap`}
                        >
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      {product.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {productList.length === 0 && (
              <div className="glass-panel rounded-3xl p-8 md:p-10 text-center">
                <div
                  className={`mx-auto mb-5 h-14 w-14 rounded-2xl ${theme.light} ${theme.text} flex items-center justify-center text-2xl font-black`}
                >
                  +
                </div>
                <h3 className="text-2xl font-black text-gray-900">
                  Ürün ve hizmet listesi yakında
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-gray-500">
                  En güncel ürünler, hizmetler ve fiyat bilgileri için bize
                  ulaşın. Ekibimiz size hızlıca dönüş yapar.
                </p>
                <a
                  href="#iletisim"
                  className={`mt-6 inline-flex rounded-xl ${theme.bg} px-5 py-3 text-sm font-bold text-white shadow-lg ${theme.shadow}`}
                >
                  Bilgi Al
                </a>
              </div>
            )}
          </section>
        )}

        {/* Testimonials */}
        {siteData.testimonials && siteData.testimonials.length > 0 && (
          <section className="pt-12">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-10">
              Müşteri Deneyimleri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {siteData.testimonials.map((testi, idx) => (
                <div key={idx} className="glass-panel rounded-3xl p-8 relative">
                  <div
                    className={`text-6xl absolute top-4 right-6 opacity-10 ${theme.text} font-serif`}
                  >
                    &quot;
                  </div>

                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-400">
                        ★
                      </span>
                    ))}
                  </div>

                  <p className="text-lg text-gray-700 font-medium mb-6 relative z-10 leading-relaxed">
                    {testi.comment}
                  </p>

                  <p className="font-bold text-gray-900 uppercase tracking-wide text-sm">
                    {testi.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact form */}
        <section id="iletisim" className="max-w-3xl mx-auto pt-12 pb-12">
          <div className="glass-panel-dark text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-64 h-64 ${theme.bg} opacity-20 rounded-full blur-3xl`}
            />

            <div className="relative z-10 text-center mb-10">
              <h2 className="text-3xl font-black mb-3 text-white">
                Bize Ulaşın / Randevu Alın
              </h2>

              <p className="text-gray-400 font-medium">
                Bize ulaşın, detayları hemen görüşelim.
              </p>
            </div>

            <LeadForm
              businessId={businessId}
              businessName={business.name}
              themeButtonClass={`${theme.bg} hover:brightness-110`}
            />
          </div>
        </section>
      </main>

      {/* Footer — white-label: hide LocalPilot credit when custom domain is active */}
      <footer className="border-t border-gray-200/60 bg-white/50 backdrop-blur-lg py-8 text-center mt-auto">
        <p className="text-sm font-semibold text-gray-900 mb-1">
          {business.name}
        </p>

        {business.custom_domain_status === "active" &&
        business.custom_domain ? null : (
          <p className="text-xs text-gray-500">
            Bu dijital vitrin{" "}
            <a href="/" className={`font-bold ${theme.text} hover:underline`}>
              LocalPilot AI
            </a>{" "}
            tarafından saniyeler içinde oluşturulmuştur.
          </p>
        )}
      </footer>
    </div>
  );
}
