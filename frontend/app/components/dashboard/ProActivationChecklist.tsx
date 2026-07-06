import {
  activationProgress,
  type ActivationChecklistItem,
} from "@/lib/pro-funnel";

interface ProActivationChecklistProps {
  items: ActivationChecklistItem[];
  activatedAt?: string | null;
  onNavigate?: (tab: string) => void;
  onDismiss?: () => void;
}

export default function ProActivationChecklist({
  items,
  activatedAt,
  onNavigate,
  onDismiss,
}: ProActivationChecklistProps) {
  const progress = activationProgress(items);
  const allDone = progress === 100;

  if (allDone) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            Pro İlk 7 Gün
          </p>
          <h3 className="mt-1 text-xl font-black text-gray-900">
            Aktivasyon Kontrol Listesi
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {activatedAt
              ? `Pro üyeliğiniz ${new Date(activatedAt).toLocaleDateString("tr-TR")} tarihinde başladı.`
              : "Pro araçlarını hızla devreye almak için adımları tamamlayın."}
          </p>
        </div>
        <div className="min-w-40 rounded-xl bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            İlerleme
          </p>
          <p className="text-2xl font-black text-emerald-700">%{progress}</p>
        </div>
      </div>

      <ul className="divide-y divide-emerald-100 border-t border-emerald-100 bg-white">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                  item.completed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.completed ? "✓" : "○"}
              </span>
              <div>
                <p className="font-bold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
            {!item.completed && item.tab && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(item.tab!)}
                className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                Sekmeye Git
              </button>
            )}
          </li>
        ))}
      </ul>

      {onDismiss && (
        <div className="border-t border-emerald-100 bg-white px-5 py-3 text-right">
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm font-bold text-gray-500 hover:text-gray-700"
          >
            Listeyi gizle
          </button>
        </div>
      )}
    </section>
  );
}