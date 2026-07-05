interface RouteStatusProps {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: "neutral" | "error";
}

export default function RouteStatus({
  eyebrow = "LocalPilot",
  title,
  description,
  tone = "neutral",
}: RouteStatusProps) {
  const accent =
    tone === "error"
      ? "border-red-100 bg-red-50 text-red-600"
      : "border-indigo-100 bg-indigo-50 text-indigo-600";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 text-gray-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl font-black ${accent}`}
        >
          {tone === "error" ? "!" : "✨"}
        </div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>
      </div>
    </div>
  );
}
