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
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            🚀
          </span>
          <div>
            <p className="text-lg font-black tracking-tight text-gray-900">
              LocalPilot
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
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

        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="hidden rounded-full px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100 sm:inline-flex"
          >
            Giriş Yap
          </Link>
          <Link
            href="/auth"
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Ücretsiz Dene
          </Link>
        </div>
      </div>
    </header>
  );
}