# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.1.1` (production)  
**Son güncelleme:** 8 Temmuz 2026  
**Aktif sprint:** **Faz F** — büyüme (yıllık plan, referans)

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Kararlar (güncel)

| Konu | Karar |
|------|--------|
| **Pro üyelik** | Şimdilik **manuel** — Supabase `profiles.is_pro = true` (otomatik Stripe aktivasyonu ertelendi) |
| **Canlı entegrasyonlar** | **Ertelendi** — Meta/Google credential; `wa.me` + manuel Google checklist aktif |
| **RLS manuel test** | **Sonraya** — `rls_audit.sql` + kod OK; iki hesaplı panel testi ertelendi |
| **Aktif faz** | **Faz F** — büyüme |
| **Production URL'ler** | Render `localpilot-ai-1eea` · Vercel `localpilot-ai-1b2h-phi` |

**Manuel Pro aktivasyonu:**

```sql
UPDATE profiles
SET is_pro = true, pro_activated_at = NOW()
WHERE id = '<kullanici-uuid>';
```

Panelde görmek için sayfayı yenileyin veya Ayarlar → *Üyelik Durumunu Yenile*.

**Production ortam özeti:**

| Servis | URL / değişken |
|--------|----------------|
| Frontend | `https://localpilot-ai-1b2h-phi.vercel.app` |
| AI Service | `https://localpilot-ai-1eea.onrender.com` |
| GitHub `AI_SERVICE_URL` | Render kök URL (boşluk/tırnak yok) |
| GitHub `FRONTEND_URL` | Vercel production domain |
| Vercel `NEXT_PUBLIC_AI_SERVICE_URL` | Render kök URL |

---

## Ertelenenler (bilinçli karar)

| Faz / Konu | Kod | Güncel yöntem |
|------------|-----|----------------|
| **A** — Pro billing otomatik | ✅ hazır | Manuel `profiles.is_pro = true` |
| **E** — WhatsApp + Google OAuth canlı | ✅ hazır | `wa.me` + manuel Google checklist |
| **B.1** — İki hesaplı RLS panel testi | ✅ SQL audit OK | Sonraya — checklist §5 |

**Faz E ileride açılınca (Render ai-service env):**

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://localpilot-ai-1eea.onrender.com/integration/google/oauth/callback
```

Değişkenler **yalnızca Render ai-service**'e girilir.

**RLS testi sonraya bırakılınca:** `auth.users` + `profiles` tam silinmeli; test için `+alias` e-posta kullanılabilir.

---

## Mevcut Durum (v2.1.1)

| Alan | Durum |
|------|-------|
| Auth + onboarding | ✅ |
| Dashboard modülleri (14+ sekme) | ✅ |
| Operasyonel tablolar + RLS (`001`–`009`) | ✅ Supabase'de |
| AI service (Render deploy + `/health`) | ✅ |
| Pro hunisi (UI, kota, checklist) | ✅ `is_pro` manuel |
| Entegrasyonlar (WhatsApp/Google OAuth) | ✅ kodda; canlı credential ertelendi |
| Platform (ekip, ajans, audit, i18n) | ✅ |
| Production monitoring | ✅ keep-warm + smoke + CORS |
| Checklist §6 canlı akışlar | ✅ randevu, sipariş, CRM, AI, lead, karar (8 Tem) |
| Test / CI | ✅ smoke + integration; E2E secrets opsiyonel |
| RLS çapraz erişim (manuel) | ⏸️ sonraya |

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

> Kod hazır; otomatik aktivasyon şimdilik kullanılmıyor.

- [x] Stripe SDK + Supabase aktivasyon fix'leri
- [x] Panel aktivasyon hook + hata mesajları
- [—] **Manuel mod:** `profiles.is_pro`
- [ ] Production Stripe webhook (ileride)
- [ ] E2E ödeme → Pro senaryosu (ileride)

---

## Faz B — Production Sağlamlaştırma (P0) → v2.1.1 ✅ TAMAM (manuel RLS hariç)

**Hedef:** Canlı ortamda güvenilir, izlenebilir sistem.

### B.1 Migration ve RLS
- [x] `001`–`009` Supabase'de (`009_business_integrations.sql` dahil)
- [x] `verify_schema.sql` / `verify_schema_remote.py` / `rls_audit.sql`
- [x] `008_schema_migrations.sql` — migration takibi
- [x] `rls-migrations.test.ts` + `007_fix_rls_recursion.sql`
- [—] **Manuel RLS audit (iki hesap)** — sonraya (checklist §5)

### B.2 CI/CD ve E2E
- [x] AI service unit test CI
- [x] Production smoke (6 saatte bir) — yeşil
- [x] Keep-warm (10 dk) — yeşil
- [x] GitHub Variables: `PRODUCTION_MONITORING_ENABLED`, `AI_SERVICE_URL`, `FRONTEND_URL`
- [x] Workflow URL normalizasyonu + CORS düzeltmesi
- [x] E2E graceful skip (secrets yoksa)
- [x] `verify-schema.yml` (opt-in)
- [ ] GitHub E2E secrets (opsiyonel)
- [ ] ~~Stripe E2E~~ (Faz A ertelendi)

### B.3 Gözlemlenebilirlik
- [x] `/health` + Docker image fix (Faz E modülleri)
- [x] Frontend error boundary
- [ ] `NEXT_PUBLIC_ERROR_REPORT_URL` / Sentry (opsiyonel)

---

## Faz C — Veri Mimarisi Kapanışı (P1) → v2.2.0 ✅ TAMAM

- [x] Tablo migrasyonu + `NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ=true` (Vercel)
- [x] `legacy-dual-read.test.ts`
- [ ] Rollback script'leri (opsiyonel)

---

## Faz D — Ürün Derinliği (P1) → v2.2.x ✅ TAMAM

- [x] Karar Merkezi v2, sektör otomasyon, tek tık aksiyon
- [x] `main-flows.test.ts`
- [x] **Checklist §6 canlı doğrulama** — tamamlandı (8 Temmuz 2026)
- [x] Sipariş sekmesi: «Teslim Edildi» filtresi yalnızca `teslim_edildi` durumunu gösterir (§6 geri bildirimi)

---

## Faz E — AI ve Entegrasyonlar (ERTELENDİ — CANLI) → v2.3.0

> Kod + `009` migration hazır. Meta/Google env ertelendi.

- [x] WhatsApp Cloud API endpoint + İçerik UI
- [x] Google OAuth + profil yazma
- [x] AI kalite geri bildirimi
- [x] `009_business_integrations.sql` uygulandı
- [—] `wa.me` yedek kanal aktif
- [ ] Render env + canlı doğrulama (ileride)

---

## Faz F — Büyüme (P2) ← AKTİF

- [x] Free tier, upgrade CTA, aktivasyon checklist, pazarlama sitesi
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
| **2.1.0** | Pro billing | ⏸️ manuel |
| **2.1.1** | Production sertleştirme + §6 canlı | ✅ |
| **2.2.0** | Veri migrasyonu (Faz C) | ✅ |
| **2.2.x** | Ürün derinliği (Faz D) | ✅ |
| **2.3.0** | Canlı entegrasyonlar (Faz E) | ⏸️ |
| **2.4.x** | Büyüme (Faz F) | Planlı |

---

## Bu Sprint — Faz F

1. [ ] Yıllık plan tasarımı (fiyatlandırma sayfası + Stripe Price ID)
2. [ ] Referans / ajans komisyon modeli taslağı

### Sonraya (opsiyonel)

- [ ] İki hesaplı RLS panel testi (checklist §5)
- [ ] GitHub E2E secrets
- [ ] Faz E: Meta/Google env + canlı test
- [ ] Faz A: Stripe webhook
- [ ] Sentry / merkezi log

### Tamamlanan (Temmuz 2026)

- [x] Render deploy + `/health` + Dockerfile fix
- [x] GitHub/Vercel/Render URL hizalama
- [x] Production smoke + keep-warm yeşil
- [x] Checklist §6 canlı doğrulama (8 Tem): randevu, sipariş, CRM, AI kampanya, mini site lead, Karar Merkezi
- [x] CRM takip tarihi blur-kaydet fix (`707fa55`)
- [x] Sipariş «Teslim Edildi» filtre etiketi + boş durum açıklaması (§6)

---

## Tamamlanan Fazlar (arşiv)

<details>
<summary>v0.9.x → v2.0.0</summary>

Onboarding, operasyon modülleri, Karar Merkezi, Business OS, repository katmanı, AI güvenlik, deploy, platform (ekip/ajans/audit/API/i18n), Pro hunisi, pazarlama sitesi.

</details>

---

## Nasıl kullanılır?

1. Şu an **Faz F** (büyüme) maddelerini takip edin.
2. Pro ve canlı entegrasyonlar ertelendi — manuel `is_pro` + `wa.me` yeterli.
3. RLS iki-hesap testi isteğe bağlı — `docs/production-checklist.md` §5.
4. Migration değişikliklerinde `supabase/migrations/` + `verify_schema.sql`.