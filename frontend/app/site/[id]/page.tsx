import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  buildDefaultWhatsAppMessage,
  buildLocalBusinessJsonLd,
  buildMiniSiteSeo,
  buildWhatsAppDeepLink,
  isMiniSitePublished,
  normalizeWhatsAppNumber,
  resolveMiniSiteCtaActions,
  splitAboutParagraphs,
} from "@/lib/mini-site";
import { getMiniSitePublicUrl } from "@/lib/mini-site-domain";
import { loadPublicMiniSite } from "@/lib/repositories/public-mini-site";
import LeadForm from "./LeadForm";
import MiniSiteAbout from "./MiniSiteAbout";
import MiniSiteDraft from "./MiniSiteDraft";
import MiniSiteProducts from "./MiniSiteProducts";
import MiniSiteShare from "./MiniSiteShare";
import MiniSiteStickyCta from "./MiniSiteStickyCta";
import MiniSiteTopBar from "./MiniSiteTopBar";

async function loadMiniSiteContext(idOrSlug: string) {
  return loadPublicMiniSite(idOrSlug);
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
  const showProducts = productList.length > 0;
  const featureItems = (siteData.features || [])
    .map((feature) => feature?.trim())
    .filter((feature): feature is string => Boolean(feature));
  const aboutParagraphs = splitAboutParagraphs(siteData.about_us);
  const hasAbout = aboutParagraphs.length > 0;
  const hasFeatures = featureItems.length > 0;
  const hasTestimonials = (siteData.testimonials?.length || 0) > 0;
  const hasLocation = Boolean(
    business.address?.trim() ||
      business.city?.trim() ||
      business.working_hours?.trim(),
  );
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
  const ctaActions = resolveMiniSiteCtaActions({
    ctaText: siteData.cta_text,
    whatsappHref,
  });
  const phoneDigits = business.whatsapp_number
    ? normalizeWhatsAppNumber(business.whatsapp_number)
    : "";
  const phoneHref = phoneDigits ? `tel:+${phoneDigits}` : "";
  const mapsQuery = [business.address, business.city]
    .filter(Boolean)
    .join(", ");
  const mapsHref = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : "";
  const formatPrice = (price?: number | null) =>
    typeof price === "number"
      ? new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(price)
      : "Fiyat al";

  const navItems = [
    ...(hasAbout ? [{ href: "#hakkimizda", label: "Hakkımızda" }] : []),
    ...(hasFeatures ? [{ href: "#neden-biz", label: "Neden biz" }] : []),
    ...(showProducts ? [{ href: "#menu", label: "Ürünler" }] : []),
    ...(hasTestimonials
      ? [{ href: "#yorumlar", label: "Yorumlar" }]
      : []),
    ...(hasLocation ? [{ href: "#konum", label: "Konum" }] : []),
    { href: "#iletisim", label: "İletişim" },
  ];

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

  const ctaLabel = ctaActions.primary.label;
  const locationLabel = business.city?.trim()
    ? `${business.city} şehrinde hizmetinizde`
    : "Yerel işletmeniz için buradayız";

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-white via-gray-50 to-white pb-20 text-gray-900 sm:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {!isMiniSitePublished(siteData) && isOwnerPreview && (
        <div className="bg-amber-500 px-4 py-3 text-center text-sm font-bold text-white">
          Taslak önizleme — site henüz yayında değil. Ziyaretçiler bu sayfayı
          görmez.
        </div>
      )}

      <MiniSiteTopBar
        businessName={business.name || "İşletme"}
        ctaText={ctaLabel}
        ctaHref={ctaActions.primary.href}
        ctaExternal={ctaActions.primary.external}
        ctaIsWhatsApp={ctaActions.primary.isWhatsApp}
        themeBgClass={theme.bg}
        secondaryWhatsAppHref={ctaActions.secondaryWhatsAppHref}
        navItems={navItems}
      />

      {/* Hero section */}
      <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden px-4 sm:min-h-[85vh]">
        {/* Animated Background Globs */}
        <div
          className={`absolute top-0 -left-4 h-72 w-72 rounded-full ${theme.glow} opacity-30 mix-blend-multiply blur-2xl animate-blob`}
          aria-hidden="true"
        />

        <div
          className={`absolute top-0 -right-4 h-72 w-72 rounded-full ${theme.glow} opacity-30 mix-blend-multiply blur-2xl animate-blob animation-delay-2000`}
          aria-hidden="true"
        />

        <div
          className={`absolute -bottom-8 left-20 h-72 w-72 rounded-full ${theme.glow} opacity-30 mix-blend-multiply blur-2xl animate-blob animation-delay-4000`}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto mt-12 max-w-4xl text-center sm:mt-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full glass-panel px-4 py-2 text-sm font-semibold animate-fade-in-up sm:mb-8">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${theme.bg} opacity-75`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${theme.bg}`}
              />
            </span>
            {locationLabel}
          </div>

          <h1
            className="mb-4 text-4xl font-black tracking-tighter text-gray-900 animate-fade-in-up sm:mb-6 sm:text-6xl md:text-8xl"
            style={{ animationDelay: "100ms" }}
          >
            {business.name}
            {business.name?.endsWith(".") ? "" : "."}
          </h1>

          <p
            className="mx-auto mb-8 max-w-2xl text-lg font-medium leading-relaxed text-gray-500 animate-fade-in-up sm:mb-10 sm:text-xl md:text-2xl"
            style={{ animationDelay: "200ms" }}
          >
            {siteData.hero_slogan || "Mükemmel hizmetin yeni adresi."}
          </p>

          <div
            className="flex flex-col justify-center gap-3 animate-fade-in-up sm:flex-row sm:gap-4"
            style={{ animationDelay: "300ms" }}
          >
            <a
              href={ctaActions.primary.href}
              {...(ctaActions.primary.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-8 py-3.5 font-bold text-white shadow-lg transition-transform duration-300 hover:scale-105 ${
                ctaActions.primary.isWhatsApp
                  ? `bg-emerald-600 shadow-emerald-500/30`
                  : `${theme.bg} ${theme.shadow}`
              }`}
            >
              {ctaActions.primary.isWhatsApp ? (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.305-.88-.653-1.473-1.46-1.646-1.758-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.356.194 1.861.118.574-.086 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              ) : null}
              {ctaLabel}
            </a>

            {ctaActions.secondaryWhatsAppHref ? (
              <a
                href={ctaActions.secondaryWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-3.5 font-bold text-gray-900 transition-colors hover:bg-gray-50"
              >
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.305-.88-.653-1.473-1.46-1.646-1.758-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.356.194 1.861.118.574-.086 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                WhatsApp Hattı
              </a>
            ) : ctaActions.primary.isWhatsApp ? (
              <a
                href={ctaActions.formHref}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-3.5 font-bold text-gray-900 transition-colors hover:bg-gray-50"
              >
                İletişim formu
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-24 px-4 pb-24">
        <MiniSiteAbout
          aboutParagraphs={aboutParagraphs}
          features={featureItems}
          workingHours={business.working_hours}
          theme={{
            bg: theme.bg,
            text: theme.text,
            light: theme.light,
          }}
        />

        {showProducts && (
          <MiniSiteProducts
            products={productList}
            business={{
              name: business.name,
              city: business.city,
              whatsapp_number: business.whatsapp_number,
            }}
            siteData={siteData}
            theme={{
              bg: theme.bg,
              text: theme.text,
              light: theme.light,
              shadow: theme.shadow,
            }}
            formatPrice={formatPrice}
          />
        )}

        {hasLocation && (
          <section id="konum" className="scroll-mt-24 pt-4">
            <div className="mb-8">
              <span
                className={`mb-4 inline-flex rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest ${theme.light} ${theme.text}`}
              >
                Bizi bulun
              </span>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                Konum ve Çalışma Saatleri
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {(business.address || business.city) && (
                <div className="glass-panel rounded-3xl p-6 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Adres
                  </p>
                  <p className="mt-3 text-lg font-semibold text-gray-900">
                    {[business.address, business.city]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-5 inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold text-white ${theme.bg}`}
                    >
                      Haritada aç
                    </a>
                  ) : null}
                </div>
              )}

              {business.working_hours ? (
                <div className="glass-panel flex flex-col justify-center rounded-3xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Çalışma saatleri
                  </p>
                  <p className="mt-3 text-lg font-semibold text-gray-900">
                    {business.working_hours}
                  </p>
                </div>
              ) : null}

              {phoneHref || whatsappHref ? (
                <div className="glass-panel flex flex-col justify-center gap-3 rounded-3xl p-6 md:col-span-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Hızlı iletişim
                    </p>
                    <p className="mt-2 font-semibold text-gray-800">
                      Arayın veya WhatsApp yazın — form da hazır.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phoneHref ? (
                      <a
                        href={phoneHref}
                        className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800"
                      >
                        📞 Ara
                      </a>
                    ) : null}
                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"
                      >
                        💬 WhatsApp
                      </a>
                    ) : null}
                    <a
                      href="#iletisim"
                      className={`inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold text-white ${theme.bg}`}
                    >
                      Form
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {hasTestimonials && (
          <section id="yorumlar" className="scroll-mt-24 pt-12">
            <h2 className="mb-10 text-3xl font-black tracking-tight text-gray-900">
              Müşteri Deneyimleri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(siteData.testimonials || []).map((testi, idx) => (
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
        <section id="iletisim" className="mx-auto max-w-3xl scroll-mt-24 pt-12 pb-12">
          <div className="relative overflow-hidden rounded-[2.5rem] glass-panel-dark p-8 text-white shadow-2xl md:p-12">
            <div
              className={`absolute top-0 right-0 h-64 w-64 rounded-full opacity-20 blur-3xl ${theme.bg}`}
            />

            <div className="relative z-10 mb-8 text-center md:mb-10">
              <h2 className="mb-3 text-3xl font-black text-white">
                Bize Ulaşın / Randevu Alın
              </h2>

              <p className="font-medium text-gray-400">
                Formu doldurun; en kısa sürede dönüş yapalım.
              </p>
            </div>

            {(phoneHref || mapsHref || business.working_hours || whatsappHref) && (
              <div className="relative z-10 mb-8 flex flex-wrap justify-center gap-2">
                {phoneHref ? (
                  <a
                    href={phoneHref}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
                  >
                    📞 Ara
                  </a>
                ) : null}
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    💬 WhatsApp
                  </a>
                ) : null}
                {mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
                  >
                    📍 Harita
                  </a>
                ) : null}
                {business.working_hours ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300">
                    ⏰ {business.working_hours}
                  </span>
                ) : null}
              </div>
            )}

            <LeadForm
              businessId={businessId}
              businessName={business.name}
              themeButtonClass={`${theme.bg} hover:brightness-110`}
            />
          </div>
        </section>
      </main>

      {/* Footer — white-label: hide LocalPilot credit when custom domain is active */}
      <footer className="mt-auto border-t border-gray-200/60 bg-white/50 py-8 text-center backdrop-blur-lg">
        <p className="mb-1 text-sm font-semibold text-gray-900">
          {business.name}
        </p>
        {business.address || business.working_hours ? (
          <p className="mx-auto mt-1 max-w-md px-4 text-xs text-gray-500">
            {[business.address, business.working_hours]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <MiniSiteShare
            title={business.name || "Mini site"}
            url={canonicalUrl}
            className={`rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold ${theme.text} transition hover:bg-gray-50`}
          />
          <a
            href="#iletisim"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
          >
            İletişim
          </a>
        </div>

        {business.custom_domain_status === "active" &&
        business.custom_domain ? null : (
          <p className="mt-4 text-xs text-gray-500">
            Bu dijital vitrin{" "}
            <a href="/" className={`font-bold ${theme.text} hover:underline`}>
              LocalPilot AI
            </a>{" "}
            ile hazırlandı.
          </p>
        )}
      </footer>

      <MiniSiteStickyCta
        ctaText={ctaLabel}
        ctaHref={ctaActions.primary.href}
        ctaExternal={ctaActions.primary.external}
        ctaIsWhatsApp={ctaActions.primary.isWhatsApp}
        secondaryWhatsAppHref={ctaActions.secondaryWhatsAppHref}
        formHref={ctaActions.formHref}
        themeBgClass={theme.bg}
      />
    </div>
  );
}
