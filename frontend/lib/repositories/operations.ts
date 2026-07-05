import type { MiniSiteData } from "@/lib/domain-types";
import { listAppointments } from "./appointments";
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