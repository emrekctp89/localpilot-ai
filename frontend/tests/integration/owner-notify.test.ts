import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidOwnerNotifyEmail,
  mergeOwnerNotifyIntoTheme,
  normalizeOwnerNotifyConfig,
  ownerNotifyFromTheme,
} from "../../lib/owner-notify";

describe("owner notify config (Faz H 2.6.6)", () => {
  it("normalizes empty config", () => {
    const cfg = normalizeOwnerNotifyConfig(null);
    assert.equal(cfg.email_enabled, false);
    assert.equal(cfg.email, "");
    assert.equal(cfg.whatsapp_enabled, false);
  });

  it("requires email address when email_enabled", () => {
    const cfg = normalizeOwnerNotifyConfig({
      email_enabled: true,
      email: "  ",
      whatsapp_enabled: true,
    });
    assert.equal(cfg.email_enabled, false);
    assert.equal(cfg.whatsapp_enabled, true);
  });

  it("reads owner_notify from theme_config", () => {
    const cfg = ownerNotifyFromTheme({
      primaryColor: "indigo",
      owner_notify: {
        email_enabled: true,
        email: "a@b.com",
        whatsapp_enabled: true,
      },
    });
    assert.equal(cfg.email, "a@b.com");
    assert.equal(cfg.email_enabled, true);
    assert.equal(cfg.whatsapp_enabled, true);
  });

  it("merges owner_notify into theme without dropping primaryColor", () => {
    const theme = mergeOwnerNotifyIntoTheme(
      { primaryColor: "rose" },
      { email_enabled: true, email: "x@y.z", whatsapp_enabled: false },
    );
    assert.equal(theme.primaryColor, "rose");
    assert.equal(theme.owner_notify?.email, "x@y.z");
    assert.equal(theme.owner_notify?.email_enabled, true);
  });

  it("validates email shape", () => {
    assert.equal(isValidOwnerNotifyEmail("owner@site.com"), true);
    assert.equal(isValidOwnerNotifyEmail("bad"), false);
  });
});
