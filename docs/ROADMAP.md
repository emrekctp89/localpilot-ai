# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.0.0` → hedef `2.1.1`  
**Son güncelleme:** 7 Temmuz 2026  
**Aktif sprint:** **Faz E — Canlı Entegrasyonlar**

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Kararlar (güncel)

| Konu | Karar |
|------|--------|
| **Pro üyelik** | Şimdilik **manuel** — Supabase `profiles.is_pro = true` (otomatik Stripe aktivasyonu ertelendi) |
| **Aktif faz** | **Faz E** — WhatsApp Business API, Google Profile API yazma |
| **Sonraki faz** | Faz F — büyüme (yıllık plan, referans) |

**Manuel Pro aktivasyonu:**

```sql
UPDATE profiles
SET is_pro = true, pro_activated_at = NOW()
WHERE id = '<kullanici-uuid>';
```

Panelde görmek için sayfayı yenileyin veya Ayarlar → *Üyelik Durumunu Yenile*.

---

## Mevcut Durum (v2.0.0)

| Alan | Durum |
|------|-------|
| Auth + onboarding | ✅ |
| Dashboard modülleri (14+ sekme) | ✅ |
| Operasyonel tablolar + RLS (`001`–`007`) | ✅ kodda; production doğrulama devam |
| AI service | ✅ |
| Pro hunisi (UI, kota, checklist) | ✅ `is_pro` manuel |
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

## Faz E — AI ve Entegrasyonlar (P1–P2) → v2.3.0

- [x] Bağlamlı prompt'lar, AI cache, keep-warm
- [ ] WhatsApp Business API canlı gönderim
- [ ] Google Business Profile API yazma
- [ ] AI kalite geri bildirimi

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
| **2.3.0** | Canlı entegrasyonlar | Planlı |

---

## Bu Sprint — Faz E görevleri

1. [ ] WhatsApp Business Cloud API canlı gönderim
2. [ ] Google Business Profile API yazma (OAuth)
3. [ ] AI kalite geri bildirimi döngüsü

### Faz D kapanış (sizin tarafınızda)

1. [x] Sektör otomasyon + Karar Merkezi tek tık (kod)
2. [x] CI smoke: `main-flows.test.ts`
3. [ ] Canlı panelde checklist §6 manuel akış testi

### Arka planda (opsiyonel)

- [ ] İki test hesabı ile RLS çapraz erişim testi (checklist §5)
- [ ] `seed_dev.sql` / rollback script'leri
- [ ] GitHub E2E secrets

---

## Tamamlanan Fazlar (arşiv)

<details>
<summary>v0.9.x → v2.0.0</summary>

Onboarding, operasyon modülleri, Karar Merkezi, Business OS, repository katmanı, AI güvenlik, deploy, platform (ekip/ajans/audit/API/i18n), Pro hunisi, pazarlama sitesi.

</details>

---

## Nasıl kullanılır?

1. Şu an **Faz E** maddelerini takip edin; canlı panelde checklist §6 manuel testini tamamlayın.
2. Pro için Supabase'de manuel `is_pro` yeterli.
3. Tamamlanan maddeleri `[x]` ile işaretleyin.
4. Migration değişikliklerinde `supabase/migrations/` + `verify_schema.sql`.