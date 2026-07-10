interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="lp-btn-primary mt-6"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
