/**
 * Dual-read: tablo boşken veya eksikken JSON (generated_plans) fallback.
 * Production'da tablolar doluysa NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ=true yapın.
 */
export function isLegacyDualReadEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ !== "true";
}