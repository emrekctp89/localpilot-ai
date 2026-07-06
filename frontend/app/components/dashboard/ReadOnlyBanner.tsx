interface ReadOnlyBannerProps {
  message: string;
}

export default function ReadOnlyBanner({ message }: ReadOnlyBannerProps) {
  return (
    <div
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800"
      role="status"
    >
      {message}
    </div>
  );
}