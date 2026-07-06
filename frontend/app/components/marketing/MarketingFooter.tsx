import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p className="text-lg font-black text-gray-900">LocalPilot AI</p>
          <p className="mt-1 text-sm text-gray-500">
            Yerel işletmeler için yapay zeka destekli yönetim paneli.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 text-sm font-bold text-gray-600">
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
    </footer>
  );
}