import React, { useState } from "react";

export interface OnboardingData {
  name: string;
  industry: string;
  city: string;
  address: string;
  whatsapp_number: string;
  working_hours: string;
  business_type: string;
  goals: string[];
  top_products: string;
  target_audience: string; // Not: Array yerine string kullanılıyor gibi, kod buna göre uyarlandı
  contact_points: string[];
  unique_selling_point: string;
  brand_tone: string;
  color_preference: string;
}

interface OnboardingWizardProps {
  step: number;
  setStep: (step: number) => void;
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  onComplete: () => void;
  isSettingUp: boolean;
  setupError?: string;
}

// 🚀 Zenginleştirilmiş Sektör Kategorileri
const SECTOR_CATEGORIES = [
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
      "Spor Salonu & Fitness",
      "Oto Bakım, Yıkama & Servis",
      "Gayrimenkul & Emlak",
      "Lojistik, Taşımacılık & Depolama",
      "Danışmanlık ve B2B Hizmetler",
    ],
  },
];

function FieldError({
  field,
  errors,
  visible,
}: {
  field: string;
  errors: Record<string, string>;
  visible: boolean;
}) {
  if (!visible || !errors[field]) return null;

  return (
    <p className="mt-2 text-sm font-medium text-red-600" role="alert">
      {errors[field]}
    </p>
  );
}

export default function OnboardingWizard({
  step,
  setStep,
  data,
  setData,
  onComplete,
  isSettingUp,
  setupError,
}: OnboardingWizardProps) {
  const [attemptedSteps, setAttemptedSteps] = useState<number[]>([]);

  const toggleArrayItem = (
    field: "goals" | "contact_points", // target_audience string olduğu için buradan çıkarıldı. string ise string manipülasyonu yapmalı, array ise array. Aşağıda target_audience için ayrı mantık kurdum.
    value: string,
  ) => {
    const currentArray = data[field] as string[];
    if (currentArray.includes(value)) {
      setData({
        ...data,
        [field]: currentArray.filter((item) => item !== value),
      });
    } else {
      if (currentArray.length < 3) {
        setData({ ...data, [field]: [...currentArray, value] });
      }
    }
  };

  // Target audience string ise virgülle ayırarak işliyoruz (veya array ise array olarak işleriz. Arayüzde çoklu seçim gibi görünüyor, bu yüzden array'miş gibi davranıp string'e çevirmek daha sağlıklı olabilir. Mevcut veri yapınız string).
  const toggleTargetAudience = (value: string) => {
    // Eğer target_audience hali hazırda bir array ise (Backend bazen array atabiliyor) onu güvenle işleyelim
    const currentArr = Array.isArray(data.target_audience)
      ? data.target_audience
      : data.target_audience
        ? data.target_audience.split(", ")
        : [];

    let newArr;
    if (currentArr.includes(value)) {
      newArr = currentArr.filter((item) => item !== value);
    } else {
      newArr = [...currentArr, value];
    }

    // Backend'in beklediği gibi string olarak (virgülle ayrılmış) kaydedelim
    setData({ ...data, target_audience: newArr.join(", ") });
  };

  // Seçili mi kontrolü (string veya array ihtimaline karşı)
  const isAudienceSelected = (aud: string) => {
    const currentArr = Array.isArray(data.target_audience)
      ? data.target_audience
      : data.target_audience
        ? data.target_audience.split(", ")
        : [];
    return currentArr.includes(aud);
  };

  const getStepErrors = (): Record<string, string> => {
    if (step === 1) {
      return {
        name: !data.name.trim() ? "İşletme adını yazın." : "",
        industry: !data.industry ? "Sektörünüzü seçin." : "",
        city: !data.city.trim() ? "Şehrinizi yazın." : "",
      };
    }

    if (step === 2) {
      return {
        address: !data.address.trim() ? "Tam adresinizi yazın." : "",
        whatsapp_number: !data.whatsapp_number.trim()
          ? "WhatsApp veya iletişim numaranızı yazın."
          : "",
      };
    }

    if (step === 3) {
      return {
        business_type: !data.business_type
          ? "İşletme modelinizi seçin."
          : "",
        goals: data.goals.length === 0 ? "En az bir hedef seçin." : "",
        top_products: !data.top_products.trim()
          ? "Öne çıkan ürün veya hizmetlerinizi yazın."
          : "",
      };
    }

    if (step === 4) {
      return {
        target_audience: !data.target_audience
          ? "En az bir müşteri kitlesi seçin."
          : "",
        contact_points:
          data.contact_points.length === 0
            ? "En az bir iletişim kanalı seçin."
            : "",
        unique_selling_point: !data.unique_selling_point.trim()
          ? "İşletmenizi özel yapan özelliği yazın."
          : "",
      };
    }

    if (step === 5) {
      return {
        brand_tone: !data.brand_tone ? "Marka tonunuzu seçin." : "",
      };
    }

    return {};
  };

  const stepErrors = getStepErrors();
  const missingFields = Object.values(stepErrors).filter(Boolean);
  const showErrors = attemptedSteps.includes(step);

  const handleContinue = (nextStep: number) => {
    setAttemptedSteps((current) =>
      current.includes(step) ? current : [...current, step],
    );
    if (missingFields.length === 0) setStep(nextStep);
  };

  const handleComplete = () => {
    setAttemptedSteps((current) =>
      current.includes(step) ? current : [...current, step],
    );
    if (missingFields.length === 0) onComplete();
  };

  const errorClass = (field: string) =>
    showErrors && stepErrors[field]
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-gray-200 focus:border-blue-500";

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mt-10 animate-fade-in-up">
      <div className="text-center mb-8">
        <span className="text-4xl block mb-4">🚀</span>
        <h1 className="text-2xl font-bold text-gray-900">
          LocalPilot&apos;a Hoş Geldiniz
        </h1>
        <p className="text-gray-500 mt-2">
          İşletmenizin yapay zeka beynini beslemek için detayları alalım.
        </p>
        {/* İlerleme Çubuğu */}
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full ${step >= s ? "bg-blue-600" : "bg-gray-200"}`}
            ></div>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-gray-400">
          İlerlemeniz bu cihazda otomatik olarak kaydedilir.
        </p>
        {showErrors && missingFields.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
            <p className="text-sm font-bold text-amber-800">
              Bu adımı tamamlamak için eksik alanlar:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-700">
              {missingFields.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        {setupError && (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700"
            role="alert"
          >
            {setupError}
          </div>
        )}
      </div>

      {/* ADIM 1: TEMEL BİLGİLER */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              İşletmenizin Adı
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Örn: Yıldız Makine..."
              aria-invalid={showErrors && Boolean(stepErrors.name)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("name")}`}
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
            <FieldError field="name" errors={stepErrors} visible={showErrors} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Sektörünüz <span className="text-red-500">*</span>
            </label>
            <select
              required
              aria-invalid={showErrors && Boolean(stepErrors.industry)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black bg-white ${errorClass("industry")}`}
              value={data.industry}
              onChange={(e) => setData({ ...data, industry: e.target.value })}
            >
              <option value="" disabled>
                Lütfen ana sektörünüzü seçin...
              </option>
              {SECTOR_CATEGORIES.map((category, idx) => (
                <optgroup
                  key={idx}
                  label={category.group}
                  className="font-bold text-gray-900 bg-gray-50"
                >
                  {category.items.map((item, itemIdx) => (
                    <option
                      key={itemIdx}
                      value={item}
                      className="font-normal text-gray-700 bg-white"
                    >
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="Diger" className="font-bold text-blue-600">
                Diğer (Belirtilmemiş)
              </option>
            </select>
            <FieldError
              field="industry"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Hangi Şehirdesiniz?
            </label>
            <input
              type="text"
              placeholder="Örn: Düzce..."
              aria-invalid={showErrors && Boolean(stepErrors.city)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("city")}`}
              value={data.city}
              onChange={(e) => setData({ ...data, city: e.target.value })}
            />
            <FieldError field="city" errors={stepErrors} visible={showErrors} />
          </div>
          <button
            onClick={() => handleContinue(2)}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg mt-2"
          >
            İleri ➔
          </button>
        </div>
      )}

      {/* ADIM 2: KONUM & İLETİŞİM */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tam Adresiniz (Google Maps için)
            </label>
            <textarea
              placeholder="Örn: Gümüşova OSB..."
              rows={2}
              aria-invalid={showErrors && Boolean(stepErrors.address)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("address")}`}
              value={data.address}
              onChange={(e) => setData({ ...data, address: e.target.value })}
            />
            <FieldError
              field="address"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              WhatsApp / İletişim Numaranız
            </label>
            <input
              type="tel"
              placeholder="Örn: 0555 555 55 55"
              aria-invalid={
                showErrors && Boolean(stepErrors.whatsapp_number)
              }
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-lg text-black ${errorClass("whatsapp_number")}`}
              value={data.whatsapp_number}
              onChange={(e) =>
                setData({ ...data, whatsapp_number: e.target.value })
              }
            />
            <FieldError
              field="whatsapp_number"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Çalışma Saatleriniz
            </label>
            <input
              type="text"
              placeholder="Örn: Haftaiçi 08:00 - 18:00, Cumartesi 08:00 - 13:00"
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition text-lg text-black"
              value={data.working_hours}
              onChange={(e) =>
                setData({ ...data, working_hours: e.target.value })
              }
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={() => handleContinue(3)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
            >
              İleri ➔
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3: İŞ MODELİ VE HEDEFLER */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              İşletme Modeliniz Nedir?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "urun", label: "📦 Üretim/Ürün" },
                { id: "hizmet", label: "🤝 Sadece Hizmet" },
                { id: "ikisi", label: "⚖️ Üretim + Hizmet" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setData({ ...data, business_type: type.id })}
                  className={`p-3 border-2 rounded-xl text-center text-sm font-bold transition ${data.business_type === type.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <FieldError
              field="business_type"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              En Büyük Hedefleriniz?{" "}
              <span className="text-xs font-normal text-gray-500">
                (En fazla 3)
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "Daha fazla B2B / Kurumsal Müşteri",
                "Üretim Kapasitesini Doldurmak",
                "Tekrarlayan Siparişler Almak",
                "Marka Bilinirliğini Artırmak",
                "Müşteri Taleplerini Hızlı Yanıtlamak",
                "Stok / Üretim Takibi Yapmak",
              ].map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleArrayItem("goals", goal)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${data.goals.includes(goal) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {data.goals.includes(goal) ? "✅ " : "⬜ "}
                  {goal}
                </button>
              ))}
            </div>
            <FieldError field="goals" errors={stepErrors} visible={showErrors} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              En Popüler 3 Ürün / Hizmetiniz Nedir?
            </label>
            <textarea
              placeholder="Örn: 1. Sac Kalıbı, 2. Yedek Parça İmalatı, 3. 3D Modelleme"
              rows={2}
              aria-invalid={showErrors && Boolean(stepErrors.top_products)}
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-sm text-black ${errorClass("top_products")}`}
              value={data.top_products}
              onChange={(e) =>
                setData({ ...data, top_products: e.target.value })
              }
            />
            <FieldError
              field="top_products"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={() => handleContinue(4)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
            >
              İleri ➔
            </button>
          </div>
        </div>
      )}

      {/* ADIM 4: MÜŞTERİ VE DEĞER ÖNERİSİ */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Ağırlıklı Müşteri Kitleniz Kimler?{" "}
              <span className="text-xs font-normal text-gray-500">
                (Çoklu Seçim)
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                "Ana Sanayi / Fabrikalar",
                "KOBİ'ler ve Atölyeler",
                "Otomotiv Sektörü",
                "Beyaz Eşya Sektörü",
                "Toptancılar / Distribütörler",
                "Son Tüketiciler (B2C)",
              ].map((aud) => (
                <button
                  key={aud}
                  onClick={() => toggleTargetAudience(aud)}
                  className={`p-3 border-2 rounded-xl text-center text-sm font-medium transition ${
                    isAudienceSelected(aud)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-blue-300"
                  }`}
                >
                  {isAudienceSelected(aud) ? "✅ " : "⬜ "}
                  {aud}
                </button>
              ))}
            </div>
            <FieldError
              field="target_audience"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Size En Çok Nereden Ulaşıyorlar?{" "}
              <span className="text-xs font-normal text-gray-500">
                (Çoklu Seçim)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                "B2B Referans / Ağ",
                "E-posta / Kurumsal İletişim",
                "WhatsApp Business",
                "Telefon Araması",
                "Fuar ve Ziyaretler",
                "Web Sitesi İletişim Formu",
              ].map((contact) => (
                <button
                  key={contact}
                  onClick={() => toggleArrayItem("contact_points", contact)}
                  className={`p-3 border-2 rounded-xl text-left text-sm font-medium transition ${data.contact_points.includes(contact) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {data.contact_points.includes(contact) ? "✅ " : "⬜ "}
                  {contact}
                </button>
              ))}
            </div>
            <FieldError
              field="contact_points"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              İşletmenizi Özel Yapan Şey Ne? (Neden Siz?)
            </label>
            <textarea
              placeholder="Örn: Yüksek hassasiyetli CNC işleme, zamanında teslimat garantisi, özel tasarım kalıp imalatı..."
              rows={2}
              aria-invalid={
                showErrors && Boolean(stepErrors.unique_selling_point)
              }
              className={`w-full border-2 rounded-xl p-3 focus:ring-0 outline-none transition text-sm text-black ${errorClass("unique_selling_point")}`}
              value={data.unique_selling_point}
              onChange={(e) =>
                setData({ ...data, unique_selling_point: e.target.value })
              }
            />
            <FieldError
              field="unique_selling_point"
              errors={stepErrors}
              visible={showErrors}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={() => handleContinue(5)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition text-lg"
            >
              İleri ➔
            </button>
          </div>
        </div>
      )}

      {/* ADIM 5: MARKA KİMLİĞİ */}
      {step === 5 && (
        <div className="space-y-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Markanızın Tonu Nasıl?
            </label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { id: "profesyonel", label: "🏢 Profesyonel ve Ciddi" },
                { id: "teknolojik", label: "⚙️ Teknolojik ve İnovatif" },
                { id: "guvenilir", label: "🤝 Güvenilir ve Köklü" },
                { id: "dinamik", label: "⚡ Dinamik ve Hızlı" },
              ].map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setData({ ...data, brand_tone: tone.id })}
                  className={`p-3 border-2 rounded-xl text-center text-sm font-medium transition ${data.brand_tone === tone.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
            <FieldError
              field="brand_tone"
              errors={stepErrors}
              visible={showErrors}
            />

            <label className="block text-sm font-bold text-gray-700 mb-2">
              Siteniz İçin Renk Tercihiniz?
            </label>
            <select
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-0 outline-none transition text-black bg-white"
              value={data.color_preference}
              onChange={(e) =>
                setData({ ...data, color_preference: e.target.value })
              }
            >
              <option value="ai">🤖 Yapay Zeka Sektörüme Göre Seçsin</option>
              <option value="blue">🔵 Mavi (Güven, Kurumsal, Teknoloji)</option>
              <option value="gray">🔘 Gri/Metalik (Endüstri, Makine)</option>
              <option value="black">⚫ Siyah (Güç, Premium, Kesinlik)</option>
              <option value="green">🟢 Yeşil (Doğa Dostu Üretim)</option>
              <option value="amber">🟠 Turuncu (Enerji, İş Makinesi)</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(4)}
              className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Geri
            </button>
            <button
              onClick={handleComplete}
              disabled={isSettingUp}
              className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition text-lg flex justify-center items-center gap-2"
            >
              {isSettingUp ? "AI Motoru Çalışıyor..." : "✨ Akıllı Paneli Kur"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
