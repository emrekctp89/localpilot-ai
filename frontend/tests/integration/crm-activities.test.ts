import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CrmStatusHistoryItem, CustomerFollowUp } from "../../lib/domain-types";

describe("crm activities mapping", () => {
  it("round-trips follow-up date and status history", () => {
    const history: CrmStatusHistoryItem[] = [
      {
        from: "Yeni Potansiyel",
        to: "İletişime Geçildi",
        changedAt: "2026-07-06T10:00:00.000Z",
      },
    ];
    const followUp: CustomerFollowUp = {
      followUpDate: "2026-07-10",
      statusHistory: history,
    };

    const row = {
      customer_id: "cust-1",
      follow_up_date: followUp.followUpDate,
      status_history: followUp.statusHistory,
    };

    const mapped: CustomerFollowUp = {
      followUpDate: row.follow_up_date || undefined,
      statusHistory: row.status_history,
    };

    assert.equal(mapped.followUpDate, "2026-07-10");
    assert.equal(mapped.statusHistory?.length, 1);
    assert.equal(mapped.statusHistory?.[0]?.to, "İletişime Geçildi");
  });
});