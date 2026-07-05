import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { loadLegacyMiniSiteData, updateLegacyMiniSiteData } from "./plan-legacy";

interface AppointmentRow {
  id: string;
  business_id: string;
  customer_name: string;
  phone: string | null;
  service: string;
  starts_at: string;
  notes: string | null;
  status: Appointment["status"];
  created_at: string;
}

function rowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone ?? undefined,
    service: row.service,
    startsAt: row.starts_at,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

function appointmentToRow(
  businessId: string,
  appointment: Appointment,
): AppointmentRow {
  return {
    id: appointment.id,
    business_id: businessId,
    customer_name: appointment.customerName,
    phone: appointment.phone ?? null,
    service: appointment.service,
    starts_at: appointment.startsAt,
    notes: appointment.notes ?? null,
    status: appointment.status,
    created_at: appointment.createdAt,
  };
}

async function replaceAllInTable(
  businessId: string,
  appointments: Appointment[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("appointments")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;
  if (appointments.length === 0) return true;

  const { error: insertError } = await supabase
    .from("appointments")
    .insert(appointments.map((item) => appointmentToRow(businessId, item)));

  return !insertError;
}

export async function listAppointments(
  businessId: string,
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", businessId)
    .order("starts_at", { ascending: true });

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      return (data as AppointmentRow[]).map(rowToAppointment);
    }

    const legacy = await loadLegacyMiniSiteData(businessId);
    const legacyItems = Array.isArray(legacy.appointments)
      ? legacy.appointments
      : [];
    if (legacyItems.length > 0) {
      await replaceAllInTable(businessId, legacyItems);
      return legacyItems;
    }
    return [];
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return Array.isArray(legacy.appointments) ? legacy.appointments : [];
}

export async function saveAppointments(
  businessId: string,
  appointments: Appointment[],
): Promise<boolean> {
  const savedToTable = await replaceAllInTable(businessId, appointments);
  if (savedToTable) return true;

  return updateLegacyMiniSiteData(businessId, (current) => ({
    ...current,
    appointments,
  }));
}