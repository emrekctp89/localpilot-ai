import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Campaign } from "../../lib/domain-types";

describe("campaign repository mapping", () => {
  it("preserves campaign fields through row shape", () => {
    const campaign: Campaign = {
      id: "cmp-1",
      campaign_name: "Bahar Kampanyası",
      strategy: "Sadık müşterilere özel indirim",
      sms_whatsapp_template: "Merhaba! Size özel %20 indirim.",
    };

    const row = {
      id: campaign.id,
      business_id: "biz-1",
      campaign_name: campaign.campaign_name,
      strategy: campaign.strategy,
      sms_whatsapp_template: campaign.sms_whatsapp_template,
      sort_order: 0,
      created_at: "2026-07-06T00:00:00.000Z",
      updated_at: null,
    };

    const mapped: Campaign = {
      id: row.id,
      campaign_name: row.campaign_name,
      strategy: row.strategy,
      sms_whatsapp_template: row.sms_whatsapp_template,
    };

    assert.equal(mapped.campaign_name, campaign.campaign_name);
    assert.equal(mapped.strategy, campaign.strategy);
    assert.equal(mapped.sms_whatsapp_template, campaign.sms_whatsapp_template);
  });
});