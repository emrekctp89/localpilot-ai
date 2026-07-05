import type { Business, SectorPack } from "./domain-types";

const SECTOR_PACKS: SectorPack[] = [
  {
    id: "salon",
    name: "Kuaför ve Güzellik",
    matches: ["kuaför", "güzellik", "berber", "salon"],
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
  },
  {
    id: "field_service",
    name: "Tesisat ve Saha Servisi",
    matches: ["tesisat", "servis", "bakım", "onarım", "teknik"],
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
  },
  {
    id: "auto_gallery",
    name: "Otomotiv Galeri",
    matches: ["galeri", "otomotiv", "araç", "oto satış"],
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
  },
  {
    id: "retail",
    name: "Perakende Operasyonu",
    matches: ["market", "perakende", "mağaza", "butik"],
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
};

export function resolveSectorPack(business: Business): SectorPack {
  const sector = `${business.industry || ""} ${business.sector || ""}`
    .toLocaleLowerCase("tr-TR")
    .trim();

  return (
    SECTOR_PACKS.find((pack) =>
      pack.matches.some((keyword) => sector.includes(keyword)),
    ) || DEFAULT_PACK
  );
}

export function getSectorPackIds() {
  return SECTOR_PACKS.map((pack) => pack.id);
}
