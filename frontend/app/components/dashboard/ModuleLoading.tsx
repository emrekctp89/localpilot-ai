interface ModuleLoadingProps {
  label?: string;
}

export default function ModuleLoading({
  label = "Yükleniyor...",
}: ModuleLoadingProps) {
  return (
    <div
      className="lp-card animate-fade-in-up p-6 sm:p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-8 w-2/3 max-w-xs animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
