# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.0.0` → hedef `2.1.1`  
**Son güncelleme:** 6 Temmuz 2026  
**Aktif sprint:** **Faz B — Production Sağlamlaştırma**

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Kararlar (güncel)

| Konu | Karar |
|------|--------|
| **Pro üyelik** | Şimdilik **manuel** — Supabase `profiles.is_pro = true` (otomatik Stripe aktivasyonu ertelendi) |
| **Aktif faz** | **Faz B** — migration doğrulama, RLS audit, CI/E2E |
| **Sonraki faz** | Faz C — veri migrasyonu kapanışı |

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

## Faz B — Production Sağlamlaştırma (P0) → v2.1.1 🔄 AKTİF

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
- [ ] `008_schema_migrations.sql` Supabase'de uygula
- [ ] `verify_schema.sql` SQL Editor'de çalıştır (RLS fonksiyonları dahil)
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

## Faz C — Veri Mimarisi Kapanışı (P1) → v2.2.0

**Hedef:** JSON legacy kaldırılsın; tek yazma yolu tablolar.  
**Süre:** 2–3 hafta

- [x] Kampanya, içerik, CRM tablolara taşındı
- [ ] Dual-read fallback kaldır
- [ ] Seed / rollback script'leri
- [ ] Migration versiyon takibi

---

## Faz D — Ürün Derinliği (P1) → v2.2.x

- [x] Karar Merkezi v2, sektör pack v2, mini site SEO
- [ ] Sektör otomasyon tetikleyicileri (cron / webhook)
- [ ] Karar Merkezi → WhatsApp / Google tek tık aksiyon

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
| **2.1.1** | Production sertleştirme (Faz B) | 🔄 |
| **2.2.0** | Veri migrasyonu kapanışı | Planlı |
| **2.3.0** | Canlı entegrasyonlar | Planlı |

---

## Bu Sprint — Faz B görevleri

1. [x] Uzaktan tablo doğrulama (`verify_schema_remote.py`) — geçti
2. [ ] Supabase SQL Editor → `008_schema_migrations.sql` uygula
3. [ ] `verify_schema.sql` + `rls_audit.sql` çalıştır
4. [ ] İki test hesabı ile RLS çapraz erişim testi (checklist §5)
5. [ ] GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (opsiyonel CI verify)
6. [ ] GitHub Secrets → E2E kimlik bilgileri (opsiyonel)

---

## Tamamlanan Fazlar (arşiv)

<details>
<summary>v0.9.x → v2.0.0</summary>

Onboarding, operasyon modülleri, Karar Merkezi, Business OS, repository katmanı, AI güvenlik, deploy, platform (ekip/ajans/audit/API/i18n), Pro hunisi, pazarlama sitesi.

</details>

---

## Nasıl kullanılır?

1. Şu an **Faz B** maddelerini takip edin.
2. Pro için Supabase'de manuel `is_pro` yeterli.
3. Tamamlanan maddeleri `[x]` ile işaretleyin.
4. Migration değişikliklerinde `supabase/migrations/` + `verify_schema.sql`.