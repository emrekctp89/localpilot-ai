# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.0.0` → hedef `2.1.0`  
**Son güncelleme:** 6 Temmuz 2026  
**Durum:** Production (Vercel + Render + Supabase) — **Pro ödeme aktivasyonu sertleştirme sprinti**

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Mevcut Durum (v2.0.0)

### Canlı ve çalışan

| Alan | Durum |
|------|-------|
| Auth + onboarding | Supabase Auth, taslak kayıt, inline validasyon |
| Dashboard modülleri | 14+ sekme (CRM, randevu, karar merkezi, AI araçları, platform vb.) |
| Operasyonel tablolar + RLS | `001`–`007` migration seti |
| AI service | Gemini, Stripe checkout, auth + rate limit + CORS |
| Pro hunisi | Kota kartı, upgrade CTA, aktivasyon checklist |
| Platform | Ekip rolleri, ajans modu, audit log, i18n |
| Test / CI | Smoke, integration, production smoke workflow |

### Aktif sorun alanı: Pro ödeme aktivasyonu

Ödeme Stripe'da tamamlanıyor ancak `profiles.is_pro` otomatik güncellenmiyordu. Kök nedenler ve durum:

| Sorun | Durum |
|-------|-------|
| Stripe SDK `metadata.get()` → 500 | ✅ `stripe_utils.py` ile düzeltildi |
| Supabase `update().single()` desteklenmiyor | ✅ `maybe_single` + liste doğrulama |
| Panel `isPro` senkronu gecikmesi | ✅ `useProCheckoutActivation` + `refreshProStatus` |
| Yerelde webhook yok | ✅ `confirm-pro-checkout` + `session_id` fallback (dev) |
| Hata mesajı görünmüyor | ✅ Ayarlar'da detaylı aktivasyon hatası |

**Sizin yapmanız gereken:** AI servisini yeniden başlatın, ardından test ödemesi veya Ayarlar → *Üyelik Durumunu Yenile*.

---

## Öncelik Matrisi

| Öncelik | Anlam |
|---------|-------|
| **P0** | Gelir ve güven — hemen |
| **P1** | Ürün değeri ve tutma — 2–4 hafta |
| **P2** | Büyüme — 1–2 ay |
| **P3** | Platform ölçeği |

---

## Faz A — Pro Billing Güvenilirliği (P0) → v2.1.0

**Hedef:** Test ve production'da ödeme → `is_pro=true` → panel senkronu %100 güvenilir.  
**Süre:** 1 hafta

### A.1 Backend aktivasyon
- [x] Stripe SDK uyumlu metadata okuma (`middleware/stripe_utils.py`)
- [x] Supabase profil güncelleme (`.single()` kaldırıldı, doğrulama eklendi)
- [x] `confirm-pro-checkout` dev modda `session_id` ile JWT'siz fallback
- [x] Webhook + confirm idempotent aktivasyon (`activate_pro_membership`)
- [ ] Canlı Supabase entegrasyon testi CI'da (`RUN_STRIPE_INTEGRATION=1`)
- [ ] Production Stripe webhook endpoint kaydı ve canlı doğrulama

**Başarı kriteri:** Test kartı → 30 sn içinde panelde *LocalPilot Pro — Aktif*, `is_pro=true` (manuel müdahale yok).

### A.2 Frontend deneyim
- [x] Panel seviyesinde aktivasyon hook (`useProCheckoutActivation`)
- [x] `isPro` + AI kota UI senkronu
- [x] Aktivasyon hata mesajı kullanıcıya gösterilir
- [ ] Toast ile global başarı/hata bildirimi (Ayarlar dışında da)
- [ ] Pro durumu için Supabase realtime veya periyodik poll (opsiyonel)

### A.3 Operasyon
- [ ] `docs/production-checklist.md` §4 tamamlandı işaretle
- [ ] Render env: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET` doğrula
- [ ] Yerel geliştirme notu: `stripe listen --forward-to localhost:8000/stripe-webhook`

---

## Faz B — Production Sağlamlaştırma (P0) → v2.1.x

**Hedef:** Canlı ortamda güvenilir, izlenebilir, geri alınabilir sistem.  
**Süre:** 1–2 hafta

### B.1 Migration ve RLS
- [x] `007_fix_rls_recursion.sql` (businesses / business_members)
- [ ] Tüm migration'ların (`001`–`007`) production Supabase'de doğrulanması
- [ ] RLS audit: çapraz kullanıcı erişim testi

### B.2 CI/CD ve E2E
- [x] AI service unit test suite CI'da
- [x] Production smoke workflow (6 saatte bir)
- [ ] GitHub Secrets: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_TEST_HAS_BUSINESS`
- [ ] E2E: Stripe test ödeme → Pro aktivasyon senaryosu

### B.3 Gözlemlenebilirlik
- [x] `/health` + structured webhook log
- [x] Frontend error boundary + opsiyonel raporlama
- [ ] Merkezi log (Render + Vercel) veya Sentry entegrasyonu
- [ ] Pro aktivasyon metrikleri (başarı / hata oranı)

---

## Faz C — Veri Mimarisi Kapanışı (P1) → v2.2.0

**Hedef:** JSON legacy tamamen kaldırılsın; tek yazma yolu tablolar.  
**Süre:** 2–3 hafta

- [x] Kampanya, içerik, CRM aktiviteleri tablolara taşındı
- [ ] Dual-read fallback kaldır (production doğrulama sonrası)
- [ ] Seed / rollback script'leri
- [ ] Migration versiyon takibi (Supabase CLI veya migration history tablosu)

---

## Faz D — Ürün Derinliği (P1) → v2.2.x

**Süre:** 3–4 hafta

- [x] Karar Merkezi v2 (sinyaller, öğrenme geçmişi, onay UX)
- [x] Sektör paketleri v2 (5+ pack, metrik kartları)
- [x] Mini site SEO + lead → CRM
- [ ] Sektör otomasyonlarında gerçek zamanlı tetikleyiciler (webhook / cron)
- [ ] Karar Merkezi → WhatsApp / Google aksiyon köprüsü (tek tık gönderim)

---

## Faz E — AI ve Entegrasyonlar (P1–P2) → v2.3.0

- [x] Sektör bağlamlı prompt'lar, AI cache, keep-warm
- [x] Google profil önerileri, takvim ICS, WhatsApp şablon hazırlığı
- [ ] WhatsApp Business API canlı gönderim (onaylı şablon)
- [ ] Google Business Profile API yazma (sadece okuma/öneri değil)
- [ ] AI yanıt kalite skoru + kullanıcı geri bildirimi

---

## Faz F — Büyüme ve Monetizasyon (P2)

- [x] Free tier AI limiti, upgrade CTA, 7 günlük aktivasyon checklist
- [x] Aktivasyon metrikleri, pazarlama sitesi, fiyatlandırma
- [ ] A/B test: upgrade CTA metinleri ve konumları
- [ ] Yıllık plan / indirimli fiyatlandırma (Stripe Price ID)
- [ ] Referans programı veya ajans komisyon modeli

---

## Faz G — Platform Ölçeği (P3) — v2.0 tamamlandı, genişletme

- [x] Ekip rolleri, ajans modu, audit log, public API, i18n
- [ ] Çoklu işletme faturalandırma (işletme başına plan)
- [ ] White-label mini site (özel domain)
- [ ] Marketplace / eklenti API'si

---

## Sürüm Planı (güncel)

| Sürüm | Odak | Durum |
|-------|------|-------|
| **2.0.0** | Platform + Pro hunisi + pazarlama | ✅ Yayında |
| **2.1.0** | Pro billing güvenilirliği (Faz A) | 🔄 Bu sprint |
| **2.1.1** | Production sertleştirme (Faz B) | Planlı |
| **2.2.0** | Veri migrasyonu kapanışı (Faz C) | Planlı |
| **2.3.0** | AI + canlı entegrasyonlar (Faz E) | Planlı |

---

## Bu Hafta — Hızlı Kazanımlar

1. [x] Pro aktivasyon backend fix (Stripe SDK + Supabase update)
2. [x] Panel seviyesinde aktivasyon hook
3. [ ] AI servisi restart + test ödeme doğrulama (sizin ortamınızda)
4. [ ] Production Stripe webhook kaydı
5. [ ] `007_fix_rls_recursion.sql` production'da doğrulandı mı kontrol

---

## Tamamlanan Büyük Fazlar (arşiv)

<details>
<summary>v0.9.x → v2.0.0 (tıkla)</summary>

- v0.9.x: Onboarding, CRM, randevu, sipariş, görev modülleri
- v1.0.0-rc: Karar Merkezi, Business OS, sektör pack'leri, repository katmanı
- v1.x: Veri migrasyonu, AI kalitesi, entegrasyonlar, performans
- v2.0.0: Platform (ekip, ajans, audit, API, i18n), Pro hunisi, pazarlama sitesi

</details>

---

## Nasıl kullanılır?

1. Her sprint **bir faz + 2–3 madde** seçin (şu an: **Faz A**).
2. Tamamlanan maddeleri `[x]` ile işaretleyin.
3. Billing / güvenlik değişikliklerinde `docs/CHANGELOG.md` ve `docs/production-checklist.md` güncelleyin.
4. Veri modeli değişikliklerinde önce `supabase/migrations/` + `docs/database/architecture.mmd`.