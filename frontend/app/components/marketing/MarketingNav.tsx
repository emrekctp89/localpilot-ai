import Link from "next/link";

interface MarketingNavProps {
  currentPath?: "/" | "/fiyatlandirma";
}

export default function MarketingNav({ currentPath = "/" }: MarketingNavProps) {
  const linkClass = (path: string) =>
    `text-sm font-bold transition ${
      currentPath === path
        ? "text-indigo-700"
        : "text-gray-600 hover:text-indigo-700"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            🚀
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-gray-900 sm:text-lg">
              LocalPilot
            </p>
            <p className="hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 xs:block sm:block">
              AI İşletme OS
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
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
            className="hidden min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100 sm:inline-flex"
          >
            Giriş Yap
          </Link>
          <Link
            href="/auth"
            className="inline-flex min-h-11 items-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 sm:px-5"
          >
            <span className="sm:hidden">Başla</span>
            <span className="hidden sm:inline">Ücretsiz Dene</span>
          </Link>
        </div>
      </div>
    </header>
  );
}