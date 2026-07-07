import type {
  Business,
  SectorPack,
  SectorPackAutomationSuggestion,
  SectorPackMetricCard,
  SectorWorkflowItem,
} from "./domain-types";

const SECTOR_PACKS: SectorPack[] = [
  {
    id: "salon",
    name: "Kuaför ve Güzellik",
    matches: ["kuaför", "güzellik", "berber", "salon"],
    onboardingMatches: ["Kuaför & Güzellik Salonu"],
    itemName: "Hizmet Kaydı",
    titleLabel: "Hizmet",
    customerLabel: "Müşteri",
    detailLabel: "Uzman / not",
    valueLabel: "Tutar",
    stages: [
      { id: "randevu", label: "Randevu" },
      { id: "geldi", label: "Müşteri Geldi" },
      { id: "hizmette", label: "Hizmette" },
      { id: "tamamlandi", label: "Tamamlandı" },
    ],
    metricLabel: "Tamamlanan hizmet",
    metrics: [
      { id: "today_appointments", label: "Bekleyen randevu", kind: "stage_count", stageIds: ["randevu"] },
      { id: "in_service", label: "Hizmette", kind: "stage_count", stageIds: ["hizmette", "geldi"] },
      { id: "completed", label: "Tamamlanan", kind: "completed_count" },
      { id: "completion_rate", label: "Tamamlanma oranı", kind: "completion_rate" },
    ],
    automations: [
      {
        id: "salon_appointment_reminder",
        title: "Randevu hatırlatma",
        description: "Yaklaşan randevular için WhatsApp hatırlatması gönder.",
        trigger: "items_in_stage",
        triggerStageId: "randevu",
        suggestedAction: "Randevu listesindeki müşterilere 24 saat önce hatırlatma mesajı planla.",
      },
      {
        id: "salon_no_show_followup",
        title: "Gelmeyen müşteri takibi",
        description: "Randevuya gelmeyen müşteriler için yeniden planlama öner.",
        trigger: "stalled_in_stage",
        triggerStageId: "randevu",
        suggestedAction: "Gelmeyen müşterilere alternatif saat öneren mesaj taslağı oluştur.",
      },
    ],
  },
  {
    id: "restaurant",
    name: "Restoran ve Yeme-İçme",
    matches: ["restoran", "lokanta", "kafe", "kahve", "pastane", "fırın", "fast food", "paket servis", "gıda"],
    onboardingMatches: [
      "Restoran & Lokanta",
      "Kafe & Kahveciler",
      "Pastane, Fırın & Tatlıcı",
      "Fast Food & Paket Servis",
      "Gıda Üretimi ve Toptan Satış",
    ],
    itemName: "Rezervasyon / Sipariş",
    titleLabel: "Masa / sipariş",
    customerLabel: "Müşteri",
    detailLabel: "Kişi sayısı / not",
    valueLabel: "Tutar",
    stages: [
      { id: "rezervasyon", label: "Rezervasyon" },
      { id: "hazirlaniyor", label: "Hazırlanıyor" },
      { id: "serviste", label: "Serviste" },
      { id: "tamamlandi", label: "Tamamlandı" },
    ],
    metricLabel: "Tamamlanan servis",
    metrics: [
      { id: "reservations", label: "Açık rezervasyon", kind: "stage_count", stageIds: ["rezervasyon"] },
      { id: "in_kitchen", label: "Mutfakta", kind: "stage_count", stageIds: ["hazirlaniyor"] },
      { id: "pipeline_value", label: "Açık sipariş tutarı", kind: "pipeline_value" },
      { id: "completed", label: "Tamamlanan", kind: "completed_count" },
    ],
    automations: [
      {
        id: "restaurant_reservation_confirm",
        title: "Rezervasyon onayı",
        description: "Yeni rezervasyonlar için otomatik onay mesajı gönder.",
        trigger: "items_in_stage",
        triggerStageId: "rezervasyon",
        suggestedAction: "Rezervasyon saatinden 2 saat önce onay mesajı planla.",
      },
      {
        id: "restaurant_peak_alert",
        title: "Yoğun saat uyarısı",
        description: "Açık sipariş hacmi yüksekse ekstra personel görevi oluştur.",
        trigger: "high_pipeline",
        suggestedAction: "Servis ve mutfak için yoğunluk görevi oluştur.",
      },
    ],
  },
  {
    id: "clinic",
    name: "Klinik ve Sağlık",
    matches: ["klinik", "diş", "sağlık", "muayene", "veteriner", "tıp", "hastane", "poliklinik"],
    onboardingMatches: ["Sağlık & Klinik"],
    itemName: "Muayene Kaydı",
    titleLabel: "Muayene / seans",
    customerLabel: "Hasta / danışan",
    detailLabel: "Doktor / not",
    valueLabel: "Ücret",
    stages: [
      { id: "randevu", label: "Randevu" },
      { id: "kabul", label: "Kabul" },
      { id: "muayene", label: "Muayenede" },
      { id: "tamamlandi", label: "Tamamlandı" },
    ],
    metricLabel: "Tamamlanan muayene",
    metrics: [
      { id: "scheduled", label: "Planlı randevu", kind: "stage_count", stageIds: ["randevu"] },
      { id: "in_clinic", label: "Klinikte", kind: "stage_count", stageIds: ["kabul", "muayene"] },
      { id: "completed", label: "Tamamlanan", kind: "completed_count" },
      { id: "completion_rate", label: "Tamamlanma oranı", kind: "completion_rate" },
    ],
    automations: [
      {
        id: "clinic_appointment_reminder",
        title: "Muayene hatırlatma",
        description: "Yaklaşan randevular için hasta hatırlatması gönder.",
        trigger: "items_in_stage",
        triggerStageId: "randevu",
        suggestedAction: "Randevudan bir gün önce hatırlatma mesajı planla.",
      },
      {
        id: "clinic_followup_care",
        title: "Kontrol randevusu önerisi",
        description: "Tamamlanan muayeneler için kontrol takibi başlat.",
        trigger: "stalled_in_stage",
        triggerStageId: "tamamlandi",
        suggestedAction: "Kontrol randevusu için CRM takip görevi oluştur.",
      },
    ],
  },
  {
    id: "real_estate",
    name: "Gayrimenkul ve Emlak",
    matches: ["emlak", "gayrimenkul", "konut", "daire", "arsa"],
    onboardingMatches: ["Gayrimenkul & Emlak"],
    itemName: "Portföy Fırsatı",
    titleLabel: "İlan / mülk",
    customerLabel: "Alıcı / kiracı",
    detailLabel: "Konum / m² / not",
    valueLabel: "Talep fiyatı",
    stages: [
      { id: "yeni_ilan", label: "Yeni İlan" },
      { id: "gorusme", label: "Görüşme" },
      { id: "goruntuleme", label: "Gösterim" },
      { id: "pazarlik", label: "Pazarlık" },
      { id: "kapanis", label: "Kapanış" },
    ],
    metricLabel: "Kapanan işlem",
    metrics: [
      { id: "active_listings", label: "Aktif ilan", kind: "stage_count", stageIds: ["yeni_ilan", "gorusme", "goruntuleme", "pazarlik"] },
      { id: "showings", label: "Gösterimde", kind: "stage_count", stageIds: ["goruntuleme"] },
      { id: "pipeline_value", label: "Pipeline değeri", kind: "pipeline_value" },
      { id: "closed", label: "Kapanan", kind: "completed_count" },
    ],
    automations: [
      {
        id: "real_estate_showing_followup",
        title: "Gösterim sonrası takip",
        description: "Gösterim yapılan müşterilere geri dönüş mesajı gönder.",
        trigger: "items_in_stage",
        triggerStageId: "goruntuleme",
        suggestedAction: "Gösterimden 24 saat sonra geri bildirim mesajı planla.",
      },
      {
        id: "real_estate_stale_listing",
        title: "Durgun ilan uyarısı",
        description: "Uzun süredir yeni ilan aşamasında kalan portföyleri güncelle.",
        trigger: "stalled_in_stage",
        triggerStageId: "yeni_ilan",
        suggestedAction: "İlan fotoğrafı ve fiyat güncelleme görevi oluştur.",
      },
    ],
  },
  {
    id: "field_service",
    name: "Tesisat ve Saha Servisi",
    matches: ["tesisat", "servis", "bakım", "onarım", "teknik"],
    onboardingMatches: ["Oto Bakım, Yıkama & Servis"],
    itemName: "Servis Kaydı",
    titleLabel: "Arıza / iş türü",
    customerLabel: "Müşteri",
    detailLabel: "Adres / ekip notu",
    valueLabel: "Tahmini tutar",
    stages: [
      { id: "talep", label: "Yeni Talep" },
      { id: "atandi", label: "Usta Atandı" },
      { id: "yolda", label: "Yolda" },
      { id: "sahada", label: "Sahada" },
      { id: "tamamlandi", label: "Tamamlandı" },
    ],
    metricLabel: "Tamamlanan servis",
    metrics: [
      { id: "open_requests", label: "Açık talep", kind: "active_count" },
      { id: "on_route", label: "Yolda / sahada", kind: "stage_count", stageIds: ["yolda", "sahada"] },
      { id: "pipeline_value", label: "Açık iş tutarı", kind: "pipeline_value" },
      { id: "completed", label: "Tamamlanan", kind: "completed_count" },
    ],
    automations: [
      {
        id: "field_service_assign_crew",
        title: "Usta atama hatırlatıcı",
        description: "Atanmamış talepler için ekip görevlendirme öner.",
        trigger: "items_in_stage",
        triggerStageId: "talep",
        suggestedAction: "Boşta usta listesinden atama görevi oluştur.",
      },
      {
        id: "field_service_eta_update",
        title: "Varış bildirimi",
        description: "Yoldaki ekipler için müşteriye ETA mesajı gönder.",
        trigger: "items_in_stage",
        triggerStageId: "yolda",
        suggestedAction: "Müşteriye tahmini varış saati mesajı hazırla.",
      },
    ],
  },
  {
    id: "auto_gallery",
    name: "Otomotiv Galeri",
    matches: ["galeri", "otomotiv", "araç", "oto satış"],
    onboardingMatches: ["Otomotiv & Galeri"],
    itemName: "Araç Fırsatı",
    titleLabel: "Araç",
    customerLabel: "İlgilenen müşteri",
    detailLabel: "Plaka / paket / not",
    valueLabel: "Satış tutarı",
    stages: [
      { id: "stokta", label: "Stokta" },
      { id: "ilgileniyor", label: "Müşteri İlgileniyor" },
      { id: "test_surusu", label: "Test Sürüşü" },
      { id: "pazarlik", label: "Pazarlık" },
      { id: "satildi", label: "Satıldı" },
    ],
    metricLabel: "Satılan araç",
    metrics: [
      { id: "in_stock", label: "Stokta", kind: "stage_count", stageIds: ["stokta"] },
      { id: "in_negotiation", label: "Pazarlıkta", kind: "stage_count", stageIds: ["pazarlik", "test_surusu"] },
      { id: "pipeline_value", label: "Pipeline değeri", kind: "pipeline_value" },
      { id: "sold", label: "Satılan", kind: "completed_count" },
    ],
    automations: [
      {
        id: "auto_gallery_test_drive_followup",
        title: "Test sürüşü takibi",
        description: "Test sürüşü yapan müşterilere geri dönüş planla.",
        trigger: "items_in_stage",
        triggerStageId: "test_surusu",
        suggestedAction: "Test sürüşünden sonra teşekkür ve teklif mesajı gönder.",
      },
      {
        id: "auto_gallery_stale_stock",
        title: "Uzun süreli stok uyarısı",
        description: "Uzun süredir stokta kalan araçlar için fiyat gözden geçir.",
        trigger: "stalled_in_stage",
        triggerStageId: "stokta",
        suggestedAction: "Stoktaki araçlar için fiyat güncelleme görevi oluştur.",
      },
    ],
  },
  {
    id: "retail",
    name: "Perakende Operasyonu",
    matches: ["market", "perakende", "mağaza", "butik"],
    onboardingMatches: [
      "Giyim, Tekstil & Butik",
      "Market & Süpermarket",
      "Elektronik & Teknoloji Mağazası",
      "Kozmetik & Kişisel Bakım",
    ],
    itemName: "Operasyon Kaydı",
    titleLabel: "İş / ürün grubu",
    customerLabel: "Müşteri / kanal",
    detailLabel: "Açıklama",
    valueLabel: "Tutar",
    stages: [
      { id: "yeni", label: "Yeni" },
      { id: "hazirlaniyor", label: "Hazırlanıyor" },
      { id: "hazir", label: "Hazır" },
      { id: "tamamlandi", label: "Tamamlandı" },
    ],
    metricLabel: "Tamamlanan işlem",
    metrics: [
      { id: "new_orders", label: "Yeni sipariş", kind: "stage_count", stageIds: ["yeni"] },
      { id: "preparing", label: "Hazırlanıyor", kind: "stage_count", stageIds: ["hazirlaniyor"] },
      { id: "ready_pickup", label: "Teslime hazır", kind: "stage_count", stageIds: ["hazir"] },
      { id: "completed", label: "Tamamlanan", kind: "completed_count" },
    ],
    automations: [
      {
        id: "retail_ready_notification",
        title: "Hazır bildirimi",
        description: "Teslime hazır siparişler için müşteri bildirimi gönder.",
        trigger: "items_in_stage",
        triggerStageId: "hazir",
        suggestedAction: "Hazır siparişler için teslim alma bildirimi planla.",
      },
      {
        id: "retail_prep_reminder",
        title: "Hazırlık hatırlatıcı",
        description: "Uzun süredir hazırlanan siparişleri önceliklendir.",
        trigger: "stalled_in_stage",
        triggerStageId: "hazirlaniyor",
        suggestedAction: "Geciken hazırlık siparişleri için öncelik görevi oluştur.",
      },
    ],
  },
];

const DEFAULT_PACK: SectorPack = {
  id: "generic_service",
  name: "Genel İş Akışı",
  matches: [],
  itemName: "İş Kaydı",
  titleLabel: "İş başlığı",
  customerLabel: "Müşteri / ilgili kişi",
  detailLabel: "Açıklama",
  valueLabel: "Tutar",
  stages: [
    { id: "yeni", label: "Yeni" },
    { id: "devam_ediyor", label: "Devam Ediyor" },
    { id: "bekliyor", label: "Bekliyor" },
    { id: "tamamlandi", label: "Tamamlandı" },
  ],
  metricLabel: "Tamamlanan iş",
  metrics: [
    { id: "active", label: "Aktif iş", kind: "active_count" },
    { id: "waiting", label: "Bekleyen", kind: "stage_count", stageIds: ["bekliyor"] },
    { id: "pipeline_value", label: "Pipeline tutarı", kind: "pipeline_value" },
    { id: "completed", label: "Tamamlanan", kind: "completed_count" },
  ],
  automations: [
    {
      id: "generic_new_items",
      title: "Yeni kayıt takibi",
      description: "Yeni eklenen işler için ilk temas veya bilgilendirme planla.",
      trigger: "items_in_stage",
      triggerStageId: "yeni",
      suggestedAction: "Yeni kayıtlar için karşılama mesajı veya görev oluştur.",
    },
    {
      id: "generic_stalled_work",
      title: "Durgun iş uyarısı",
      description: "Uzun süredir bekleyen kayıtlar için takip başlat.",
      trigger: "stalled_in_stage",
      triggerStageId: "bekliyor",
      suggestedAction: "Bekleyen kayıtlar için takip görevi oluştur.",
    },
  ],
};

export function getSectorAutomationEmptyHint(
  pack: SectorPack,
  items: SectorWorkflowItem[],
): string | null {
  if (items.length === 0) {
    return "İlk kaydı eklediğinizde uygun otomasyon önerileri burada görünür.";
  }

  const firstStageId = pack.stages[0]?.id;
  const inFirstStage = items.filter((item) => item.stage === firstStageId).length;
  if (inFirstStage === 0) {
    return `Aktif otomasyon için en az bir kayıt "${pack.stages[0]?.label}" aşamasında olmalı.`;
  }

  if (pack.id === "generic_service") {
    return `${inFirstStage} kayıt "Yeni" aşamasında — otomasyon kartı birazdan görünmeli. Görünmüyorsa sayfayı yenileyin.`;
  }

  return `${inFirstStage} kayıt "${pack.stages[0]?.label}" aşamasında. Otomasyon kuralları eşleştiğinde kartlar burada listelenir.`;
}

function normalizeSectorText(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function findPackByOnboardingIndustry(industry: string): SectorPack | undefined {
  const normalized = industry.trim();
  if (!normalized) return undefined;

  return SECTOR_PACKS.find((pack) =>
    pack.onboardingMatches?.some((match) => match === normalized),
  );
}

function findPackByKeywords(sector: string): SectorPack | undefined {
  return SECTOR_PACKS.find((pack) =>
    pack.matches.some((keyword) => sector.includes(keyword)),
  );
}

function getCompletedStageId(pack: SectorPack) {
  return pack.stages[pack.stages.length - 1].id;
}

function countItemsInStages(items: SectorWorkflowItem[], stageIds: string[]) {
  return items.filter((item) => stageIds.includes(item.stage)).length;
}

function isStalledItem(item: SectorWorkflowItem, stageId: string) {
  if (item.stage !== stageId) return false;

  const createdAt = new Date(item.createdAt).getTime();
  if (Number.isNaN(createdAt)) return true;

  const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
  return ageHours >= 24;
}

function formatMetricValue(
  value: number,
  kind: SectorPack["metrics"][number]["kind"],
): string {
  if (kind === "completion_rate") {
    return `%${Math.round(value)}`;
  }

  if (kind === "pipeline_value") {
    return value.toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    });
  }

  return value.toLocaleString("tr-TR");
}

export function resolveSectorPackFromIndustry(industry: string): SectorPack {
  return (
    findPackByOnboardingIndustry(industry) ||
    findPackByKeywords(normalizeSectorText(industry)) ||
    DEFAULT_PACK
  );
}

export function resolveSectorPack(business: Business): SectorPack {
  const industry = business.industry?.trim() || "";
  if (industry) {
    const onboardingPack = findPackByOnboardingIndustry(industry);
    if (onboardingPack) return onboardingPack;
  }

  const sector = normalizeSectorText(
    `${business.industry || ""} ${business.sector || ""}`,
  );

  return findPackByKeywords(sector) || DEFAULT_PACK;
}

export function computePackMetricCards(
  pack: SectorPack,
  items: SectorWorkflowItem[],
): SectorPackMetricCard[] {
  const completedStageId = getCompletedStageId(pack);
  const activeItems = items.filter((item) => item.stage !== completedStageId);
  const completedItems = items.filter((item) => item.stage === completedStageId);
  const total = items.length;

  return pack.metrics.map((metric) => {
    let value = 0;

    switch (metric.kind) {
      case "active_count":
        value = activeItems.length;
        break;
      case "completed_count":
        value = completedItems.length;
        break;
      case "stage_count":
        value = countItemsInStages(items, metric.stageIds || []);
        break;
      case "pipeline_value":
        value = activeItems.reduce(
          (sum, item) => sum + Number(item.value || 0),
          0,
        );
        break;
      case "completion_rate":
        value = total === 0 ? 0 : (completedItems.length / total) * 100;
        break;
    }

    return {
      id: metric.id,
      label: metric.label,
      value,
      displayValue: formatMetricValue(value, metric.kind),
    };
  });
}

export function getActiveSectorAutomations(
  pack: SectorPack,
  items: SectorWorkflowItem[],
): SectorPackAutomationSuggestion[] {
  const completedStageId = getCompletedStageId(pack);
  const activeItems = items.filter((item) => item.stage !== completedStageId);
  const pipelineValue = activeItems.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  return pack.automations
    .map((automation) => {
      let affectedCount = 0;

      switch (automation.trigger) {
        case "items_in_stage":
          affectedCount = items.filter(
            (item) => item.stage === automation.triggerStageId,
          ).length;
          break;
        case "stalled_in_stage":
          affectedCount = items.filter((item) =>
            isStalledItem(item, automation.triggerStageId || ""),
          ).length;
          break;
        case "high_pipeline":
          affectedCount = pipelineValue >= 10000 ? activeItems.length : 0;
          break;
      }

      if (affectedCount === 0) return null;

      return {
        id: automation.id,
        title: automation.title,
        description: automation.description,
        suggestedAction: automation.suggestedAction,
        affectedCount,
      };
    })
    .filter((item): item is SectorPackAutomationSuggestion => item !== null);
}

export function getSectorPackIds() {
  return SECTOR_PACKS.map((pack) => pack.id);
}