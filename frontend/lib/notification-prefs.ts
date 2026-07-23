/**
 * Owner notification preferences (Faz H.4).
 * Stored per-business in localStorage so no migration is required.
 */

export interface NotificationPrefs {
  /** In-app + toast for mini-site leads */
  notifyLeads: boolean;
  /** In-app when mini site is saved / published / draft */
  notifyMiniSite: boolean;
  /** Toast when a new notification arrives via realtime/poll */
  toastOnNew: boolean;
  /** OS browser notification when tab is open/background (requires permission) */
  browserPush: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  notifyLeads: true,
  notifyMiniSite: true,
  toastOnNew: true,
  browserPush: true,
};

const STORAGE_PREFIX = "localpilot-notification-prefs-";

export function notificationPrefsStorageKey(businessId: string): string {
  return `${STORAGE_PREFIX}${businessId}`;
}

export function normalizeNotificationPrefs(
  input?: Partial<NotificationPrefs> | null,
): NotificationPrefs {
  return {
    notifyLeads:
      typeof input?.notifyLeads === "boolean"
        ? input.notifyLeads
        : DEFAULT_NOTIFICATION_PREFS.notifyLeads,
    notifyMiniSite:
      typeof input?.notifyMiniSite === "boolean"
        ? input.notifyMiniSite
        : DEFAULT_NOTIFICATION_PREFS.notifyMiniSite,
    toastOnNew:
      typeof input?.toastOnNew === "boolean"
        ? input.toastOnNew
        : DEFAULT_NOTIFICATION_PREFS.toastOnNew,
    browserPush:
      typeof input?.browserPush === "boolean"
        ? input.browserPush
        : DEFAULT_NOTIFICATION_PREFS.browserPush,
  };
}

export function readNotificationPrefs(businessId: string): NotificationPrefs {
  if (typeof window === "undefined" || !businessId) {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  try {
    const raw = window.localStorage.getItem(
      notificationPrefsStorageKey(businessId),
    );
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    return normalizeNotificationPrefs(
      JSON.parse(raw) as Partial<NotificationPrefs>,
    );
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function writeNotificationPrefs(
  businessId: string,
  prefs: Partial<NotificationPrefs>,
): NotificationPrefs {
  const next = normalizeNotificationPrefs({
    ...readNotificationPrefs(businessId),
    ...prefs,
  });
  if (typeof window !== "undefined" && businessId) {
    try {
      window.localStorage.setItem(
        notificationPrefsStorageKey(businessId),
        JSON.stringify(next),
      );
      window.dispatchEvent(
        new CustomEvent("localpilot:notification-prefs", {
          detail: { businessId, prefs: next },
        }),
      );
    } catch {
      // ignore quota / private mode
    }
  }
  return next;
}

/** Whether this notification type should appear in the bell / toast. */
export function isNotificationTypeEnabled(
  type: string,
  prefs: NotificationPrefs,
): boolean {
  if (type === "lead.created") return prefs.notifyLeads;
  if (
    type === "mini_site.updated" ||
    type === "mini_site.published" ||
    type === "mini_site.draft"
  ) {
    return prefs.notifyMiniSite;
  }
  return true;
}

/** Lead focus payload passed from notification bell → CRM tab. */
export interface CrmLeadFocus {
  fullName?: string;
  phone?: string;
  notes?: string;
  notificationId?: string;
}

export function leadFocusFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  notificationId?: string,
): CrmLeadFocus {
  const fullName =
    typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  const phone =
    typeof metadata?.phone === "string" ? metadata.phone.trim() : "";
  const notes =
    typeof metadata?.notes === "string" ? metadata.notes.trim() : "";
  return {
    fullName: fullName || undefined,
    phone: phone || undefined,
    notes: notes || undefined,
    notificationId,
  };
}

export function matchCustomerToLeadFocus<
  T extends { full_name?: string; phone?: string | null },
>(customers: T[], focus: CrmLeadFocus): T | null {
  if (!customers.length) return null;
  const phoneDigits = (focus.phone || "").replace(/\D/g, "");
  if (phoneDigits.length >= 7) {
    const byPhone = customers.find((c) => {
      const digits = (c.phone || "").replace(/\D/g, "");
      if (!digits) return false;
      return (
        digits === phoneDigits ||
        digits.endsWith(phoneDigits) ||
        phoneDigits.endsWith(digits)
      );
    });
    if (byPhone) return byPhone;
  }
  const name = (focus.fullName || "").trim().toLocaleLowerCase("tr-TR");
  if (name) {
    const byName = customers.find(
      (c) => (c.full_name || "").trim().toLocaleLowerCase("tr-TR") === name,
    );
    if (byName) return byName;
  }
  return null;
}
