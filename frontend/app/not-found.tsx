import Link from "next/link";
import RouteStatus from "./components/RouteStatus";

export default function NotFound() {
  return (
    <div>
      <RouteStatus
        tone="error"
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa kaldırılmış veya bağlantı hatalı olabilir."
      />
      <div className="fixed inset-x-0 bottom-8 flex justify-center px-4">
        <Link
          href="/dashboard"
          className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-gray-700"
        >
          Panele Dön
        </Link>
      </div>
    </div>
  );
}
