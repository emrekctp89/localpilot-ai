// frontend/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import {
  getSanitizedSupabaseConfig,
  sanitizeEnvValue,
  sanitizeSupabaseUrl,
} from "./supabase-env";

export { sanitizeEnvValue, sanitizeSupabaseUrl, getSanitizedSupabaseConfig };

const { url: supabaseUrl, anonKey: supabaseAnonKey } =
  getSanitizedSupabaseConfig();

if (typeof window !== "undefined") {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[LocalPilot] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY eksik veya geçersiz. Vercel Environment Variables kontrol edin.",
    );
  } else {
    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (rawKey.includes("\n") || rawKey.split("eyJ").length > 2) {
      console.warn(
        "[LocalPilot] SUPABASE_ANON_KEY satır sonu veya tekrar içeriyordu; ilk geçerli değer kullanıldı. Vercel env'i tek satır JWT yapın.",
      );
    }
  }
}

// Placeholder avoids opaque "fetch Invalid value" when env is missing at build.
const clientUrl = supabaseUrl || "https://placeholder.supabase.co";
const clientKey =
  supabaseAnonKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwbGFjZWhvbGRlciJ9.placeholder";

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
