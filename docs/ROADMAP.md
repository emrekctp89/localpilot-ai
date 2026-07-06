# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `1.0.0-rc.1`  
**Son güncelleme:** Temmuz 2026  
**Durum:** Production (Vercel + Render + Supabase)

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Mevcut Durum Özeti

### Canlı ve çalışan

| Alan | Durum |
|------|-------|
| Auth + onboarding | Supabase Auth, taslak kayıt, inline validasyon |
| Dashboard modülleri | Vitrin, Karar Merkezi, İş Akışı, İçerik, CRM, Randevu, Sipariş, Görevler, Finans, Menü, Google Profil, AI Araçları, Ayarlar |
| Operasyonel tablolar | `appointments`, `orders`, `staff_tasks`, `decision_cycles`, `google_checklists`, `sector_workflow_items` |
| Repository katmanı | Dual-read (JSON → tablo migrasyonu) |
| AI service | Gemini, Stripe checkout, auth + rate limit + CORS |
| Mini site | `/site/[id]`, tema, lead form → CRM |
| Test altyapısı | Smoke, integration, E2E (auth-guard), CI workflow |
| Deploy | Vercel (frontend), Render (AI service), `fra1` |

### Bilinen boşluklar

| Alan | Durum |
|------|-------|
| `sosyal_medya` sekmesi | `TabMenu`'de tanımlı ama render edilmiyor |
| Kampanyalar | Tabloya taşındı; dual-read aktif |
| İçerik geçmişi | `content_items` tablosu; dual-read aktif |
| CRM churn / bazı metadata | `crm_activities` tablosu; dual-read aktif |
| Sektör paketleri | 5 pack var; sektöre özel otomasyon ve metrikler sınırlı |
| Stripe webhook | Endpoint hazır; production doğrulaması gerekli |
| RLS politikaları | Operasyonel tablolar için migration sonrası audit gerekli |
| E2E kapsamı | CI'da yalnızca `auth-guard`; tam paket env gerektiriyor |
| Observability | Merkezi log / hata izleme yok |

---

## Öncelik Matrisi

| Öncelik | Anlam |
|---------|-------|
| **P0** | Production güvenilirliği — hemen |
| **P1** | Çekirdek ürün değeri — 2–4 hafta |
| **P2** | Büyüme ve farklılaşma — 1–2 ay |
| **P3** | Uzun vadeli platform |

---

## Faz 1 — Production Sağlamlaştırma (P0)

**Hedef:** Canlı ortamda güvenilir, izlenebilir, geri alınabilir sistem.  
**Süre:** 1–2 hafta

### 1.1 Ödeme ve plan akışı
- [x] Stripe webhook handler (idempotent, 500 retry, structured log)
- [x] Checkout → `profiles.is_pro` güncelleme akışı
- [x] Pro guard middleware (production AI endpoint'leri)
- [x] Ödeme success/cancel UI + Pro aktivasyon polling
- [ ] Stripe Dashboard webhook kaydı (production manuel doğrulama)

**Başarı kriteri:** Test kartıyla Pro'ya geçiş, webhook sonrası panelde plan güncellenmesi.

### 1.2 Güvenlik ve veri erişimi
- [x] Operasyonel tablo RLS (`001_operational_tables.sql`)
- [x] Core tablo RLS (`002_core_rls.sql` — Supabase'de çalıştır)
- [ ] `002_core_rls.sql` migration'ını Supabase SQL Editor'de uygula
- [x] `SUPABASE_SERVICE_ROLE_KEY` yalnızca AI service'te
- [ ] CORS: Vercel preview + production origin'lerinin doğrulanması
- [ ] Rate limit eşiklerini production trafiğine göre ayarla

**Başarı kriteri:** Başka kullanıcının verisine erişim mümkün değil (manuel + otomatik test).

### 1.3 Gözlemlenebilirlik
- [x] `/health` degraded mode + config checks (gemini, supabase, stripe)
- [x] Webhook structured error logging
- [ ] Render uptime izleme (harici ping)
- [ ] Frontend error boundary + opsiyonel Sentry

**Başarı kriteri:** Bir AI hatası 5 dk içinde tespit edilebilir.

### 1.4 CI/CD genişletme
- [x] CI: tüm `ai-service/tests/test_*.py` suite
- [x] E2E: authenticated + public site jobs (GitHub Secrets ile)
- [x] Production smoke workflow (`smoke-production.yml`, 6 saatte bir)
- [ ] GitHub Secrets ekle: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_TEST_HAS_BUSINESS`

**Başarı kriteri:** `main` push'ta yeşil pipeline; kırık deploy önlenir.

---

## Faz 2 — Veri Mimarisi Tamamlama (P0 → P1)

**Hedef:** Operasyonel veri ilişkisel tablolarda; JSON yalnızca AI çıktıları ve eski uyumluluk için.  
**Süre:** 2–3 hafta

### 2.1 Yeni tablolar
- [x] `campaigns` tablosu + repository (`003_campaigns_content.sql`, `useCampaigns.ts`)
- [x] `content_items` tablosu + repository (`IcerikTab.tsx`)
- [x] `003_campaigns_content.sql` migration'ını Supabase'de çalıştır
- [x] `crm_activities` — takip tarihi + durum geçmişi (`CrmTab`, `004_crm_activities.sql`)
- [x] `004_crm_activities.sql` migration'ını Supabase'de çalıştır

### 2.2 Legacy temizliği
- [x] Tablo kaydı sonrası JSON alanlarını temizle (`stripLegacyMiniSiteField`)
- [x] Dashboard açılışında toplu legacy temizlik (`stripMigratedOperationalFields`)
- [ ] Dual-read fallback'i kaldır (tüm migration'lar production'da doğrulandıktan sonra)
- [x] `docs/database/architecture.mmd` diyagramını güncelle

### 2.3 Veri tutarlılığı
- [x] Repository katmanında tek yazma yolu (dual-write kaldır)
- [x] Supabase migration dosyalarını `supabase/migrations/` altında versiyonla
- [ ] Seed / rollback script'leri

**Başarı kriteri:** Yeni randevu/sipariş/görev yalnızca tablolara yazılır; JSON'da operasyonel veri kalmaz.

---

## Faz 3 — Ürün Derinliği (P1)

**Hedef:** Sektör paketleri ve karar motoru gerçek iş değeri üretsin.  
**Süre:** 3–4 hafta

### 3.1 Karar Merkezi güçlendirme
- [x] Sinyal kaynaklarını genişlet (finans trendi, CRM churn, boş randevu slotları)
- [x] Öneri → görev → sonuç döngüsünde dashboard özeti
- [x] Öğrenme geçmişini UI'da göster (confidence + evidence count)
- [x] Onay politikalarını mesaj / kampanya / finans için ayrı UX

**Dosyalar:** `lib/business-os.ts`, `KararMerkeziTab.tsx`, `decision-cycles.ts`

### 3.2 Sektör paketleri v2
- [x] Her pack için özel metrik kartları (`SektorIsAkisiTab.tsx`)
- [x] Sektöre özel otomasyon kuralları (ör. salon → randevu hatırlatma)
- [x] Onboarding'de sektör seçimini pack eşlemesine bağla
- [x] Yeni pack adayları: restoran, klinik, emlak

**Dosyalar:** `lib/sector-packs.ts`, `SektorIsAkisiTab.tsx`, `OnboardingWizard.tsx`

### 3.3 Mini site ve lead akışı
- [ ] Lead form başarı → CRM bildirimi (toast / e-posta hazırlığı)
- [ ] Mini site SEO: meta, OG image, structured data
- [ ] WhatsApp tıkla-yaz derin linki
- [ ] Yayın / taslak durumu netleştirme

**Dosyalar:** `app/site/[id]/`, `LeadForm.tsx`, `AyarlarTab.tsx`

### 3.4 Eksik modül kararı
- [x] `sosyal_medya` sekmesini ya implement et ya da `TabMenu`'den kaldır
- [x] İçerik sekmesi ile sosyal medya planlamasını birleştir veya ayır (İçerik sekmesinde birleşik)

---

## Faz 4 — AI ve Entegrasyonlar (P1 → P2)

**Hedef:** AI çıktıları işletme bağlamına daha iyi otursun.  
**Süre:** 2–3 hafta

### 4.1 AI kalitesi
- [ ] Prompt'ları sektör + işletme profiline göre zenginleştir (`ai-service/main.py`)
- [ ] Kampanya regenerate / varyant üretimi
- [ ] Finans tahmini için daha fazla geçmiş veri (min. 3 ay)
- [ ] Review analizi → aksiyon önerisi → Karar Merkezi köprüsü

### 4.2 Harici entegrasyonlar
- [ ] Google Business Profile API (checklist → canlı profil önerileri)
- [ ] WhatsApp Business API araştırması (şablon gönderimi)
- [ ] Takvim sync (Google Calendar) — randevu modülü

### 4.3 Performans
- [ ] Render cold start azaltma (paid plan veya keep-warm cron)
- [ ] AI yanıt cache (benzer istekler)
- [ ] Frontend: dashboard veri yükleme paralelleştirme

---

## Faz 5 — Büyüme ve Monetizasyon (P2)

**Hedef:** Pro dönüşümü ve kullanıcı tutma.  
**Süre:** 2–3 hafta

### 5.1 Pro hunisi
- [ ] Free kullanıcı için AI kullanım limiti (günlük / aylık)
- [ ] Pro özelliklerini panelde net göster (upgrade CTA)
- [ ] Checkout sonrası onboarding checklist (ilk 7 gün)

### 5.2 Aktivasyon metrikleri
- [ ] Onboarding tamamlama oranı
- [ ] İlk randevu / ilk müşteri / ilk AI kampanya süreleri
- [ ] Karar Merkezi ilk onay süresi

### 5.3 Pazarlama site
- [ ] Landing page (`/`) ürün değer önerisi
- [ ] Sektör bazlı demo / screenshot
- [ ] Fiyatlandırma sayfası

---

## Faz 6 — Platform ve Ölçek (P3)

**Hedef:** Ajans ve çoklu işletme desteği.

- [ ] Ekip rolleri (owner, staff, read-only)
- [ ] Ajans modu: çoklu işletme yönetimi (`profiles.role = agency`)
- [ ] Audit log (kim neyi değiştirdi)
- [ ] Public API / webhook'lar (üçüncü parti entegrasyon)
- [ ] Çoklu dil (TR → EN)

---

## Sürüm Planı

| Sürüm | Odak | Tahmini |
|-------|------|---------|
| **1.0.0** | Faz 1 tamamlandı → stable release etiketi | +2 hafta |
| **1.1.0** | Faz 2 veri migrasyonu | +4 hafta |
| **1.2.0** | Faz 3 karar + sektör v2 | +8 hafta |
| **1.3.0** | Faz 4 AI + entegrasyonlar | +12 hafta |
| **2.0.0** | Faz 6 platform | +6 ay |

---

## Hızlı Kazanımlar (bu hafta)

1. Stripe webhook production testi
2. Vercel + Render env'lerinin dokümantasyonu (`deploy/production.env.template` güncelle)
3. ~~`sosyal_medya` sekmesi kararı~~ → İçerik sekmesinde birleşik
4. Health + ana akış manuel test checklist'i

---

## Tamamlanan Fazlar (arşiv)

<details>
<summary>v0.9.x → v1.0.0-rc.1 (tıkla)</summary>

### v0.9.9
- Google Business Profile checklist
- Onboarding validasyonu
- Pro billing ve ayarlar

### v0.9.0
- Randevu, sipariş, görev modülleri
- Operasyon özeti

### v0.3.0 – v0.2.0
- Onboarding draft, içerik geçmişi, CRM takibi
- Dashboard modülerleştirme, smoke testler

### v1.0.0-rc.1
- Karar Merkezi + Business OS motoru
- Sektör iş akışı pack'leri (5 sektör)
- Repository katmanı + operasyonel tablolar
- AI service güvenlik (auth, rate limit, CORS)
- Playwright E2E + CI
- Production deploy (Vercel + Render)

</details>

---

## Nasıl kullanılır?

1. Her sprint başında bu dosyadan **bir faz + 2–3 madde** seçin.
2. Tamamlanan maddeleri `[x]` ile işaretleyin.
3. Büyük değişiklikler için `docs/CHANGELOG.md` güncelleyin.
4. Veri modeli değişikliklerinde önce `supabase/migrations/` + `architecture.mmd`.