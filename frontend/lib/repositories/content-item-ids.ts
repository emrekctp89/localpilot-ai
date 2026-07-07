const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureContentItemId(id: string | number | undefined): string {
  const normalized = id === undefined || id === null ? "" : String(id);
  if (UUID_RE.test(normalized)) {
    return normalized;
  }
  return crypto.randomUUID();
}