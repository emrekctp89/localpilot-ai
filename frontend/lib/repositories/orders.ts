import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/domain-types";
import { isMissingTableError } from "./errors";
import { isLegacyDualReadEnabled } from "./legacy-config";
import { loadLegacyMiniSiteData } from "./plan-legacy";
import { commitTableWrite } from "./table-store";

interface OrderRow {
  id: string;
  business_id: string;
  customer_name: string;
  phone: string | null;
  summary: string;
  total: number;
  channel: Order["channel"];
  status: Order["status"];
  payment_status: Order["paymentStatus"];
  created_at: string;
}

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone ?? undefined,
    summary: row.summary,
    total: Number(row.total),
    channel: row.channel,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

function orderToRow(businessId: string, order: Order): OrderRow {
  return {
    id: order.id,
    business_id: businessId,
    customer_name: order.customerName,
    phone: order.phone ?? null,
    summary: order.summary,
    total: order.total,
    channel: order.channel,
    status: order.status,
    payment_status: order.paymentStatus,
    created_at: order.createdAt,
  };
}

async function replaceAllInTable(
  businessId: string,
  orders: Order[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) return false;
  if (orders.length === 0) return true;

  const { error: insertError } = await supabase
    .from("orders")
    .insert(orders.map((item) => orderToRow(businessId, item)));

  return !insertError;
}

export async function listOrders(businessId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!isMissingTableError(error) && !error) {
    if (data && data.length > 0) {
      return (data as OrderRow[]).map(rowToOrder);
    }

    const legacy = await loadLegacyMiniSiteData(businessId);
    const legacyItems = Array.isArray(legacy.orders) ? legacy.orders : [];
    if (legacyItems.length > 0) {
      await replaceAllInTable(businessId, legacyItems);
      await commitTableWrite(businessId, true, "orders");
      return legacyItems;
    }
    return [];
  }

  if (!isLegacyDualReadEnabled()) {
    return [];
  }

  const legacy = await loadLegacyMiniSiteData(businessId);
  return Array.isArray(legacy.orders) ? legacy.orders : [];
}

export async function saveOrders(
  businessId: string,
  orders: Order[],
): Promise<boolean> {
  return commitTableWrite(
    businessId,
    await replaceAllInTable(businessId, orders),
    "orders",
  );
}