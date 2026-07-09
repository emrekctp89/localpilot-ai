# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.4.0` (Faz F — büyüme)  
**Son güncelleme:** 8 Temmuz 2026  
**Aktif sprint:** **Faz G** — platform ölçeği (Faz F opsiyonel kapanış maddeleri sürüyor)

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Kararlar (güncel)

| Konu | Karar |
|------|--------|
| **Pro üyelik** | Şimdilik **manuel** mümkün; aylık/yıllık checkout kodda hazır (Stripe Price ID ertelendi) |
| **Canlı entegrasyonlar** | **Ertelendi** — Meta/Google credential; `wa.me` + manuel Google checklist aktif |
| **RLS manuel test** | **Sonraya** — `rls_audit.sql` + kod OK; iki hesaplı panel testi ertelendi |
| **Partner komisyonu** | Ajans %20 · Referans %10 · **İndirim yok** (komisyon partner'e) · Panelden onay |
| **Stripe Price ID** | **Ertelendi** — Stripe bakım; fallback `price_data` checkout çalışır |
| **Aktif faz** | **Faz G** (Faz F kod tamamlandı) |
| **Production URL'ler** | Render `localpilot-ai-1eea` · Vercel `localpilot-ai-1b2h-phi` |

**Manuel Pro aktivasyonu:**

```sql
UPDATE profiles
SET is_pro = true, pro_activated_at = NOW()
WHERE id = '<kullanici-uuid>';
```

**Komisyon admin (panel onayı):**

```sql
-- 011_commission_admin.sql uygulandıktan sonra
UPDATE profiles
SET commission_admin = true
WHERE id = '<admin-uuid>';
```

Platform → **Komisyon Yönetimi** → Onayla / Ödendi / İptal.

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
| **A** — Pro billing otomatik | ✅ hazır | Manuel `profiles.is_pro` veya Stripe checkout |
| **E** — WhatsApp + Google OAuth canlı | ✅ hazır | `wa.me` + manuel Google checklist |
| **B.1** — İki hesaplı RLS panel testi | ✅ SQL audit OK | Sonraya — checklist §5 |
| **F** — Stripe Price ID | ✅ checkout hazır | Render env Stripe bakım sonrası |

**Faz E ileride açılınca (Render ai-service env):**

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://localpilot-ai-1eea.onrender.com/integration/google/oauth/callback
```

**Partner program migrations (Supabase SQL Editor sırasıyla):**

- `010_partner_program.sql` — partner_profiles, referral_attributions, commission_ledger
- `011_commission_admin.sql` — `profiles.commission_admin`, admin RLS

Referans linki: `/auth?ref=LP-XXXXXX`

---

## Mevcut Durum (v2.4.0)

| Alan | Durum |
|------|-------|
| Auth + onboarding | ✅ |
| Dashboard sekmeleri (dinamik) | ✅ `getVisibleTabs` — iş modeli + onboarding |
| Operasyonel tablolar + RLS (`001`–`009`) | ✅ Supabase'de |
| Partner program (`010`–`011`) | ✅ kodda; Supabase'de uygulanmalı |
| AI service (Render deploy + `/health`) | ✅ |
| Pro hunisi (UI, kota, aylık/yıllık checkout) | ✅ Stripe Price ID opsiyonel |
| Entegrasyonlar (WhatsApp/Google OAuth) | ✅ kodda; canlı credential ertelendi |
| Platform (ekip, ajans, audit, API, i18n) | ✅ |
| Partner + komisyon admin paneli | ✅ canlı test (pending → panel onayı) |
| Production monitoring | ✅ keep-warm + smoke + CORS |
| Checklist §6 canlı akışlar | ✅ (8 Tem) |
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

## Faz A — Pro Billing (ERTELENDİ — OTOMATİK) → v2.1.0

> Checkout + webhook kodda; otomatik aktivasyon production'da isteğe bağlı.

- [x] Stripe SDK + Supabase aktivasyon fix'leri
- [x] Panel aktivasyon hook + hata mesajları
- [x] Aylık / yıllık checkout (`stripe_pricing.py`)
- [—] **Manuel mod:** `profiles.is_pro` (hâlâ geçerli)
- [ ] `STRIPE_PRICE_ID_MONTHLY` / `YEARLY` Render env (Stripe bakım sonrası)
- [ ] Production Stripe webhook (ileride)
- [ ] E2E ödeme → Pro senaryosu (ileride)

---

## Faz B — Production Sağlamlaştırma (P0) → v2.1.1 ✅ TAMAM (manuel RLS hariç)

**Hedef:** Canlı ortamda güvenilir, izlenebilir sistem.

### B.1 Migration ve RLS
- [x] `001`–`009` Supabase'de
- [x] `verify_schema.sql` / `verify_schema_remote.py` / `rls_audit.sql`
- [x] `008_schema_migrations.sql` — migration takibi
- [x] `rls-migrations.test.ts` + `007_fix_rls_recursion.sql`
- [—] **Manuel RLS audit (iki hesap)** — sonraya (checklist §5)

### B.2 CI/CD ve E2E
- [x] AI service unit test CI
- [x] Production smoke (6 saatte bir) — yeşil
- [x] Keep-warm (10 dk) — yeşil
- [x] GitHub Variables + URL normalizasyonu + CORS
- [x] E2E graceful skip (secrets yoksa)
- [ ] GitHub E2E secrets (opsiyonel)

### B.3 Gözlemlenebilirlik
- [x] `/health` + Docker image fix
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
- [x] Checklist §6 canlı doğrulama (8 Temmuz 2026)
- [x] Sipariş «Teslim Edildi» filtresi (`teslim_edildi` only)
- [x] Dinamik dashboard sekmeleri (`dashboard-utils.ts`)

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

## Faz F — Büyüme (P2) → v2.4.0 ✅ TAMAM (ops maddeleri açık)

- [x] Free tier, upgrade CTA, aktivasyon checklist, pazarlama sitesi
- [x] Aylık (₺299) / yıllık (₺2.990) plan UI + checkout
- [x] Referans / ajans komisyon modeli (`010_partner_program.sql`)
- [x] Referans linki (`?ref=LP-…`) + attribution + Pro aktivasyon komisyonu
- [x] Panelden komisyon onayı (`011` + `commission_admin`)
- [ ] `010` / `011` migration tüm ortamlarda doğrulandı mı? (checklist)
- [ ] Referanslı kullanıcıya indirim (opsiyonel — şu an yok)
- [ ] Manuel `is_pro` SQL → komisyon tetikleme (opsiyonel)

---

## Faz G — Platform Ölçeği (P3) ← AKTİF

- [x] v2.0: ekip, ajans, audit, API, i18n
- [ ] Çoklu işletme faturalandırma
- [ ] White-label mini site (özel domain)

---

## Sürüm Planı

| Sürüm | Odak | Durum |
|-------|------|-------|
| **2.0.0** | Platform + Pro hunisi | ✅ |
| **2.1.0** | Pro billing | ⏸️ manuel / checkout hazır |
| **2.1.1** | Production sertleştirme + §6 canlı | ✅ |
| **2.2.0** | Veri migrasyonu (Faz C) | ✅ |
| **2.2.x** | Ürün derinliği + dinamik sekmeler (Faz D) | ✅ |
| **2.3.0** | Canlı entegrasyonlar (Faz E) | ⏸️ |
| **2.4.0** | Büyüme: plan + partner program (Faz F) | ✅ |
| **2.5.x** | Platform ölçeği (Faz G) | Planlı |

---

## Bu Sprint — Faz G

1. [ ] Çoklu işletme faturalandırma taslağı
2. [ ] White-label mini site (özel domain) araştırması

### Faz F kapanış (opsiyonel)

- [ ] `STRIPE_PRICE_ID_MONTHLY` / `YEARLY` Render env
- [ ] `010` + `011` migration production doğrulama
- [ ] Referanslı kullanıcı indirim kuponu (Stripe)

### Sonraya (opsiyonel)

- [ ] İki hesaplı RLS panel testi (checklist §5)
- [ ] GitHub E2E secrets
- [ ] Faz E: Meta/Google env + canlı test
- [ ] Faz A: Stripe webhook tam otomasyon
- [ ] Sentry / merkezi log

### Tamamlanan (Temmuz 2026)

- [x] Render deploy + `/health` + Dockerfile fix
- [x] GitHub/Vercel/Render URL hizalama + production smoke yeşil
- [x] Checklist §6 canlı doğrulama
- [x] CRM blur-kaydet · Sipariş Teslim Edildi filtresi
- [x] Pro aylık/yıllık abonelik UI + checkout
- [x] Dinamik dashboard sekmeleri (`getVisibleTabs`)
- [x] Partner programı: referans linki, ajans %20 / referans %10
- [x] Komisyon defteri + panelden onay (`CommissionAdminPanel`)
- [x] Ayarlar mini site controlled input fix

---

## Tamamlanan Fazlar (arşiv)

<details>
<summary>v0.9.x → v2.0.0</summary>

Onboarding, operasyon modülleri, Karar Merkezi, Business OS, repository katmanı, AI güvenlik, deploy, platform (ekip/ajans/audit/API/i18n), Pro hunisi, pazarlama sitesi.

</details>

---

## Nasıl kullanılır?

1. **Faz G** (platform ölçeği) maddelerini takip edin.
2. Partner komisyonu: referans linki paylaş → Pro ödemesi → admin panelden onay.
3. Pro: manuel `is_pro` veya Stripe checkout (Price ID opsiyonel).
4. Migration: `010` + `011` partner program için Supabase'de sırayla uygulayın.
5. RLS iki-hesap testi isteğe bağlı — `docs/production-checklist.md` §5.