"use client";

import type { ActivationMetrics, ActivationMilestone } from "@/lib/activation-metrics";

interface AktivasyonMetrikleriProps {
  metrics: ActivationMetrics | null;
  loading?: boolean;
  error?: string;
  onNavigate?: (tab: string) => void;
}

function MilestoneRow({
  milestone,
  onNavigate,
}: {
  milestone: ActivationMilestone;
  onNavigate?: (tab: string) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
            milestone.completed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white text-gray-400"
          }`}
        >
          {milestone.completed ? "✓" : "○"}
        </span>
        <div>
          <p className="font-bold text-gray-900">{milestone.label}</p>
          <p className="text-sm text-gray-500">{milestone.description}</p>
          {milestone.completed && milestone.durationLabel && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
              Kurulumdan sonra {milestone.durationLabel}
            </p>
          )}
        </div>
      </div>

      {!milestone.completed && milestone.tab && onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(milestone.tab!)}
          className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
        >
          Başla
        </button>
      )}
    </li>
  );
}

export default function AktivasyonMetrikleri({
  metrics,
  loading = false,
  error = "",
  onNavigate,
}: AktivasyonMetrikleriProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="animate-pulse text-sm font-medium text-gray-500">
          Aktivasyon metrikleri hesaplanıyor...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (!metrics) return null;

  const completedMilestones = metrics.milestones.filter((item) => item.completed)
    .length;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
            Aktivasyon Metrikleri
          </p>
          <h3 className="mt-1 text-2xl font-black text-gray-900">
            %{metrics.onboardingCompletionRate} tamamlama
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {completedMilestones}/{metrics.milestones.length} kilometre taşı
            tamamlandı.
            {metrics.onboardingDurationLabel
              ? ` Onboarding süresi: ${metrics.onboardingDurationLabel}.`
              : ""}
          </p>
        </div>

        <div className="min-w-44 rounded-xl bg-indigo-50 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            İlerleme
          </p>
          <p className="text-3xl font-black text-indigo-700">
            %{metrics.onboardingCompletionRate}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${metrics.onboardingCompletionRate}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {metrics.milestones.map((milestone) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
  );
}