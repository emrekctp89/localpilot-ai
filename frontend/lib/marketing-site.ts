import { FREE_AI_DAILY_LIMIT, FREE_AI_MONTHLY_LIMIT, PRO_FEATURES } from "./pro-funnel";

export interface ValueProp {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export interface SectorDemo {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  accentLight: string;
  accentText: string;
  highlights: string[];
  preview: {
    headline: string;
    metricA: { label: string; value: string };
    metricB: { label: string; value: string };
    metricC: { label: string; value: string };
    actionLabel: string;
    listTitle: string;
    listItems: string[];
  };
}

export interface PricingPlan {
  id: string;
  name: string;
  priceLabel: string;
  priceNote: string;
  description: string;
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  billingToggle?: boolean;
  features: string[];
}

export const MARKETING_VALUE_PROPS: ValueProp[] = [
  {
    id: "ai-os",
    icon: "🧠",
    title: "AI İşletme OS",
    description:
      "Kurulumdan itibaren teşhis, kampanya, içerik ve aksiyon planı üretir; tek panelden yönetirsiniz.",
  },
  {
    id: "crm-ops",
    icon: "📊",
    title: "Operasyon + CRM",
    description:
      "Müşteri, randevu, sipariş, kasa ve görevleri sektörünüze göre özelleştirilmiş akışlarla takip edin.",
  },
  {
    id: "decision",
    icon: "⚡",
    title: "Karar Merkezi",
    description:
      "AI önerilerini onaylayın, otomasyona dönüştürün ve sonuçları ölçerek öğrenen bir döngü kurun.",
  },
  {
    id: "mini-site",
    icon: "🌐",
    title: "Mini Site + Lead",
    description:
      "Yayınlanabilir vitrin siteniz, SEO ve WhatsApp derin linkiyle lead'leri doğrudan CRM'e taşır.",
  },
];

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: 1,
    title: "5 dakikada kurulum",
    description:
      "Sektörünüzü seçin, hedeflerinizi girin; AI işletme planınızı ve modüllerinizi otomatik açsın.",
  },
  {
    step: 2,
    title: "Günlük operasyonu yönetin",
    description:
      "CRM, randevu, içerik ve kasa verilerini tek panelde toplayın; sektör paketleri size özel akış sunsun.",
  },
  {
    step: 3,
    title: "AI ile büyüyün",
    description:
      "Kampanya üretin, yorumları analiz edin, Karar Merkezi'nde onaylayın ve sonuçları ölçün.",
  },
];

export const SECTOR_DEMOS: SectorDemo[] = [
  {
    id: "restaurant",
    name: "Restoran & Kafe",
    tagline: "Rezervasyon, sipariş ve yoğun saat yönetimi",
    accent: "bg-amber-500",
    accentLight: "bg-amber-50",
    accentText: "text-amber-700",
    highlights: [
      "Rezervasyon onay otomasyonu",
      "Paket servis kampanyaları",
      "Mini site ile menü vitrini",
    ],
    preview: {
      headline: "Akşam servisi özeti",
      metricA: { label: "Açık rezervasyon", value: "12" },
      metricB: { label: "Mutfakta", value: "8" },
      metricC: { label: "Açık sipariş", value: "₺4.280" },
      actionLabel: "Yoğun saat görevi oluştur",
      listTitle: "Bugünün AI önerileri",
      listItems: [
        "Rezervasyon onay mesajı gönder",
        "Hafta sonu menü kampanyası üret",
        "Google profil fotoğrafı güncelle",
      ],
    },
  },
  {
    id: "clinic",
    name: "Klinik & Sağlık",
    tagline: "Randevu hatırlatma ve hasta takibi",
    accent: "bg-emerald-500",
    accentLight: "bg-emerald-50",
    accentText: "text-emerald-700",
    highlights: [
      "Randevu hatırlatma şablonları",
      "Hasta CRM ve takip notları",
      "Finans tahmini ile nakit planı",
    ],
    preview: {
      headline: "Klinik randevu paneli",
      metricA: { label: "Bugünkü randevu", value: "18" },
      metricB: { label: "Onay bekleyen", value: "5" },
      metricC: { label: "Tamamlanan", value: "11" },
      actionLabel: "Hatırlatma mesajı planla",
      listTitle: "Karar Merkezi",
      listItems: [
        "Gelmeyen hastalara yeniden planlama",
        "Yorum analizi → yanıt şablonu",
        "3 aylık gelir projeksiyonu",
      ],
    },
  },
  {
    id: "salon",
    name: "Kuaför & Güzellik",
    tagline: "Randevu doluluk ve müşteri geri kazanımı",
    accent: "bg-rose-500",
    accentLight: "bg-rose-50",
    accentText: "text-rose-700",
    highlights: [
      "No-show takip otomasyonu",
      "Sadakat kampanyaları",
      "Sosyal medya içerik planı",
    ],
    preview: {
      headline: "Salon akışı",
      metricA: { label: "Bekleyen randevu", value: "9" },
      metricB: { label: "Hizmette", value: "4" },
      metricC: { label: "Tamamlanma", value: "%86" },
      actionLabel: "Gelmeyen müşteriye mesaj",
      listTitle: "Kampanya motoru",
      listItems: [
        "Hafta sonu bakım paketi",
        "WhatsApp randevu hatırlatması",
        "Yorumlara teşekkür yanıtı",
      ],
    },
  },
  {
    id: "real_estate",
    name: "Gayrimenkul",
    tagline: "Gösterim takibi ve lead nurturing",
    accent: "bg-indigo-500",
    accentLight: "bg-indigo-50",
    accentText: "text-indigo-700",
    highlights: [
      "Gösterim sonrası geri bildirim",
      "Lead CRM ve durum takibi",
      "Portföy vitrin mini sitesi",
    ],
    preview: {
      headline: "Satış hunisi",
      metricA: { label: "Aktif lead", value: "24" },
      metricB: { label: "Gösterim bu hafta", value: "7" },
      metricC: { label: "Teklif aşaması", value: "3" },
      actionLabel: "Geri bildirim mesajı gönder",
      listTitle: "Sektör iş akışı",
      listItems: [
        "Gösterimden 24 saat sonra takip",
        "Fiyat güncelleme kampanyası",
        "Google işletme profili kontrolü",
      ],
    },
  },
  {
    id: "auto",
    name: "Oto Servis",
    tagline: "Servis randevusu ve parça siparişi",
    accent: "bg-slate-700",
    accentLight: "bg-slate-100",
    accentText: "text-slate-700",
    highlights: [
      "Servis hatırlatma akışları",
      "Sipariş ve ödeme takibi",
      "Müşteri kaybı analizi",
    ],
    preview: {
      headline: "Servis operasyonu",
      metricA: { label: "Atölyede", value: "6" },
      metricB: { label: "Parça bekleyen", value: "2" },
      metricC: { label: "Teslime hazır", value: "4" },
      actionLabel: "Teslim bildirimi gönder",
      listTitle: "AI araçları",
      listItems: [
        "Periyodik bakım kampanyası",
        "Churn riski analizi",
        "Kasa trend projeksiyonu",
      ],
    },
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Ücretsiz",
    priceLabel: "₺0",
    priceNote: "Sonsuza kadar",
    description: "Yerel işletmenizi dijitalize etmeye başlayın.",
    cta: "Ücretsiz Başla",
    ctaHref: "/auth",
    features: [
      "Tam operasyon paneli (CRM, randevu, kasa)",
      "Mini site ve lead formu",
      "Karar Merkezi erişimi",
      `AI araçları: günde ${FREE_AI_DAILY_LIMIT}, ayda ${FREE_AI_MONTHLY_LIMIT} istek`,
      "Sektör paketleri ve iş akışları",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "₺299",
    priceNote: "/ ay",
    description: "Sınırsız AI ve gelişmiş büyüme araçları. Aylık veya yıllık abonelik.",
    cta: "Pro'ya Geç",
    ctaHref: "/auth",
    highlighted: true,
    billingToggle: true,
    features: [
      "Ücretsiz plandaki her şey",
      "Sınırsız AI kampanya ve analiz",
      "Yorum analizi ve finans tahmini",
      "Google profil AI önerileri",
      "Öncelikli model erişimi",
      ...PRO_FEATURES.map((feature) => feature.title),
    ],
  },
];

export const MARKETING_FAQ = [
  {
    question: "Kurulum ne kadar sürer?",
    answer:
      "Onboarding sihirbazı 5 adımda tamamlanır; AI işletme planınız ve mini siteniz kurulumla birlikte hazırlanır.",
  },
  {
    question: "Hangi sektörler destekleniyor?",
    answer:
      "Restoran, klinik, kuaför, emlak, oto servis ve daha fazlası için özelleştirilmiş sektör paketleri sunuyoruz.",
  },
  {
    question: "Pro plan nasıl çalışır?",
    answer:
      "Aylık (₺299) veya yıllık (₺2.990, 2 ay bedava) abonelik seçebilirsiniz. Panelden tek tıkla Stripe Checkout ile ödeme yaparsınız; ödeme sonrası Pro özellikleri açılır.",
  },
];