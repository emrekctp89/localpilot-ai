import type { Business } from "@/lib/domain-types";

interface MiniSiteDraftProps {
  business: Business;
}

export default function MiniSiteDraft({ business }: MiniSiteDraftProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 py-24">
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-100 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">
          Taslak mod
        </p>
        <h1 className="mt-3 text-3xl font-black text-gray-900">
          {business.name} mini sitesi henüz yayında değil
        </h1>
        <p className="mt-4 text-gray-600">
          İşletme sahibi vitrin ayarlarından siteyi yayına aldığında bu adres
          herkese açılacak.
        </p>
        <p className="mt-6 text-sm text-gray-500">
          Sahip önizlemesi için ayarlardan &quot;Siteyi Önizle&quot; kullanın.
        </p>
      </div>
    </div>
  );
}