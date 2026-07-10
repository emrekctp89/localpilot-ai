import Link from "next/link";

export const metadata = {
  title: "Çevrimdışı — LocalPilot",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#fafafa] px-6 text-center text-gray-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-4xl" aria-hidden="true">
          📡
        </p>
        <h1 className="mt-4 text-2xl font-black tracking-tight">
          Bağlantı yok
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Şu an çevrimdışısınız. Bağlantı geldiğinde paneli yeniden
          yükleyebilirsiniz. Önceden açtığınız bazı sayfalar önbellekte
          kalabilir.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white"
          >
            Panele dön
          </Link>
          <Link
            href="/"
            className="rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-800"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
