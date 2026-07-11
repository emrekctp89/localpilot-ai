interface NavItem {
  href: string;
  label: string;
}

interface MiniSiteTopBarProps {
  businessName: string;
  ctaText: string;
  ctaHref: string;
  ctaExternal?: boolean;
  ctaIsWhatsApp?: boolean;
  themeBgClass: string;
  secondaryWhatsAppHref?: string | null;
  navItems?: NavItem[];
}

export default function MiniSiteTopBar({
  businessName,
  ctaText,
  ctaHref,
  ctaExternal = false,
  ctaIsWhatsApp = false,
  themeBgClass,
  secondaryWhatsAppHref,
  navItems = [],
}: MiniSiteTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <p className="min-w-0 truncate text-sm font-black tracking-tight text-slate-900 sm:text-base">
            {businessName}
          </p>
          {navItems.length > 0 ? (
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Sayfa bölümleri"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {secondaryWhatsAppHref ? (
            <a
              href={secondaryWhatsAppHref}
              target="_blank"
              rel="noreferrer"
              className="hidden min-h-10 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:inline-flex"
            >
              WhatsApp
            </a>
          ) : null}
          <a
            href={ctaHref}
            {...(ctaExternal
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white sm:text-sm ${
              ctaIsWhatsApp
                ? "bg-emerald-600 hover:bg-emerald-700"
                : themeBgClass
            }`}
          >
            {ctaIsWhatsApp ? (
              <span aria-hidden="true" className="text-sm">
                💬
              </span>
            ) : null}
            {ctaText}
          </a>
        </div>
      </div>
    </header>
  );
}
