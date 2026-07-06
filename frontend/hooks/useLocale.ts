"use client";

import { useCallback, useEffect, useState } from "react";
import { translate, type Locale } from "@/lib/i18n/messages";

const STORAGE_KEY = "localpilot-locale";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "tr" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => translate(locale, key, fallback),
    [locale],
  );

  return { locale, setLocale, t };
}