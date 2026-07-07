# LocalPilot AI — Proje Sunumu ve Teknik Rapor

**Sürüm:** 2.0.0 (production)  
**Güncelleme:** 7 Temmuz 2026  
**Repo:** [github.com/emrekctp89/localpilot-ai](https://github.com/emrekctp89/localpilot-ai)

---

## İçindekiler

1. [LocalPilot nedir?](#1-localpilot-nedir)
2. [Mimari](#2-mimari)
3. [Kullanıcı yolculuğu](#3-kullanıcı-yolculuğu)
4. [Onboarding (5 adım)](#4-onboarding-5-adım)
5. [Kurulumda AI ne üretir?](#5-kurulumda-ai-ne-üretir)
6. [Sekmeler nasıl belirlenir?](#6-sekmeler-nasıl-belirlenir)
7. [Dashboard sekmeleri](#7-dashboard-sekmeleri)
8. [Sektör paketi ve İş Akışı](#8-sektör-paketi-ve-iş-akışı)
9. [Veri katmanı](#9-veri-katmanı)
10. [Karar Merkezi](#10-karar-merkezi)
11. [Pro üyelik](#11-pro-üyelik)
12. [Platform özellikleri](#12-platform-özellikleri)
13. [Entegrasyonlar ve webhook](#13-entegrasyonlar-ve-webhook)
14. [Dağıtım ve ortam değişkenleri](#14-dağıtım-ve-ortam-değişkenleri)
15. [Test ve CI](#15-test-ve-ci)
16. [Faz durumu](#16-faz-durumu)
17. [Elevator pitch](#17-elevator-pitch)

---

## 1. LocalPilot nedir?

LocalPilot AI, yerel işletmeler için **tek panelden çalışan bir Business OS**'tur. Randevu, CRM, sipariş, finans, içerik, Google profil, sektörel iş akışı ve yapay zeka destekli karar önerilerini bir araya getirir.

**Temel vaat:** Kurulumdan itibaren AI işletmeyi analiz eder, paneli kişiselleştirir, mini site + kampanya + WhatsApp şablonları üretir; operasyon verisi tablolarda birikir; Karar Merkezi ve sektör otomasyonları “ne yapmalıyım?” sorusuna cevap verir.

| Hedef kitle | Değer |
|-------------|--------|
| Kuaför, restoran, klinik, emlak, oto galeri… | Sektöre özel operasyon akışı |
| Tek lokasyonlu KOBİ | Tek panel, düşük öğrenme eğrisi |
| Ajans / çoklu işletme | Platform sekmesi, rol bazlı erişim |

---

## 2. Mimari

### Üç katman

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js · Vercel)                            │
│  /auth  /dashboard  /site/[id]  Pazarlama sayfaları     │
└───────────────────────┬─────────────────────────────────┘
                        │ JWT + REST
┌───────────────────────▼─────────────────────────────────┐
│  AI SERVICE (FastAPI · Render/Railway)                  │
│  Gemini · Stripe · /setup-business · /health            │
└───────────────────────┬─────────────────────────────────┘
                        │ Service role
┌───────────────────────▼─────────────────────────────────┐
│  SUPABASE (PostgreSQL + Auth + RLS)                     │
│  businesses · generated_plans · operasyonel tablolar    │
└─────────────────────────────────────────────────────────┘
```

| Katman | Teknoloji | Konum |
|--------|-----------|--------|
| Frontend | Next.js 15, React, Tailwind | `frontend/` → Vercel |
| AI Service | FastAPI, Gemini 2.5 Flash, Stripe | `ai-service/` → Render |
| Veritabanı | Supabase Postgres, Auth, RLS | `supabase/migrations/` |

### Önemli dosyalar

| Dosya / klasör | Rol |
|-----------------|-----|
| `frontend/app/dashboard/page.tsx` | Ana panel, sekme yönlendirme |
| `frontend/app/components/dashboard/OnboardingWizard.tsx` | 5 adımlı kurulum |
| `frontend/app/components/dashboard/TabMenu.tsx` | Sekme görünürlüğü |
| `frontend/lib/repositories/` | Veri okuma/yazma katmanı |
| `frontend/lib/sector-packs.ts` | Sektör şablonları ve otomasyon kuralları |
| `frontend/lib/business-os.ts` | Karar Merkezi motoru |
| `ai-service/main.py` | API endpoint'leri, `/setup-business` |
| `supabase/migrations/001–008` | Şema + RLS + migration takibi |

---

## 3. Kullanıcı yolculuğu

```
Kayıt/Giriş (/auth)
       ↓
İşletme var mı? ──hayır──→ Onboarding (5 adım)
       │                           ↓
      evet              POST /setup-business (AI + DB)
       │                           ↓
       └──────────────→ Dashboard (sekmeler + veri)
                                   ↓
                    Operasyon · Karar Merkezi · Mini site
```

**Onboarding ne zaman açılır?**  
Kullanıcının Supabase'de bağlı `businesses` kaydı yoksa (`shouldShowOnboarding = true`).

**Onboarding ne zaman kapanır?**  
`/setup-business` başarılı → `businesses` + `generated_plans` oluşur → panel yüklenir.

---

## 4. Onboarding (5 adım)

Sihirbaz: `OnboardingWizard.tsx`  
Tamamlama: `useOnboarding.ts` → `setupBusiness()` → AI Service

| Adım | Başlık | Toplanan veriler |
|------|--------|------------------|
| **1** | Temel bilgiler | İşletme adı, sektör (dropdown), şehir |
| **2** | Konum & iletişim | Adres, WhatsApp/telefon, çalışma saatleri |
| **3** | İş modeli | İşletme tipi, hedefler (max 3), öne çıkan ürün/hizmet |
| **4** | Müşteri & kanal | Hedef kitle, iletişim kanalları, USP |
| **5** | Marka | Marka tonu, renk tercihi → **Kurulumu Tamamla** |

### Davranışlar

- İlerleme **localStorage**'da otomatik kaydedilir (`onboardingDraftKey(userId)`).
- Adım 1'de sektör seçilince **atanan sektör paketi** önizlenir (ör. Otomotiv & Galeri → 5 aşamalı araç akışı).
- Validasyon adım bazlı; eksik alanlar kırmızı uyarı ile gösterilir.
- Kurulum sırasında loading + hata mesajı (`setupError`) gösterilir.

### Sektör listesi (özet)

Onboarding'deki sektörler gruplar halinde: Endüstri, Yeme-İçme, Perakende, Hizmet ve Profesyonel.  
Örnekler: Kuaför & Güzellik Salonu, Restoran & Lokanta, Otomotiv & Galeri, Gayrimenkul & Emlak, Sağlık & Klinik…

---

## 5. Kurulumda AI ne üretir?

**Endpoint:** `POST /setup-business` (`ai-service/main.py`)  
**Model:** Gemini 2.5 Flash  
**Prompt:** `SETUP_SYSTEM_INSTRUCTION` — işletme analizi + JSON şema

### AI çıktısı → veritabanı

| AI alanı | Kayıt yeri |
|----------|------------|
| `active_modules` | `businesses.active_modules` |
| `theme_config` | `businesses.theme_config` |
| `mini_site_data` | `generated_plans` |
| `social_media_calendar` (7 gün) | `generated_plans` → `content_items` |
| `whatsapp_templates` (5+) | `generated_plans` → `content_items` |
| `campaigns` (3) | `generated_plans` → `campaigns` |
| `business_diagnosis` | plan metadata |
| `module_reasons` | plan metadata |
| `quick_wins`, `next_7_days_plan` | plan metadata |

### AI modül havuzu (prompt'ta tanımlı)

```json
["ozet", "mini_site", "whatsapp", "sosyal_medya", "kampanya",
 "crm", "randevu", "menu", "yorum_analizi", "kasa", "gorevler"]
```

AI sektör, hedef kitle, kanallar ve iş modeline göre bu listeden seçim yapar. Eksik dönerse fallback:

```json
["ozet", "mini_site", "whatsapp", "kampanya", "sosyal_medya"]
```

---

## 6. Sekmeler nasıl belirlenir?

Sekme görünürlüğü `TabMenu.tsx` içinde **iki katmanlı** çalışır.

### Katman A — Her zaman açık sekmeler

`active_modules` listesinde olmasa bile görünür:

| Sekme ID | Panel adı |
|----------|-----------|
| `ozet` | Vitrin |
| `karar` | Karar Merkezi |
| `is_akisi` | İş Akışı |
| `icerik` | İçerik |
| `randevu` | Randevu |
| `siparis` | Sipariş |
| `personel` | Görevler |
| `google_business` | Google Profil |
| `araclar` | AI Modelleri |
| `ayarlar` | Ayarlar |
| `platform` | Platform |

### Katman B — AI modül listesine bağlı sekmeler

Yalnızca `business.active_modules` içinde ilgili ID varsa görünür:

| Sekme ID | Gerekli `active_modules` değeri |
|----------|----------------------------------|
| `crm` | `crm` |
| `menu` | `menu` |
| `kasa` | `kasa` |

### Katman C — AI ID ↔ sekme ID eşlemesi

AI modül ID'leri ile panel sekme ID'leri bire bir aynı değil:

| AI döner | Karşılık gelen panel | Not |
|----------|----------------------|-----|
| `kampanya` | İçerik / AI Modelleri | Sekmeler zaten her zaman açık |
| `sosyal_medya` | İçerik | 7 günlük takvim |
| `whatsapp` | İçerik, CRM | Ayrı sekme yok |
| `gorevler` | Görevler (`personel`) | Her zaman açık |
| `mini_site` | Ayarlar | Mini site yayın ayarları |
| `yorum_analizi` | AI Modelleri | Yorum analizi aracı |

**Pratik sonuç:** Onboarding'deki AI modül seçimi çoğunlukla **CRM, Menü ve Finans** sekmelerinin görünürlüğünü etkiler. Diğer sekmeler sabit açıktır.

### Kod referansı (filtre mantığı)

```typescript
// TabMenu.tsx — görünür sekme koşulu (özet)
visibleTabs = ALL_TABS.filter(tab =>
  RENDERED_TABS.has(tab.id) &&
  (activeModules.includes(tab.id) || ALWAYS_VISIBLE_TABS.includes(tab.id))
);
```

---

## 7. Dashboard sekmeleri

| Sekme | Bileşen | İşlev |
|-------|---------|--------|
| Vitrin | `OzetTab` | Özet, hızlı aksiyonlar, teşhis |
| Karar Merkezi | `KararMerkeziTab` | Veri analizi, öneri, onay, otomasyon |
| İş Akışı | `SektorIsAkisiTab` | Sektör paketi, aşamalar, otomasyon |
| İçerik | `IcerikTab` | Sosyal medya + WhatsApp şablonları |
| Müşteri | `CrmTab` | Müşteri kartları, churn analizi |
| Randevu | `RandevuTab` | Randevu CRUD, takvim |
| Sipariş | `SiparisTab` | Sipariş ve ödeme durumu |
| Menü | `MenuTab` | Ürün/hizmet menüsü |
| Finans | `KasaTab` | Gelir-gider, tahmin |
| Google Profil | `GoogleBusinessTab` | Checklist, profil önerileri |
| Görevler | `GorevlerTab` | Personel görevleri |
| AI Modelleri | `AiAraclarTab` | Kampanya üretimi, yorum analizi |
| Ayarlar | `AyarlarTab` | Profil, mini site, Pro durumu |
| Platform | `PlatformTab` | Ekip, API, webhook, audit |

---

## 8. Sektör paketi ve İş Akışı

### Paket nasıl seçilir?

```
onboarding.industry  →  resolveSectorPack(business)  →  SectorPack
```

Eşleşme sırası:
1. `onboardingMatches` (tam onboarding metni, örn. "Otomotiv & Galeri")
2. Anahtar kelime (`matches`: galeri, otomotiv, araç…)
3. Fallback: **Genel İş Akışı** (`generic_service`)

### Desteklenen paketler (özet)

| Paket ID | Ad | İlk aşama |
|----------|-----|-----------|
| `salon` | Kuaför ve Güzellik | Randevu |
| `restaurant` | Restoran ve Yeme-İçme | Rezervasyon |
| `clinic` | Klinik ve Sağlık | Randevu |
| `real_estate` | Gayrimenkul ve Emlak | Yeni İlan |
| `field_service` | Tesisat ve Saha Servisi | Yeni Talep |
| `auto_gallery` | Otomotiv Galeri | Stokta |
| `retail` | Perakende Operasyonu | Yeni |
| `generic_service` | Genel İş Akışı | Yeni |

### Otomotiv Galeri örneği (sizin paket)

**Aşamalar:** Stokta → Müşteri İlgileniyor → Test Sürüşü → Pazarlık → Satıldı

**Otomasyonlar:**

| Kural | Tetik | Ne zaman görünür |
|-------|-------|------------------|
| Stoktaki araç tanıtımı | `items_in_stage` / `stokta` | Kayıt Stokta'da → **anında** |
| Test sürüşü takibi | `items_in_stage` / `test_surusu` | Test sürüşü aşamasında |
| Uzun süreli stok uyarısı | `stalled_in_stage` / `stokta` | Stokta + **24 saatten eski** |

**Uygula butonu:**
- WhatsApp derin linki (hazır mesaj) veya
- Personel görevi oluşturma +
- Webhook: `sector.automation.triggered`

### İş Akışı ekran düzeni

```
[ Mavi başlık: Sektör Paketi adı + aşama sayıları ]
[ 4 metrik kartı ]
[ Sarı: Sektör Otomasyonları — veya “aktif öneri yok” kutusu ]
[ Sol: Yeni kayıt formu | Sağ: Kayıt listesi + aşama seçici ]
```

---

## 9. Veri katmanı

### Faz C — tablo öncelikli okuma

Production'da `NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ=true` ile `generated_plans` JSON fallback'i kapalıdır. Veriler doğrudan tablolardan okunur.

| Modül | Tablo |
|-------|--------|
| Randevu | `appointments` |
| Sipariş | `orders` |
| Görevler | `staff_tasks` |
| CRM takip | `crm_activities` |
| Kampanya | `campaigns` |
| İçerik | `content_items` |
| Karar döngüsü | `decision_cycles` |
| Google checklist | `google_checklists` |
| Sektör iş akışı | `sector_workflow_items` |
| Finans | `transactions` |
| Müşteri | `customers` |

### Repository katmanı

`frontend/lib/repositories/` — her modül için `list*` / `save*` fonksiyonları.  
`legacy-config.ts` — dual-read feature flag.

### Migration'lar

`001` operasyonel tablolar → `008` schema_migrations takibi.  
RLS: `002`, `007` (recursion fix). Platform: `006`.

---

## 10. Karar Merkezi

**Motor:** `frontend/lib/business-os.ts`  
**UI:** `KararMerkeziTab.tsx`

### Döngü

```
Veri toplama → Sinyal analizi → Öneri üretimi → Kullanıcı onayı
      → Otomasyon (görev / mesaj / sekme yönlendirme) → Sonuç ölçümü → Öğrenme
```

### Örnek sinyaller ve öneriler

| Sinyal | Öneri tipi | Otomasyon |
|--------|------------|-----------|
| Bekleyen tahsilat | `pending_payment` | WhatsApp mesajı |
| CRM churn riski | `crm_churn_risk` | Geri kazanım mesajı |
| Google profil % | `google_profile` | Checklist + Google aç |
| Boş randevu slotu | `empty_appointment_slots` | Kampanya / içerik |
| Geciken görevler | `overdue_tasks` | Personel görevi |

### Faz D — Tek Tık Aksiyon

Onay sonrası (`onaylandi` / `otomasyonda`):
- **WhatsApp'ta Aç** — hazır mesaj + `wa.me` linki
- **Google İşletme Profilini Aç**
- **Metni kopyala**
- İlgili sekmeye git

Webhook olayları: `decision.approved`, `decision.automated`

---

## 11. Pro üyelik

| Konu | Durum |
|------|--------|
| Stripe checkout kodu | Hazır |
| Webhook aktivasyonu | Kodda var, production'da **ertelendi** |
| **Güncel yöntem** | Manuel Supabase: `profiles.is_pro = true` |
| Panel | Kota kartı, aktivasyon checklist, Ayarlar'da yenile |

```sql
UPDATE profiles
SET is_pro = true, pro_activated_at = NOW()
WHERE id = '<kullanici-uuid>';
```

---

## 12. Platform özellikleri

| Özellik | Açıklama |
|---------|----------|
| Ekip rolleri | `owner` · `staff` · `read_only` |
| Ajans modu | `profiles.role = 'agency'` → işletme switcher |
| Audit log | Platform sekmesinde işlem geçmişi |
| API anahtarı | `GET /platform/business-summary` |
| Webhook yönetimi | Platform sekmesi |
| i18n | TR / EN (`lib/i18n/messages.ts`) |
| Read-only banner | Yazma yetkisi olmayan rollere uyarı |

---

## 13. Entegrasyonlar ve webhook

### Mevcut entegrasyonlar (Faz E öncesi)

| Kanal | Durum |
|-------|--------|
| WhatsApp | `wa.me` derin link + şablon hazırlığı (Cloud API beklemede) |
| Google Business | Manuel checklist + AI önerileri (OAuth yazma beklemede) |
| Google Calendar | ICS export |
| Stripe | Checkout + webhook (Pro otomasyon ertelendi) |

### Webhook olayları

```
lead.created
customer.created
decision.approved
decision.automated
sector.automation.triggered
```

**Günlük cron (opsiyonel):** `.github/workflows/sector-automation-cron.yml`  
Açmak için GitHub Variable: `SECTOR_AUTOMATION_CRON_ENABLED=true`  
Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 14. Dağıtım ve ortam değişkenleri

### Frontend (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_AI_SERVICE_URL=
NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ=true   # production
```

### AI Service (Render)

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
FRONTEND_URL=
ENVIRONMENT=production
```

Şablon: `deploy/production.env.template`

### Supabase

Migration sırası: `001` → `008` (SQL Editor veya CLI)  
Doğrulama: `supabase/scripts/verify_schema.sql`, `verify_schema_remote.py`

---

## 15. Test ve CI

| Test | Komut / workflow |
|------|------------------|
| Smoke | `npm run test:smoke` |
| Integration | `npm run test:integration` (50+ test) |
| E2E | Playwright (secrets varsa) |
| AI unit | `ai-service/tests/` |
| CI | `.github/workflows/test.yml` |

---

## 16. Faz durumu

| Faz | Odak | Durum |
|-----|------|--------|
| **A** | Pro billing (Stripe otomatik) | Ertelendi — manuel Pro |
| **B** | Migration, RLS, CI | Büyük ölçüde tamam |
| **C** | Tablo migrasyonu, legacy kapatma | Tamam |
| **D** | Sektör otomasyon, tek tık aksiyon | Devam |
| **E** | WhatsApp API, Google API yazma | Planlı |
| **F** | Büyüme (yıllık plan, referans) | Planlı |
| **G** | Platform ölçeği (white-label) | Planlı |

Detaylı takip: `docs/ROADMAP.md`, `docs/production-checklist.md`

---

## 17. Elevator pitch

> **LocalPilot**, yerel işletmeyi 5 dakikalık onboarding ile AI'a öğretir; sektöre özel panel, mini site ve kampanyalar üretir; operasyonu güvenli tablolarda toplar; Karar Merkezi ve sektör otomasyonlarıyla “ne yapmalıyım?” sorusuna tek tıkla cevap verir.

---

*Bu belge tek dosyalık proje sunumudur. Güncellemeler için `docs/ROADMAP.md` ile birlikte kullanın.*