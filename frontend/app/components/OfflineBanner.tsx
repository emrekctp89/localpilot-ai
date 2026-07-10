"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] bg-amber-500 px-4 py-2 text-center text-sm font-bold text-amber-950 shadow-md"
      role="status"
      aria-live="assertive"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      Çevrimdışısınız — değişiklikler kaydedilemeyebilir. Bağlantı gelince
      sayfayı yenileyin.
    </div>
  );
}
