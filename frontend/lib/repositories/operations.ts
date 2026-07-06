import { supabase } from "@/lib/supabase";
import type { Customer, MiniSiteData, Transaction } from "@/lib/domain-types";
import type { DecisionContext } from "@/lib/business-os";
import { listAppointments } from "./appointments";
import { listCustomerFollowUps } from "./crm-activities";
import { loadGoogleChecklist } from "./google-checklist";
import { listOrders } from "./orders";
import { listStaffTasks } from "./staff-tasks";

export async function loadOperationalSnapshot(
  businessId: string,
): Promise<
  Pick<
    MiniSiteData,
    "appointments" | "orders" | "tasks" | "google_business_checklist"
  >
> {
  const [appointments, orders, tasks, googleChecklist] = await Promise.all([
    listAppointments(businessId),
    listOrders(businessId),
    listStaffTasks(businessId),
    loadGoogleChecklist(businessId),
  ]);

  return {
    appointments,
    orders,
    tasks,
    google_business_checklist: googleChecklist,
  };
}

export async function loadDecisionContext(
  businessId: string,
): Promise<DecisionContext> {
  const [snapshot, transactionsResult, customersResult, crmFollowUps] =
    await Promise.all([
      loadOperationalSnapshot(businessId),
      supabase
        .from("transactions")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      listCustomerFollowUps(businessId),
    ]);

  return {
    ...snapshot,
    transactions: (transactionsResult.data as Transaction[]) || [],
    customers: (customersResult.data as Customer[]) || [],
    crmFollowUps,
  };
}