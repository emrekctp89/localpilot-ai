/**
 * Hosts that belong to the LocalPilot app (not white-label mini sites).
 */

export function stripPort(host: string): string {
  return host.trim().toLowerCase().split(":")[0] || "";
}

export function isPlatformHost(
  host: string,
  appUrl: string | undefined | null = process.env.NEXT_PUBLIC_APP_URL,
): boolean {
  const h = stripPort(host);
  if (!h) return true;

  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1"
  ) {
    return true;
  }

  // Vercel preview / production default hosts
  if (h.endsWith(".vercel.app")) return true;

  if (appUrl) {
    try {
      const appHost = stripPort(new URL(appUrl).host);
      if (appHost && h === appHost) return true;
    } catch {
      // ignore invalid NEXT_PUBLIC_APP_URL
    }
  }

  // Optional comma-separated extra platform hosts
  const extra = process.env.PLATFORM_HOSTS?.split(",") ?? [];
  for (const entry of extra) {
    if (stripPort(entry) === h) return true;
  }

  return false;
}
