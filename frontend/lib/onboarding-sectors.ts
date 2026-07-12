/**
 * Shared sector catalog + matching for onboarding select / magic-fill.
 */

export const SECTOR_CATEGORIES = [
  {
    group: "Endüstri, İmalat ve Yan Sanayi",
    items: [
      "Metal Şekillendirme ve Pres İmalatı",
      "Otomotiv Yan Sanayi",
      "3D Baskı ve Katmanlı Üretim",
      "Makine ve Yedek Parça Üretimi",
      "Plastik, Kalıp ve Ambalaj",
      "Endüstriyel Ekipman Tedariği",
    ],
  },
  {
    group: "Yeme, İçme ve Gıda",
    items: [
      "Restoran & Lokanta",
      "Kafe & Kahveciler",
      "Pastane, Fırın & Tatlıcı",
      "Fast Food & Paket Servis",
      "Gıda Üretimi ve Toptan Satış",
    ],
  },
  {
    group: "Perakende ve Mağazacılık",
    items: [
      "Giyim, Tekstil & Butik",
      "Market & Süpermarket",
      "Elektronik & Teknoloji Mağazası",
      "Kozmetik & Kişisel Bakım",
      "Otomotiv & Galeri",
    ],
  },
  {
    group: "Hizmet ve Profesyonel",
    items: [
      "Yazılım ve Teknoloji Ajansı",
      "Kuaför & Güzellik Salonu",
      "Sağlık & Klinik",
      "Spor Salonu & Fitness",
      "Oto Bakım, Yıkama & Servis",
      "Gayrimenkul & Emlak",
      "Lojistik, Taşımacılık & Depolama",
      "Danışmanlık ve B2B Hizmetler",
    ],
  },
] as const;

export const OTHER_INDUSTRY_VALUE = "Diger";

export function listAllSectorItems(): string[] {
  return SECTOR_CATEGORIES.flatMap((category) => [...category.items]);
}

function normalizeForMatch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keyword hints → preferred catalog sector */
const KEYWORD_MAP: Array<{ keywords: string[]; sector: string }> = [
  {
    keywords: ["restoran", "lokanta", "restaurant", "yemek"],
    sector: "Restoran & Lokanta",
  },
  { keywords: ["kafe", "kahve", "cafe", "coffee"], sector: "Kafe & Kahveciler" },
  {
    keywords: ["pastane", "firin", "tatli", "bakery"],
    sector: "Pastane, Fırın & Tatlıcı",
  },
  {
    keywords: ["fast food", "paket servis", "burger", "pizza"],
    sector: "Fast Food & Paket Servis",
  },
  {
    keywords: ["kuafor", "guzellik", "berber", "salon", "nail"],
    sector: "Kuaför & Güzellik Salonu",
  },
  {
    keywords: ["klinik", "dis", "saglik", "doktor", "hastane"],
    sector: "Sağlık & Klinik",
  },
  {
    keywords: ["spor", "fitness", "gym", "pilates"],
    sector: "Spor Salonu & Fitness",
  },
  {
    keywords: ["yazilim", "software", "ajans", "teknoloji ajans"],
    sector: "Yazılım ve Teknoloji Ajansı",
  },
  {
    keywords: ["emlak", "gayrimenkul", "real estate"],
    sector: "Gayrimenkul & Emlak",
  },
  {
    keywords: ["oto", "araba", "yikama", "servis", "tamir"],
    sector: "Oto Bakım, Yıkama & Servis",
  },
  {
    keywords: ["giyim", "butik", "tekstil", "moda"],
    sector: "Giyim, Tekstil & Butik",
  },
  {
    keywords: ["market", "supermarket", "bakkal"],
    sector: "Market & Süpermarket",
  },
  {
    keywords: ["elektronik", "telefon", "bilgisayar"],
    sector: "Elektronik & Teknoloji Mağazası",
  },
  {
    keywords: ["kozmetik", "kisisel bakim", "parfumeri"],
    sector: "Kozmetik & Kişisel Bakım",
  },
  {
    keywords: ["galeri", "otomotiv satis", "arac sat"],
    sector: "Otomotiv & Galeri",
  },
  {
    keywords: ["lojistik", "kargo", "tasima", "depo"],
    sector: "Lojistik, Taşımacılık & Depolama",
  },
  {
    keywords: ["danismanlik", "b2b", "musavir"],
    sector: "Danışmanlık ve B2B Hizmetler",
  },
  {
    keywords: ["metal", "pres", "sac"],
    sector: "Metal Şekillendirme ve Pres İmalatı",
  },
  {
    keywords: ["otomotiv yan", "yedek parca uretim"],
    sector: "Otomotiv Yan Sanayi",
  },
  {
    keywords: ["3d", "baski", "katmanli"],
    sector: "3D Baskı ve Katmanlı Üretim",
  },
  {
    keywords: ["makine", "yedek parca"],
    sector: "Makine ve Yedek Parça Üretimi",
  },
  {
    keywords: ["plastik", "kalip", "ambalaj"],
    sector: "Plastik, Kalıp ve Ambalaj",
  },
  {
    keywords: ["endustriyel ekipman"],
    sector: "Endüstriyel Ekipman Tedariği",
  },
  {
    keywords: ["gida uretim", "toptan gida"],
    sector: "Gıda Üretimi ve Toptan Satış",
  },
];

/**
 * Map free-text industry (e.g. magic-fill AI) onto onboarding <select> values.
 * Exact / substring match first, then keyword map, else "Diger".
 */
export function matchIndustryToCatalog(
  raw?: string | null,
): { value: string; matched: boolean; source: "exact" | "keyword" | "other" } {
  const input = (raw || "").trim();
  if (!input) {
    return { value: "", matched: false, source: "other" };
  }

  const catalog = listAllSectorItems();
  const normalizedInput = normalizeForMatch(input);

  // Exact (case-insensitive)
  const exact = catalog.find(
    (item) => normalizeForMatch(item) === normalizedInput,
  );
  if (exact) {
    return { value: exact, matched: true, source: "exact" };
  }

  // Substring either way
  const partial = catalog.find((item) => {
    const n = normalizeForMatch(item);
    return n.includes(normalizedInput) || normalizedInput.includes(n);
  });
  if (partial) {
    return { value: partial, matched: true, source: "exact" };
  }

  // Keyword hints
  for (const rule of KEYWORD_MAP) {
    if (rule.keywords.some((kw) => normalizedInput.includes(kw))) {
      return { value: rule.sector, matched: true, source: "keyword" };
    }
  }

  return { value: OTHER_INDUSTRY_VALUE, matched: false, source: "other" };
}
