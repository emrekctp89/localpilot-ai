import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="lp-container flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white"
              aria-hidden="true"
            >
              L
            </span>
            <p className="text-lg font-black text-slate-900">LocalPilot AI</p>
          </div>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Yerel işletmeler için yapay zeka destekli yönetim paneli.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-600">
          <a href="/#ozellikler" className="hover:text-indigo-700">
            Özellikler
          </a>
          <a href="/#sektorler" className="hover:text-indigo-700">
            Sektörler
          </a>
          <Link href="/fiyatlandirma" className="hover:text-indigo-700">
            Fiyatlandırma
          </Link>
          <Link href="/auth" className="hover:text-indigo-700">
            Giriş
          </Link>
          <Link href="/dashboard" className="hover:text-indigo-700">
            Panel
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="lp-container py-4 text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} LocalPilot AI
        </div>
      </div>
    </footer>
  );
}
