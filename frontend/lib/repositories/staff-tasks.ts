import { supabase } from "@/lib/supabase";
import type { StaffTask } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { loadLegacyMiniSiteData, updateLegacyMiniSiteData } from "./plan-legacy";

interface StaffTaskRow {
  id: string;
  business_id: string;
  title: string;
  assignee: string;
  due_date: string | null;
  priority: StaffTask["priority"];
  status: StaffTask["status"];
  notes: string | null;
  created_at: string;
}

function rowToStaffTask(row: StaffTaskRow): StaffTask {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    dueDate: row.due_date ?? undefined,
    priority: row.priority,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function staffTaskToRow(
  businessId: string,
  task: StaffTask,
): StaffTaskRow {
  return {
    id: task.id,
    business_id: businessId,
    title: task.title,
    assignee: task.assignee,
    due_date: task.dueDate ?? null,
    priority: task.priority,
    status: task.status,
    notes: task.notes ?? null,
    created_at: task.createdAt,
  };
}

async function replaceAllInTable(
  businessId: string,
  tasks: StaffTask[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("staff_tasks")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;
  if (tasks.length === 0) return true;

  const { error: insertError } = await supabase
    .from("staff_tasks")
    .insert(tasks.map((item) => staffTaskToRow(businessId, item)));

  return !insertError;
}

export async function listStaffTasks(
  businessId: string,
): Promise<StaffTask[]> {
  const { data, error } = await supabase
    .from("staff_tasks")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      return (data as StaffTaskRow[]).map(rowToStaffTask);
    }

    const legacy = await loadLegacyMiniSiteData(businessId);
    const legacyItems = Array.isArray(legacy.tasks) ? legacy.tasks : [];
    if (legacyItems.length > 0) {
      await replaceAllInTable(businessId, legacyItems);
      return legacyItems;
    }
    return [];
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return Array.isArray(legacy.tasks) ? legacy.tasks : [];
}

export async function saveStaffTasks(
  businessId: string,
  tasks: StaffTask[],
): Promise<boolean> {
  const savedToTable = await replaceAllInTable(businessId, tasks);
  if (savedToTable) return true;

  return updateLegacyMiniSiteData(businessId, (current) => ({
    ...current,
    tasks,
  }));
}