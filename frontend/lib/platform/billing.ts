import type { Business } from "@/lib/domain-types";
import { PRO_PRICING, type BillingInterval } from "@/lib/pro-pricing";
import type { BusinessAccess } from "./access";

export type MultiBusinessBillingMode =
  | "single_business"
  | "multi_business"
  | "agency_portfolio";

export interface MultiBusinessBillingSummary {
  businessCount: number;
  billableBusinessCount: number;
  includedBusinessCount: number;
  additionalBusinessCount: number;
  mode: MultiBusinessBillingMode;
  monthlyTotalTry: number;
  yearlyTotalTry: number;
  recommendedInterval: BillingInterval;
  headline: string;
  nextAction: string;
}

const INCLUDED_BUSINESS_COUNT = 1;

export function buildMultiBusinessBillingSummary(
  businesses: Business[],
  access: BusinessAccess,
): MultiBusinessBillingSummary {
  const businessCount = businesses.filter((business) => business.id).length;
  const billableBusinessCount = Math.max(businessCount, 1);
  const additionalBusinessCount = Math.max(
    billableBusinessCount - INCLUDED_BUSINESS_COUNT,
    0,
  );
  const mode: MultiBusinessBillingMode = access.isAgencyAccount
    ? "agency_portfolio"
    : additionalBusinessCount > 0
      ? "multi_business"
      : "single_business";

  const monthlyTotalTry =
    billableBusinessCount * PRO_PRICING.monthly.amountTry;
  const yearlyTotalTry = billableBusinessCount * PRO_PRICING.yearly.amountTry;

  return {
    businessCount,
    billableBusinessCount,
    includedBusinessCount: INCLUDED_BUSINESS_COUNT,
    additionalBusinessCount,
    mode,
    monthlyTotalTry,
    yearlyTotalTry,
    recommendedInterval: additionalBusinessCount > 0 ? "yearly" : "monthly",
    headline: resolveBillingHeadline(mode, billableBusinessCount),
    nextAction: resolveBillingNextAction(mode),
  };
}

export function formatBillingAmount(amountTry: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amountTry);
}

function resolveBillingHeadline(
  mode: MultiBusinessBillingMode,
  billableBusinessCount: number,
): string {
  if (mode === "agency_portfolio") {
    return `${billableBusinessCount} işletmeli ajans portföyü`;
  }
  if (mode === "multi_business") {
    return `${billableBusinessCount} işletme için çoklu Pro taslağı`;
  }
  return "Tek işletme Pro planı";
}

function resolveBillingNextAction(mode: MultiBusinessBillingMode): string {
  if (mode === "agency_portfolio") {
    return "Ajans portföyü için işletme başına Pro aktivasyonu ve toplu fatura akışı tasarlanmalı.";
  }
  if (mode === "multi_business") {
    return "Her işletmenin Pro durumu ayrı izlenmeli; ödeme onayı tek checkout adımında alınmalı.";
  }
  return "Mevcut Pro checkout akışı tek işletme için yeterli.";
}
