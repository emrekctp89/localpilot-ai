"use client";

import { useEffect, useRef } from "react";
import { attributeReferralCode } from "@/lib/repositories/partner-program";
import {
  clearStoredReferralCode,
  readStoredReferralCode,
} from "@/lib/referral-storage";

export function useReferralAttribution(userId: string | null, ready: boolean) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!ready || !userId || attemptedRef.current) return;
    const code = readStoredReferralCode();
    if (!code) return;

    attemptedRef.current = true;

    void (async () => {
      const result = await attributeReferralCode(code);
      if (result.status === "success" || result.status === "ignored") {
        clearStoredReferralCode();
      }
    })();
  }, [ready, userId]);
}