"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "localpilot_pwa_install_dismissed";

export default function PwaRegister() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW optional — ignore registration failures in dev
    });

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallEvent(promptEvent);
      try {
        if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        // ignore
      }
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    try {
      await installEvent.userChoice;
    } catch {
      // ignore
    }
    setShowBanner(false);
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!showBanner || !installEvent) return null;

  return (
    <div
      className="fixed inset-x-0 z-[60] p-3 sm:p-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Uygulamayı yükle"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-lg backdrop-blur-xl sm:p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-lg font-black text-white">
          L
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-gray-900">LocalPilot’i yükle</p>
          <p className="text-xs text-gray-600">
            Ana ekrana ekle — daha hızlı erişim, uygulama gibi kullanım.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
          >
            Yükle
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full px-3 py-2 text-xs font-bold text-gray-500"
          >
            Sonra
          </button>
        </div>
      </div>
    </div>
  );
}
