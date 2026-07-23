/**
 * Browser Notification API helpers (panel open / background tab).
 */

export type BrowserNotifyPermission =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export function getBrowserNotifyPermission(): BrowserNotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as BrowserNotifyPermission;
}

export async function requestBrowserNotifyPermission(): Promise<BrowserNotifyPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotifyPermission;
  } catch {
    return getBrowserNotifyPermission();
  }
}

export function showBrowserNotification(input: {
  title: string;
  body?: string;
  tag?: string;
  onClickUrl?: string;
}): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") return false;

  try {
    const notification = new Notification(input.title, {
      body: input.body || "",
      tag: input.tag || "localpilot-notification",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    });
    if (input.onClickUrl) {
      notification.onclick = () => {
        try {
          window.focus();
          if (window.location.pathname !== "/dashboard") {
            window.location.href = input.onClickUrl!;
          }
        } catch {
          // ignore
        }
        notification.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}
