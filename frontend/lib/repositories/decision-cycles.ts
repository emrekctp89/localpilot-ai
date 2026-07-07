import { supabase } from "@/lib/supabase";
import type { DecisionCycle } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { isLegacyDualReadEnabled } from "./legacy-config";
import { loadLegacyMiniSiteData } from "./plan-legacy";
import { commitTableWrite } from "./table-store";

interface DecisionCycleRow {
  id: string;
  business_id: string;
  recommendation_key: DecisionCycle["recommendationKey"];
  signal: string;
  analysis: string;
  recommendation: string;
  expected_result: string;
  metric: string;
  status: DecisionCycle["status"];
  result: DecisionCycle["result"] | null;
  task_id: string | null;
  confidence_score: number | null;
  learning_evidence_count: number | null;
  created_at: string;
  approved_at: string | null;
  automated_at: string | null;
  measured_at: string | null;
}

function rowToDecisionCycle(row: DecisionCycleRow): DecisionCycle {
  return {
    id: row.id,
    recommendationKey: row.recommendation_key,
    signal: row.signal,
    analysis: row.analysis,
    recommendation: row.recommendation,
    expectedResult: row.expected_result,
    metric: row.metric,
    status: row.status,
    result: row.result ?? undefined,
    taskId: row.task_id ?? undefined,
    confidenceScore: row.confidence_score ?? undefined,
    learningEvidenceCount: row.learning_evidence_count ?? undefined,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    automatedAt: row.automated_at ?? undefined,
    measuredAt: row.measured_at ?? undefined,
  };
}

function decisionCycleToRow(
  businessId: string,
  cycle: DecisionCycle,
): DecisionCycleRow {
  return {
    id: cycle.id,
    business_id: businessId,
    recommendation_key: cycle.recommendationKey,
    signal: cycle.signal,
    analysis: cycle.analysis,
    recommendation: cycle.recommendation,
    expected_result: cycle.expectedResult,
    metric: cycle.metric,
    status: cycle.status,
    result: cycle.result ?? null,
    task_id: cycle.taskId ?? null,
    confidence_score: cycle.confidenceScore ?? null,
    learning_evidence_count: cycle.learningEvidenceCount ?? null,
    created_at: cycle.createdAt,
    approved_at: cycle.approvedAt ?? null,
    automated_at: cycle.automatedAt ?? null,
    measured_at: cycle.measuredAt ?? null,
  };
}

async function replaceAllInTable(
  businessId: string,
  cycles: DecisionCycle[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("decision_cycles")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;
  if (cycles.length === 0) return true;

  const { error: insertError } = await supabase
    .from("decision_cycles")
    .insert(cycles.map((item) => decisionCycleToRow(businessId, item)));

  return !insertError;
}

export async function listDecisionCycles(
  businessId: string,
): Promise<DecisionCycle[]> {
  const { data, error } = await supabase
    .from("decision_cycles")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      return (data as DecisionCycleRow[]).map(rowToDecisionCycle);
    }

    const legacy = await loadLegacyMiniSiteData(businessId);
    const legacyItems = Array.isArray(legacy.decision_cycles)
      ? legacy.decision_cycles.map((cycle) => ({
          ...cycle,
          recommendationKey: cycle.recommendationKey || "growth_review",
        }))
      : [];
    if (legacyItems.length > 0) {
      await replaceAllInTable(businessId, legacyItems);
      await commitTableWrite(businessId, true, "decision_cycles");
      return legacyItems;
    }
    return [];
  }

  if (!isLegacyDualReadEnabled()) {
    return [];
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return Array.isArray(legacy.decision_cycles)
    ? legacy.decision_cycles.map((cycle) => ({
        ...cycle,
        recommendationKey: cycle.recommendationKey || "growth_review",
      }))
    : [];
}

export async function saveDecisionCycles(
  businessId: string,
  cycles: DecisionCycle[],
): Promise<boolean> {
  return commitTableWrite(
    businessId,
    await replaceAllInTable(businessId, cycles),
    "decision_cycles",
  );
}