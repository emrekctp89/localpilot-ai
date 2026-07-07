import type {
  Business,
  SectorPack,
  SectorPackAutomationSuggestion,
  SectorWorkflowItem,
  StaffTask,
} from "./domain-types";
import { buildWhatsAppFallbackUrl } from "./integrations/whatsapp-business";

export type SectorAutomationChannel = "whatsapp" | "task";

export interface SectorAutomationExecutable {
  automationId: string;
  title: string;
  channel: SectorAutomationChannel;
  label: string;
  message?: string;
  whatsappUrl?: string;
  task?: StaffTask;
  affectedCustomers: string[];
}

function getAffectedItems(
  pack: SectorPack,
  automationId: string,
  items: SectorWorkflowItem[],
): SectorWorkflowItem[] {
  const def = pack.automations.find((item) => item.id === automationId);
  if (!def) return [];

  const completedStageId = pack.stages[pack.stages.length - 1].id;
  const activeItems = items.filter((item) => item.stage !== completedStageId);

  switch (def.trigger) {
    case "items_in_stage":
      return items.filter((item) => item.stage === def.triggerStageId);
    case "stalled_in_stage": {
      const stageId = def.triggerStageId || "";
      return items.filter((item) => {
        if (item.stage !== stageId) return false;
        const createdAt = new Date(item.createdAt).getTime();
        if (Number.isNaN(createdAt)) return true;
        const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
        return ageHours >= 24;
      });
    }
    case "high_pipeline": {
      const pipelineValue = activeItems.reduce(
        (sum, item) => sum + Number(item.value || 0),
        0,
      );
      return pipelineValue >= 10000 ? activeItems : [];
    }
    default:
      return [];
  }
}

function inferChannel(
  automation: SectorPackAutomationSuggestion,
): SectorAutomationChannel {
  const text = `${automation.title} ${automation.suggestedAction}`.toLocaleLowerCase(
    "tr-TR",
  );
  if (text.includes("görev") || text.includes("personel") || text.includes("usta")) {
    return "task";
  }
  return "whatsapp";
}

function buildAutomationMessage(
  business: Business,
  automation: SectorPackAutomationSuggestion,
  affectedItems: SectorWorkflowItem[],
): string {
  const customerNames = affectedItems
    .map((item) => item.customer.trim())
    .filter(Boolean)
    .slice(0, 3);

  const customerHint =
    customerNames.length > 0
      ? ` (${customerNames.join(", ")}${affectedItems.length > 3 ? " ve diğerleri" : ""})`
      : "";

  return `${business.name}: ${automation.title}${customerHint}. ${automation.suggestedAction}`;
}

export function buildSectorAutomationExecutable(
  pack: SectorPack,
  automation: SectorPackAutomationSuggestion,
  business: Business,
  items: SectorWorkflowItem[],
  referenceTime = Date.now(),
): SectorAutomationExecutable | null {
  const affectedItems = getAffectedItems(pack, automation.id, items);
  if (affectedItems.length === 0) return null;

  const channel = inferChannel(automation);
  const message = buildAutomationMessage(business, automation, affectedItems);
  const affectedCustomers = affectedItems.map((item) => item.customer);

  if (channel === "whatsapp") {
    const whatsappUrl = buildWhatsAppFallbackUrl(business, message);
    if (!whatsappUrl) return null;

    return {
      automationId: automation.id,
      title: automation.title,
      channel,
      label: "WhatsApp'ta Uygula",
      message,
      whatsappUrl,
      affectedCustomers,
    };
  }

  const dueDate = new Date(referenceTime + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const task: StaffTask = {
    id: crypto.randomUUID(),
    title: automation.title,
    assignee: "İşletme sahibi",
    dueDate,
    priority: "yuksek",
    status: "bekliyor",
    notes: `${automation.suggestedAction} (${affectedItems.length} kayıt)`,
    createdAt: new Date().toISOString(),
  };

  return {
    automationId: automation.id,
    title: automation.title,
    channel,
    label: "Görev Oluştur",
    message,
    task,
    affectedCustomers,
  };
}