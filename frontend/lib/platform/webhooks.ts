export const WEBHOOK_EVENTS = [
  "lead.created",
  "customer.created",
  "decision.approved",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookDispatchPayload {
  event: WebhookEvent;
  business_id: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

export async function dispatchBusinessWebhook(input: {
  url: string;
  secret: string;
  payload: WebhookDispatchPayload;
}): Promise<boolean> {
  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LocalPilot-Signature": input.secret,
        "X-LocalPilot-Event": input.payload.event,
      },
      body: JSON.stringify(input.payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function triggerBusinessWebhooks(input: {
  businessId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
}): Promise<number> {
  const { listBusinessWebhooks } = await import(
    "@/lib/repositories/platform-integrations"
  );
  const hooks = await listBusinessWebhooks(input.businessId);
  const payload: WebhookDispatchPayload = {
    event: input.event,
    business_id: input.businessId,
    occurred_at: new Date().toISOString(),
    data: input.data,
  };

  const deliveries = await Promise.all(
    hooks
      .filter((hook) => hook.active && hook.events.includes(input.event))
      .map((hook) =>
        dispatchBusinessWebhook({
          url: hook.url,
          secret: hook.secret,
          payload,
        }),
      ),
  );

  return deliveries.filter(Boolean).length;
}