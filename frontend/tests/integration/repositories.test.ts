import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PostgrestError } from "@supabase/supabase-js";
import { isMissingTableError } from "../../lib/repositories/errors";

function mockPostgrestError(
  partial: Pick<PostgrestError, "message" | "code"> &
    Partial<PostgrestError>,
): PostgrestError {
  return {
    details: "",
    hint: "",
    name: "PostgrestError",
    ...partial,
  } as PostgrestError;
}

describe("repository error helpers", () => {
  it("detects missing table errors from PostgREST", () => {
    assert.equal(
      isMissingTableError(
        mockPostgrestError({
          message:
            "Could not find the table 'public.appointments' in the schema cache",
          code: "PGRST205",
        }),
      ),
      true,
    );
  });

  it("ignores unrelated errors", () => {
    assert.equal(
      isMissingTableError(
        mockPostgrestError({
          message: "permission denied for table appointments",
          code: "42501",
        }),
      ),
      false,
    );
  });
});