"use client";

import { useEffect, useState } from "react";
import { confirmProCheckout } from "@/lib/ai-client";

interface UseProCheckoutActivationOptions {
  paymentReturn: "success" | "cancel" | null;
  checkoutSessionId: string | null;
  ready: boolean;
  refreshProStatus?: () => Promise<boolean>;
  onActivated?: () => void;
  onHandled?: () => void;
}

export function useProCheckoutActivation({
  paymentReturn,
  checkoutSessionId,
  ready,
  refreshProStatus,
  onActivated,
  onHandled,
}: UseProCheckoutActivationOptions) {
  const [billingMessage, setBillingMessage] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (!paymentReturn || !ready) return;

    if (paymentReturn === "cancel") {
      setBillingMessage("Ödeme işlemi iptal edildi. Hesabınızda değişiklik yok.");
      onHandled?.();
      return;
    }

    let cancelled = false;
    setBillingMessage("Ödeme tamamlandı. Pro üyeliğiniz etkinleştiriliyor...");
    setIsActivating(true);

    const tryActivate = async () => {
      try {
        const confirmed = await confirmProCheckout({
          session_id: checkoutSessionId,
        });
        if (confirmed.is_pro) {
          if (refreshProStatus) await refreshProStatus();
          onActivated?.();
          return true;
        }
      } catch (error) {
        console.warn("confirmProCheckout failed", error);
      }

      if (!refreshProStatus) return false;
      const active = await refreshProStatus();
      if (active) onActivated?.();
      return active;
    };

    const activatePro = async () => {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (cancelled) return;
        const active = await tryActivate();
        if (active) {
          setBillingMessage("Pro üyeliğiniz aktif!");
          setIsActivating(false);
          onHandled?.();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setBillingMessage(
          "Ödeme alındı. Pro aktivasyonu tamamlanamadı; Ayarlar'dan 'Üyelik Durumunu Yenile' ile tekrar deneyin.",
        );
        setIsActivating(false);
        onHandled?.();
      }
    };

    void activatePro();

    return () => {
      cancelled = true;
      setIsActivating(false);
    };
  }, [
    checkoutSessionId,
    onActivated,
    onHandled,
    paymentReturn,
    ready,
    refreshProStatus,
  ]);

  return { billingMessage, isActivating, setBillingMessage };
}