import { normalizeReferralCode, REFERRAL_STORAGE_KEY } from "./partner-program";

export function readStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!stored) return null;
  const normalized = normalizeReferralCode(stored);
  return normalized || null;
}

export function writeStoredReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

export function captureReferralFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const ref = params.get("ref");
  if (!ref) return null;
  const normalized = normalizeReferralCode(ref);
  if (!normalized) return null;
  writeStoredReferralCode(normalized);
  return normalized;
}