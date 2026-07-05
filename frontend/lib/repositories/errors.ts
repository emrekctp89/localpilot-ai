import type { PostgrestError } from "@supabase/supabase-js";

export function isMissingTableError(
  error: PostgrestError | null | undefined,
): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}