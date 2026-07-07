import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canApplyGoogleSuggestionRemotely,
  getGoogleBusinessIntegrationStatus,
  getWhatsAppBusinessIntegrationStatus,
} from "../../lib/integrations";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Faz E live integrations", () => {
  it("exposes integration client endpoints", () => {
    const source = readSource("lib/integration-client.ts");
    assert.match(source, /\/integration\/whatsapp\/send/);
    assert.match(source, /\/integration\/google\/oauth\/start/);
    assert.match(source, /\/integration\/google\/apply-suggestion/);
    assert.match(source, /\/integration\/ai-feedback/);
  });

  it("maps remote whatsapp status to connected label", () => {
    const status = getWhatsAppBusinessIntegrationStatus({
      provider: "whatsapp_business",
      status: "connected",
      label: "Cloud API aktif",
      detail: "Canlı gönderim hazır",
    });
    assert.equal(status.status, "connected");
    assert.match(status.label, /Cloud API/);
  });

  it("allows remote apply only for connected description suggestion", () => {
    assert.equal(
      canApplyGoogleSuggestionRemotely(
        {
          provider: "google_business",
          status: "connected",
          label: "Bağlı",
          detail: "OK",
        },
        "description-written",
      ),
      true,
    );
    assert.equal(
      canApplyGoogleSuggestionRemotely(
        {
          provider: "google_business",
          status: "pending_oauth",
          label: "Bekliyor",
          detail: "OK",
        },
        "description-written",
      ),
      false,
    );
  });

  it("wires dashboard tabs to live integration actions", () => {
    const icerik = readSource("app/components/dashboard/IcerikTab.tsx");
    const google = readSource("app/components/dashboard/GoogleBusinessTab.tsx");
    const dashboard = readSource("app/dashboard/page.tsx");

    assert.match(icerik, /sendWhatsAppCloudMessage/);
    assert.match(icerik, /API Gönder/);
    assert.match(google, /startGoogleOAuth/);
    assert.match(google, /applyGoogleSuggestion/);
    assert.match(dashboard, /google_oauth/);
  });

  it("ships migration 009 for integrations storage", () => {
    const migration = readFileSync(
      join(root, "../supabase/migrations/009_business_integrations.sql"),
      "utf8",
    );
    assert.match(migration, /business_integrations/);
    assert.match(migration, /ai_quality_feedback/);
  });

  it("documents env vars for Faz E", () => {
    const template = readFileSync(
      join(root, "../deploy/production.env.template"),
      "utf8",
    );
    assert.match(template, /WHATSAPP_ACCESS_TOKEN/);
    assert.match(template, /GOOGLE_OAUTH_CLIENT_ID/);
  });
});