const FEATURE_ICONS = ["✨", "🛡️", "🚀"] as const;
const FEATURE_ACCENTS = [
  "Güven",
  "Kalite",
  "Hız",
] as const;

interface MiniSiteAboutProps {
  aboutParagraphs: string[];
  features: string[];
  workingHours?: string | null;
  theme: {
    bg: string;
    text: string;
    light: string;
  };
}

export default function MiniSiteAbout({
  aboutParagraphs,
  features,
  workingHours,
  theme,
}: MiniSiteAboutProps) {
  const hasAbout = aboutParagraphs.length > 0;
  const hasFeatures = features.length > 0;

  if (!hasAbout && !hasFeatures) return null;

  return (
    <>
      {hasAbout ? (
        <section id="hakkimizda" className="scroll-mt-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm md:p-12">
            <div
              className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-70 blur-2xl ${theme.light}`}
              aria-hidden="true"
            />
            <div className="relative">
              <p
                className={`text-xs font-black uppercase tracking-[0.2em] ${theme.text}`}
              >
                Hakkımızda
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                Bizi yakından tanıyın
              </h2>
              <div className="mt-6 max-w-3xl space-y-4">
                {aboutParagraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className={`leading-relaxed text-gray-700 ${
                      index === 0
                        ? "text-lg font-medium md:text-xl"
                        : "text-base md:text-lg"
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              {workingHours ? (
                <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${theme.light}`}
                    aria-hidden="true"
                  >
                    ⏰
                  </span>
                  <span>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Çalışma saatleri
                    </span>
                    {workingHours}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {hasFeatures ? (
        <section
          id="neden-biz"
          className="scroll-mt-24"
          aria-labelledby="neden-biz-heading"
        >
          <div className="mb-8 max-w-2xl">
            <p
              className={`text-xs font-black uppercase tracking-[0.2em] ${theme.text}`}
            >
              Neden bizi seçmeliler?
            </p>
            <h2
              id="neden-biz-heading"
              className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
            >
              Farkımızı oluşturan yanlar
            </h2>
            <p className="mt-3 text-base text-gray-500 md:text-lg">
              Ziyaretçilerinize güvence veren kısa vaatler — her kart bir
              neden.
            </p>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${
              features.length === 1
                ? "md:grid-cols-1 md:max-w-xl"
                : features.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-3"
            }`}
          >
            {features.slice(0, 3).map((feature, idx) => (
              <article
                key={`${feature}-${idx}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md md:p-7"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${theme.bg} opacity-80`}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${theme.light}`}
                    aria-hidden="true"
                  >
                    {FEATURE_ICONS[idx] || "✦"}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-300">
                    0{idx + 1}
                  </span>
                </div>
                <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-gray-400">
                  {FEATURE_ACCENTS[idx] || "Öne çıkan"}
                </p>
                <h3 className="mt-2 text-xl font-black leading-snug text-gray-900">
                  {feature}
                </h3>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
