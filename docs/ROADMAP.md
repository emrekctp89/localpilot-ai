# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.0.0` → hedef `2.1.1`  
**Son güncelleme:** 7 Temmuz 2026  
**Aktif sprint:** **Faz B kapanış** (P0 — RLS, CI/E2E, gözlemlenebilirlik)

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Kararlar (güncel)

| Konu | Karar |
|------|--------|
| **Pro üyelik** | Şimdilik **manuel** — Supabase `profiles.is_pro = true` (otomatik Stripe aktivasyonu ertelendi) |
| **Canlı entegrasyonlar** | **Ertelendi** — Meta/Google credential kurulumu; `wa.me` + manuel Google checklist aktif |
| **Aktif faz** | **Faz B kapanış** — production güvenilirliği (RLS, CI/E2E) |
| **Sonraki faz** | Faz F — büyüme (yıllık plan, referans) |

**Manuel Pro aktivasyonu:**

```sql
UPDATE profiles
SET is_pro = true, pro_activated_at = NOW()
WHERE id = '<kullanici-uuid>';
```

Panelde görmek için sayfayı yenileyin veya Ayarlar → *Üyelik Durumunu Yenile*.

---

## Ertelenenler (bilinçli karar)

| Faz | Konu | Kod | Güncel yöntem |
|-----|------|-----|----------------|
| **A** | Pro billing otomatik | ✅ hazır | Manuel `profiles.is_pro = true` |
| **E** | WhatsApp Cloud API + Google OAuth canlı | ✅ hazır | `wa.me` derin link + manuel Google checklist |

**Faz E ileride açılınca (Render ai-service env):**

```env
WHATSAPP_ACCESS_TOKEN=        # Meta System User token
WHATSAPP_PHONE_NUMBER_ID=     # Cloud API phone number ID
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://...onrender.com/integration/google/oauth/callback
```

Değişkenler **yalnızca Render ai-service**'e girilir; Vercel frontend'e gerek yok (`NEXT_PUBLIC_AI_SERVICE_URL` yeterli).

---

## Mevcut Durum (v2.0.0)

| Alan | Durum |
|------|-------|
| Auth + onboarding | ✅ |
| Dashboard modülleri (14+ sekme) | ✅ |
| Operasyonel tablolar + RLS (`001`–`009`) | ✅ kodda + `009` Supabase'de |
| AI service | ✅ |
| Pro hunisi (UI, kota, checklist) | ✅ `is_pro` manuel |
| Entegrasyonlar (WhatsApp/Google OAuth) | ✅ kodda; **canlı credential ertelendi** |
| Platform (ekip, ajans, audit, i18n) | ✅ |
| Test / CI | ✅ smoke + integration; E2E secrets opsiyonel |

---

## Öncelik Matrisi

| Öncelik | Anlam |
|---------|-------|
| **P0** | Güven ve production güvenilirliği |
| **P1** | Ürün değeri ve tutma |
| **P2** | Büyüme |
| **P3** | Platform ölçeği |

---

## Faz A — Pro Billing (ERTELENDİ) → v2.1.0

> Kod hazır; otomatik aktivasyon şimdilik kullanılmıyor. İleride webhook + `confirm-pro-checkout` yeniden açılabilir.

- [x] Stripe SDK + Supabase aktivasyon fix'leri (kod tabanında)
- [x] Panel aktivasyon hook + hata mesajları
- [—] **Manuel mod:** Supabase üzerinden `is_pro` (sizin tercihiniz)
- [ ] Production Stripe webhook (ileride)
- [ ] E2E ödeme → Pro senaryosu (ileride)

---

## Faz B — Production Sağlamlaştırma (P0) → v2.1.1 ✅ BÜYÜK ÖLÇÜDE TAMAM

**Hedef:** Canlı ortamda güvenilir, izlenebilir, geri alınabilir sistem.  
**Süre:** 1–2 hafta

### B.1 Migration ve RLS
- [x] `007_fix_rls_recursion.sql`
- [x] `supabase/scripts/verify_schema.sql` — tek sorguda migration doğrulama
- [x] `supabase/scripts/verify_schema_remote.py` — CLI uzaktan tablo doğrulama
- [x] `008_schema_migrations.sql` — migration versiyon takibi
- [x] `supabase/scripts/rls_audit.sql` — manuel RLS audit sorguları
- [x] Migration dosya bütünlüğü testi (`rls-migrations.test.ts`)
- [x] Uzaktan tablo doğrulama (service role ile — tüm tablolar OK)
- [x] `008_schema_migrations.sql` Supabase'de uygulandı (8 migration kaydı)
- [x] `verify_schema_remote.py` — tablolar + `profiles` kolonları OK
- [x] `verify_schema.sql` SQL Editor'de çalıştırıldı
- [x] `rls_audit.sql` SQL Editor'de çalıştırıldı
- [ ] Manuel RLS audit: iki test kullanıcısı ile çapraz erişim (checklist §5)

### B.2 CI/CD ve E2E
- [x] AI service unit test suite CI'da
- [x] Production smoke workflow (6 saatte bir)
- [x] E2E job'ları secrets yoksa graceful skip
- [x] `verify-schema.yml` workflow (SUPABASE secrets ile opt-in)
- [ ] GitHub Secrets: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_TEST_HAS_BUSINESS`
- [ ] `E2E_PUBLIC_BUSINESS_ID` (mini site lead testi)
- [ ] ~~Stripe E2E~~ (Faz A ertelendi)

### B.3 Gözlemlenebilirlik
- [x] `/health` + structured log
- [x] Frontend error boundary
- [ ] Sentry veya merkezi log entegrasyonu
- [ ] ~~Pro aktivasyon metrikleri~~ (Faz A ertelendi)

**Başarı kriteri:** `verify_schema.sql` yeşil + RLS manuel test geçti + CI yeşil.

---

## Faz C — Veri Mimarisi Kapanışı (P1) → v2.2.0 ✅ BÜYÜK ÖLÇÜDE TAMAM

**Hedef:** JSON legacy kaldırılsın; tek yazma yolu tablolar.  
**Süre:** 2–3 hafta

- [x] Kampanya, içerik, CRM tablolara taşındı
- [x] `legacy-config.ts` — `NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ` feature flag
- [x] Tüm repository'lerde dual-read gate (plan-legacy, campaigns, content-items, operasyonel)
- [x] `legacy-dual-read.test.ts` integration testi
- [x] `seed_dev.sql` şablonu
- [x] Production'da flag aç + Vercel redeploy — panel tablolardan okuyor
- [ ] Rollback script'leri (opsiyonel)
- [x] Migration versiyon takibi (`008_schema_migrations.sql`)

---

## Faz D — Ürün Derinliği (P1) → v2.2.x ✅ TAMAM (kod)

- [x] Karar Merkezi v2, sektör pack v2, mini site SEO
- [x] Sektör otomasyon tetikleyicileri — panel "Uygula" + webhook + günlük cron
- [x] Karar Merkezi → WhatsApp / Google tek tık aksiyon
- [x] Ana akış smoke testi — `main-flows.test.ts` + smoke güncellemesi
- [ ] Canlı panelde checklist §6 manuel doğrulama (sizin tarafınızda)

---

## Faz E — AI ve Entegrasyonlar (ERTELENDİ — CANLI) → v2.3.0

> Kod ve migration hazır. Meta/Google credential kurulumu ve canlı doğrulama ertelendi.  
> Güncel yöntem: `wa.me` derin link + manuel Google checklist + AI öneri kopyalama.

- [x] Bağlamlı prompt'lar, AI cache, keep-warm
- [x] WhatsApp Business Cloud API gönderim endpoint'i + İçerik sekmesi UI
- [x] Google Business Profile OAuth + açıklama alanına yazma
- [x] AI kalite geri bildirimi (`ai_quality_feedback` + panel 👍/👎)
- [x] `009_business_integrations.sql` Supabase'de uygulandı
- [—] **Yedek kanal:** `wa.me` derin link + şablon hazırlığı (aktif)
- [ ] Render env: `WHATSAPP_*`, `GOOGLE_OAUTH_*` (ileride)
- [ ] Canlı panelde Cloud API ve Google OAuth manuel doğrulama (ileride)

---

## Faz F — Büyüme (P2)

- [x] Free tier limit, upgrade CTA, aktivasyon checklist, pazarlama sitesi
- [ ] Yıllık plan / Stripe Price ID
- [ ] Referans veya ajans komisyon modeli

---

## Faz G — Platform Ölçeği (P3)

- [x] v2.0: ekip, ajans, audit, API, i18n
- [ ] Çoklu işletme faturalandırma
- [ ] White-label mini site (özel domain)

---

## Sürüm Planı

| Sürüm | Odak | Durum |
|-------|------|-------|
| **2.0.0** | Platform + Pro hunisi | ✅ |
| **2.1.0** | Pro billing (ertelendi — manuel) | ⏸️ |
| **2.1.1** | Production sertleştirme (Faz B) | ✅ büyük ölçüde |
| **2.2.0** | Veri migrasyonu kapanışı (Faz C) | ✅ büyük ölçüde |
| **2.3.0** | Canlı entegrasyonlar (Faz E) | ⏸️ ertelendi — kod hazır |

---

## Bu Sprint — Faz B kapanış

1. [ ] İki test hesabı ile RLS çapraz erişim testi (checklist §5)
2. [ ] GitHub Secrets: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_TEST_HAS_BUSINESS`
3. [ ] `E2E_PUBLIC_BUSINESS_ID` (mini site lead testi)
4. [ ] `NEXT_PUBLIC_ERROR_REPORT_URL` veya Sentry DSN (opsiyonel gözlemlenebilirlik)

### Faz D kapanış (sizin tarafınızda)

1. [x] Sektör otomasyon + Karar Merkezi tek tık (kod)
2. [x] CI smoke: `main-flows.test.ts`
3. [ ] Canlı panelde checklist §6 manuel akış testi

### Arka planda (ertelenen / opsiyonel)

- [ ] Faz E: Render env + canlı WhatsApp/Google testi
- [ ] Faz A: Production Stripe webhook + E2E ödeme
- [ ] `seed_dev.sql` / rollback script'leri

---

## Tamamlanan Fazlar (arşiv)

<details>
<summary>v0.9.x → v2.0.0</summary>

Onboarding, operasyon modülleri, Karar Merkezi, Business OS, repository katmanı, AI güvenlik, deploy, platform (ekip/ajans/audit/API/i18n), Pro hunisi, pazarlama sitesi.

</details>

---

## Nasıl kullanılır?

1. Şu an **Faz B kapanış** maddelerini takip edin; canlı panelde checklist §6 manuel testini tamamlayın.
2. Pro ve canlı entegrasyonlar ertelendi — manuel `is_pro` + `wa.me` yeterli.
3. Tamamlanan maddeleri `[x]` ile işaretleyin.
4. Migration değişikliklerinde `supabase/migrations/` + `verify_schema.sql`.