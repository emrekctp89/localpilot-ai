export type PaymentReturnStatus = "success" | "cancel";

export function onboardingDraftKey(userId: string) {
  return `localpilot-onboarding-draft-${userId}`;
}

export function activeBusinessKey(userId: string) {
  return `localpilot-active-business-${userId}`;
}

export function hasBusinessKey(userId: string) {
  return `localpilot-has-business-${userId}`;
}

export function businessCacheKey(userId: string) {
  return `localpilot-business-cache-${userId}`;
}

export function markEstablishedBusiness(userId: string, businessId: string) {
  window.localStorage.setItem(hasBusinessKey(userId), "true");
  window.localStorage.setItem(activeBusinessKey(userId), businessId);
}

export function cacheBusinessSnapshot<T extends object>(userId: string, business: T) {
  window.localStorage.setItem(businessCacheKey(userId), JSON.stringify(business));
}

export function readCachedBusiness<T extends { id?: string }>(userId: string): T | null {
  const raw = window.localStorage.getItem(businessCacheKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed?.id ? parsed : null;
  } catch {
    window.localStorage.removeItem(businessCacheKey(userId));
    return null;
  }
}

export function hasEstablishedBusiness(userId: string) {
  return window.localStorage.getItem(hasBusinessKey(userId)) === "true";
}

export function readPaymentReturn(): PaymentReturnStatus | null {
  if (typeof window === "undefined") return null;
  const payment = new URLSearchParams(window.location.search).get("payment");
  if (payment === "success" || payment === "cancel") {
    return payment;
  }
  return null;
}

export function readCheckoutSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("session_id");
}

export function clearPaymentReturnFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("payment") && !url.searchParams.has("session_id")) {
    return;
  }
  url.searchParams.delete("payment");
  url.searchParams.delete("session_id");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}