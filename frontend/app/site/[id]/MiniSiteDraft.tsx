import type { Business } from "@/lib/domain-types";

interface MiniSiteDraftProps {
  business: Business;
}

export default function MiniSiteDraft({ business }: MiniSiteDraftProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-amber-50/80 via-white to-slate-50 px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl"
          aria-hidden="true"
        >
          🚧
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-amber-700">
          Taslak mod
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {business.name || "Bu işletme"} mini sitesi henüz yayında değil
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          İşletme sahibi Ayarlar&apos;dan siteyi{" "}
          <strong className="font-bold text-slate-800">Yayına Al</strong>{" "}
          yaptığında bu adres herkese açılır.
        </p>
        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Sahip önizlemesi: Ayarlar →{" "}
          <span className="font-semibold text-slate-700">Siteyi Önizle</span>{" "}
          (<span className="font-mono text-xs">(?preview=1)</span>
        </p>
      </div>
    </div>
  );
}