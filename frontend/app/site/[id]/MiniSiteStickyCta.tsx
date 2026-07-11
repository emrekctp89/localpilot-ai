"use client";

interface MiniSiteStickyCtaProps {
  ctaText: string;
  ctaHref: string;
  ctaExternal?: boolean;
  ctaIsWhatsApp?: boolean;
  secondaryWhatsAppHref?: string | null;
  formHref?: string;
  themeBgClass: string;
}

export default function MiniSiteStickyCta({
  ctaText,
  ctaHref,
  ctaExternal = false,
  ctaIsWhatsApp = false,
  secondaryWhatsAppHref,
  formHref = "#iletisim",
  themeBgClass,
}: MiniSiteStickyCtaProps) {
  // Primary is WhatsApp → single green bar (no duplicate WA + form optional).
  if (ctaIsWhatsApp) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 px-3 py-2 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl sm:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          <a
            href={formHref}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800"
          >
            Form
          </a>
          <a
            href={ctaHref}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white"
          >
            <span aria-hidden="true">💬</span>
            {ctaText}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 px-3 py-2 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={ctaHref}
          {...(ctaExternal ? { target: "_blank", rel: "noreferrer" } : {})}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-sm font-bold text-white ${themeBgClass}`}
        >
          {ctaText}
        </a>
        {secondaryWhatsAppHref ? (
          <a
            href={secondaryWhatsAppHref}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800"
          >
            <span aria-hidden="true">💬</span>
            WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
