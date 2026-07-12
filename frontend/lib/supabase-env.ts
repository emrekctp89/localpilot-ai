/**
 * Vercel / .env paste hatalarına karşı URL ve key temizle.
 * - trim boşluk
 * - çok satırlı/çift yapıştırılmış key → ilk satırı al
 * - sondaki slash'i kırp
 */
export function sanitizeEnvValue(raw: string | undefined | null): string {
  if (!raw) return "";
  return (
    raw
      .replace(/^\uFEFF/, "")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) || ""
  );
}

export function sanitizeSupabaseUrl(raw: string | undefined | null): string {
  const value = sanitizeEnvValue(raw).replace(/\/+$/, "");
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function getSanitizedSupabaseConfig(env: {
  url?: string | null;
  anonKey?: string | null;
} = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}): { url: string; anonKey: string; configured: boolean } {
  const url = sanitizeSupabaseUrl(env.url);
  const anonKey = sanitizeEnvValue(env.anonKey);
  return { url, anonKey, configured: Boolean(url && anonKey) };
}
