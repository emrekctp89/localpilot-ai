export type BillingInterval = "monthly" | "yearly";

export const BILLING_INTERVAL_STORAGE_KEY = "localpilot_billing_interval";

export interface ProPricingOption {
  amountTry: number;
  priceLabel: string;
  priceNote: string;
  savingsBadge?: string;
  monthlyEquivalentLabel?: string;
}

export const PRO_PRICING: Record<BillingInterval, ProPricingOption> = {
  monthly: {
    amountTry: 299,
    priceLabel: "₺299",
    priceNote: "/ ay",
  },
  yearly: {
    amountTry: 2990,
    priceLabel: "₺2.990",
    priceNote: "/ yıl",
    savingsBadge: "2 ay bedava",
    monthlyEquivalentLabel: "₺249/ay",
  },
};

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

export function readBillingInterval(): BillingInterval {
  if (typeof window === "undefined") return "monthly";
  const stored = window.localStorage.getItem(BILLING_INTERVAL_STORAGE_KEY);
  return stored === "yearly" ? "yearly" : "monthly";
}

export function writeBillingInterval(interval: BillingInterval): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BILLING_INTERVAL_STORAGE_KEY, interval);
}

export function getProPricing(interval: BillingInterval): ProPricingOption {
  return PRO_PRICING[interval];
}