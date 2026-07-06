import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReviewDecisionCycle,
  collectBusinessSignals,
  generateRecommendation,
  getAutomationActionForKey,
  getLearningHistory,
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
    assert.equal(signals.emptyAppointmentSlots, 8);
  });

  it("prioritizes pending payment recommendation", () => {
    const recommendation = generateRecommendation(sampleData, [], referenceTime);
    assert.equal(recommendation.recommendationKey, "pending_payment");
    assert.equal(recommendation.status, "oneri");
  });

  it("detects finance decline and CRM churn signals", () => {
    const signals = collectBusinessSignals(
      {
        ...sampleData,
        orders: [],
        tasks: [],
        transactions: [
          {
            id: "tx1",
            business_id: "b1",
            type: "gelir",
            amount: 1000,
            description: "Eski",
            created_at: "2026-05-15T10:00:00",
          },
          {
            id: "tx2",
            business_id: "b1",
            type: "gelir",
            amount: 500,
            description: "Yeni",
            created_at: "2026-07-05T10:00:00",
          },
        ],
        customers: [
          {
            id: "c1",
            business_id: "b1",
            full_name: "Riskli",
            status: "Yeni Potansiyel",
            created_at: "2026-05-01T10:00:00",
          },
        ],
        crmFollowUps: {
          c1: { followUpDate: "2026-07-01" },
        },
      },
      referenceTime,
    );

    assert.equal(signals.financeTrend, "down");
    assert.equal(signals.churnRiskCustomers, 1);
    assert.equal(signals.overdueFollowUps, 1);
  });

  it("maps recommendation keys to automation actions", () => {
    assert.equal(getAutomationActionForKey("pending_payment"), "send_message");
    assert.equal(getAutomationActionForKey("finance_decline"), "financial_transaction");
    assert.equal(getAutomationActionForKey("empty_appointment_slots"), "publish_campaign");
    assert.equal(getAutomationActionForKey("overdue_tasks"), "create_task");
    assert.equal(getAutomationActionForKey("review_insight"), "create_task");
  });

  it("builds review decision cycles for Karar Merkezi bridge", () => {
    const cycle = buildReviewDecisionCycle({
      signal: "Müşteriler bekleme süresinden şikayetçi.",
      analysis: "Operasyonel gecikme tekrar eden yorumlarda görülüyor.",
      recommendation: "Yoğun saatler için ekstra personel görevi planlayın.",
      expected_result: "Bekleme şikayetlerini azaltmak.",
      metric: "Olumsuz yorum oranı",
      priority: "high",
    });

    assert.equal(cycle.recommendationKey, "review_insight");
    assert.equal(cycle.status, "oneri");
    assert.equal(cycle.confidenceScore, 82);
  });

  it("builds learning history from measured cycles", () => {
    const cycles: DecisionCycle[] = [
      {
        id: "c1",
        recommendationKey: "pending_payment",
        signal: "test",
        analysis: "test",
        recommendation: "test",
        expectedResult: "test",
        metric: "test",
        status: "olculdu",
        result: "basarili",
        createdAt: "2026-07-01T10:00:00",
      },
    ];

    const history = getLearningHistory(cycles);
    assert.equal(history.length, 1);
    assert.equal(history[0].key, "pending_payment");
    assert.ok(history[0].confidence >= 20);
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

    assert.equal(isActionApproved(cycle, "send_message"), false);

    const approved = { ...cycle, status: "onaylandi" as const };
    assert.equal(isActionApproved(approved, "send_message"), true);
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