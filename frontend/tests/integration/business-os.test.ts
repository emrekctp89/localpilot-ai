import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectBusinessSignals,
  generateRecommendation,
  isActionApproved,
  measureDecisionOutcome,
} from "../../lib/business-os";
import type { DecisionCycle, MiniSiteData } from "../../lib/domain-types";

describe("business-os integration", () => {
  const referenceTime = new Date("2026-07-10T12:00:00").getTime();

  const sampleData: MiniSiteData = {
    orders: [
      {
        id: "o1",
        customerName: "Ali",
        summary: "Sipariş",
        total: 500,
        channel: "whatsapp",
        status: "yeni",
        paymentStatus: "bekliyor",
        createdAt: "2026-07-01T10:00:00",
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Geciken görev",
        assignee: "Ekip",
        dueDate: "2026-07-01",
        priority: "yuksek",
        status: "bekliyor",
        createdAt: "2026-06-30T10:00:00",
      },
    ],
    appointments: [],
    google_business_checklist: { completedItemIds: ["profile-claimed"] },
  };

  it("collects operational signals from snapshot data", () => {
    const signals = collectBusinessSignals(sampleData, referenceTime);
    assert.equal(signals.pendingPayment, 500);
    assert.equal(signals.openOrders, 1);
    assert.equal(signals.overdueTasks, 1);
    assert.ok(signals.googleProgress < 100);
  });

  it("prioritizes pending payment recommendation", () => {
    const recommendation = generateRecommendation(sampleData, [], referenceTime);
    assert.equal(recommendation.recommendationKey, "pending_payment");
    assert.equal(recommendation.status, "oneri");
  });

  it("requires approval before task automation", () => {
    const cycle: DecisionCycle = {
      id: "c1",
      recommendationKey: "pending_payment",
      signal: "test",
      analysis: "test",
      recommendation: "test",
      expectedResult: "test",
      metric: "test",
      status: "oneri",
      createdAt: new Date().toISOString(),
    };

    assert.equal(isActionApproved(cycle, "create_task"), false);

    const approved = { ...cycle, status: "onaylandi" as const };
    assert.equal(isActionApproved(approved, "create_task"), true);
  });

  it("records measured outcomes", () => {
    const cycle: DecisionCycle = {
      id: "c2",
      recommendationKey: "open_orders",
      signal: "test",
      analysis: "test",
      recommendation: "test",
      expectedResult: "test",
      metric: "test",
      status: "otomasyonda",
      createdAt: new Date().toISOString(),
    };

    const measured = measureDecisionOutcome(cycle, "basarili");
    assert.equal(measured.status, "olculdu");
    assert.equal(measured.result, "basarili");
    assert.ok(measured.measuredAt);
  });
});