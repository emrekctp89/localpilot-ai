"use client";

import type { BillingInterval } from "@/lib/pro-pricing";
import { PRO_PRICING } from "@/lib/pro-pricing";

interface BillingIntervalToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
}

export default function BillingIntervalToggle({
  value,
  onChange,
  className = "",
}: BillingIntervalToggleProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-1 ${className}`}
      role="group"
      aria-label="Faturalandırma dönemi"
    >
      {(["monthly", "yearly"] as const).map((interval) => {
        const active = value === interval;
        const savings = PRO_PRICING.yearly.savingsBadge;

        return (
          <button
            key={interval}
            type="button"
            onClick={() => onChange(interval)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-pressed={active}
          >
            {interval === "monthly" ? "Aylık" : "Yıllık"}
            {interval === "yearly" && savings ? (
              <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                {savings}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}