import Link from "next/link";

interface MarketingNavProps {
  currentPath?: "/" | "/fiyatlandirma";
}

export default function MarketingNav({ currentPath = "/" }: MarketingNavProps) {
  const linkClass = (path: string) =>
    `text-sm font-bold transition ${
      currentPath === path
        ? "text-indigo-700"
        : "text-slate-600 hover:text-indigo-700"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="lp-container flex items-center justify-between gap-3 py-3 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white"
            aria-hidden="true"
          >
            L
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">
              LocalPilot
            </p>
            <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:block">
              AI İşletme OS
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Pazarlama">
          <a href="/#ozellikler" className={linkClass("/")}>
            Özellikler
          </a>
          <a href="/#sektorler" className={linkClass("/")}>
            Sektörler
          </a>
          <Link href="/fiyatlandirma" className={linkClass("/fiyatlandirma")}>
            Fiyatlandırma
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/auth"
            className="hidden min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:inline-flex"
          >
            Giriş Yap
          </Link>
          <Link href="/auth" className="lp-btn-primary px-4 sm:px-5">
            <span className="sm:hidden">Başla</span>
            <span className="hidden sm:inline">Ücretsiz Dene</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
