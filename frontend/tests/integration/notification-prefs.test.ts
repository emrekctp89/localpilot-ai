import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_NOTIFICATION_PREFS,
  isNotificationTypeEnabled,
  leadFocusFromMetadata,
  matchCustomerToLeadFocus,
  normalizeNotificationPrefs,
  notificationPrefsStorageKey,
} from "../../lib/notification-prefs";

describe("notification prefs (Faz H.4)", () => {
  it("normalizes partial prefs with defaults", () => {
    const prefs = normalizeNotificationPrefs({ notifyLeads: false });
    assert.equal(prefs.notifyLeads, false);
    assert.equal(prefs.notifyMiniSite, true);
    assert.equal(prefs.toastOnNew, true);
    assert.equal(prefs.browserPush, true);
  });

  it("uses stable storage key per business", () => {
    assert.equal(
      notificationPrefsStorageKey("biz-1"),
      "localpilot-notification-prefs-biz-1",
    );
  });

  it("gates notification types by preference", () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      notifyLeads: false,
      notifyMiniSite: true,
    };
    assert.equal(isNotificationTypeEnabled("lead.created", prefs), false);
    assert.equal(isNotificationTypeEnabled("mini_site.published", prefs), true);
    assert.equal(isNotificationTypeEnabled("mini_site.draft", prefs), true);
    assert.equal(isNotificationTypeEnabled("unknown.type", prefs), true);
  });

  it("builds CRM lead focus from notification metadata", () => {
    const focus = leadFocusFromMetadata(
      {
        full_name: "Ayşe Yılmaz",
        phone: "05321234567",
        notes: "Fiyat sorusu",
      },
      "notif-1",
    );
    assert.equal(focus.fullName, "Ayşe Yılmaz");
    assert.equal(focus.phone, "05321234567");
    assert.equal(focus.notes, "Fiyat sorusu");
    assert.equal(focus.notificationId, "notif-1");
  });

  it("matches customer by phone digits or exact name", () => {
    const customers = [
      { full_name: "Ali Veli", phone: "0532 111 22 33" },
      { full_name: "Ayşe Yılmaz", phone: "0555 444 33 22" },
    ];
    const byPhone = matchCustomerToLeadFocus(customers, {
      phone: "5321112233",
      fullName: "X",
    });
    assert.equal(byPhone?.full_name, "Ali Veli");

    const byName = matchCustomerToLeadFocus(customers, {
      fullName: "Ayşe Yılmaz",
    });
    assert.equal(byName?.full_name, "Ayşe Yılmaz");

    assert.equal(
      matchCustomerToLeadFocus(customers, { fullName: "Yok" }),
      null,
    );
  });
});
