import type { AiUsageSnapshot } from "@/lib/pro-funnel";
import { formatUsageLabel, PRO_FEATURES } from "@/lib/pro-funnel";

interface ProUpgradeBannerProps {
  usage: AiUsageSnapshot | null;
  onUpgrade?: () => void;
  compact?: boolean;
}

export default function ProUpgradeBanner({
  usage,
  onUpgrade,
  compact = false,
}: ProUpgradeBannerProps) {
  if (!usage || usage.is_pro) return null;

  const dailyLabel = formatUsageLabel(usage.daily);
  const monthlyLabel = formatUsageLabel(usage.monthly);
  const limitReached = !usage.can_use_ai;

  return (
    <section
      className={`rounded-2xl border ${
        limitReached
          ? "border-amber-200 bg-amber-50"
          : "border-indigo-100 bg-indigo-50"
      } ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
            Ücretsiz AI Kotası
          </p>
          <h3 className="mt-1 text-lg font-black text-gray-900">
            {limitReached
              ? "AI limitinize ulaştınız"
              : "Pro ile sınırsız AI kullanın"}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Günlük: <strong>{dailyLabel}</strong> · Aylık:{" "}
            <strong>{monthlyLabel}</strong>
          </p>
          {!compact && (
            <ul className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2">
                  <span aria-hidden="true">✦</span>
                  <span>
                    <strong>{feature.title}</strong>
                    {feature.freeAccess === "limited"
                      ? " — sınırlı erişim"
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Pro&apos;ya Yükselt
          </button>
        )}
      </div>
    </section>
  );
}