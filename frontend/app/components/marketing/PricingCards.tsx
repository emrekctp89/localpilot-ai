"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PricingPlan } from "@/lib/marketing-site";
import {
  getProPricing,
  readBillingInterval,
  writeBillingInterval,
  type BillingInterval,
} from "@/lib/pro-pricing";
import BillingIntervalToggle from "./BillingIntervalToggle";

interface PricingCardsProps {
  plans: PricingPlan[];
}

export default function PricingCards({ plans }: PricingCardsProps) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  useEffect(() => {
    Promise.resolve().then(() => setBillingInterval(readBillingInterval()));
  }, []);

  const handleBillingChange = (interval: BillingInterval) => {
    setBillingInterval(interval);
    writeBillingInterval(interval);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {plans.map((plan) => {
        const proPricing =
          plan.id === "pro" ? getProPricing(billingInterval) : null;

        return (
          <article
            key={plan.id}
            className={`rounded-3xl border p-6 sm:p-8 ${
              plan.highlighted
                ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-xl ring-1 ring-indigo-100"
                : "border-slate-200 bg-white shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="lp-eyebrow">{plan.name}</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                  {proPricing?.priceLabel ?? plan.priceLabel}
                </p>
                <p className="text-sm font-medium text-slate-500">
                  {proPricing?.priceNote ?? plan.priceNote}
                </p>
                {proPricing?.monthlyEquivalentLabel && (
                  <p className="mt-1 text-xs font-bold text-emerald-600">
                    {proPricing.monthlyEquivalentLabel} karşılığı
                  </p>
                )}
              </div>
              {plan.highlighted && (
                <span className="lp-chip bg-indigo-600 text-white">
                  Önerilen
                </span>
              )}
            </div>

            {plan.billingToggle && (
              <div className="mt-5">
                <BillingIntervalToggle
                  value={billingInterval}
                  onChange={handleBillingChange}
                />
              </div>
            )}

            <p className="mt-4 text-sm text-gray-600">{plan.description}</p>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="mt-0.5 text-emerald-500" aria-hidden="true">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={plan.ctaHref}
              className={`mt-8 ${
                plan.highlighted
                  ? "lp-btn-primary lp-btn-block"
                  : "lp-btn-secondary lp-btn-block"
              }`}
            >
              {plan.cta}
            </Link>
          </article>
        );
      })}
    </div>
  );
}