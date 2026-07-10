# Production Doğrulama Checklist

Canlı ortamda deploy sonrası veya migration uygulamasından sonra bu listeyi çalıştırın.

## 1. Altyapı sağlığı

- [ ] `curl https://localpilot-ai-1eea.onrender.com/health` → `status: ok` veya `degraded`
- [ ] Health yanıtında `checks.gemini`, `checks.supabase`, `checks.stripe` true
- [ ] `curl https://localpilot-ai-1b2h-phi.vercel.app` → 200
- [ ] `curl https://localpilot-ai-1b2h-phi.vercel.app/fiyatlandirma` → 200

## 2. CORS

- [ ] Vercel production origin'den AI service OPTIONS preflight başarılı
- [ ] Preview deploy (`*.vercel.app`) CORS izinli (`CORS_ALLOW_VERCEL_PREVIEWS` veya wildcard)

## 3. Auth ve onboarding

- [ ] `/auth` → e-posta/şifre kayıt ve giriş
- [ ] Giriş sonrası `/dashboard` yönlendirmesi
- [ ] Yeni kullanıcı onboarding sihirbazı açılıyor
- [ ] Onboarding tamamlanınca dashboard sekmeleri yükleniyor

## 4. Pro üyelik (manuel — güncel süreç)

Otomatik Stripe aktivasyonu şimdilik kullanılmıyor. Pro vermek için Supabase SQL Editor:

```sql
UPDATE profiles
SET is_pro = true, pro_activated_at = NOW()
WHERE id = '<kullanici-uuid>';
```

- [ ] `profiles.is_pro = true` ve `pro_activated_at` dolu
- [ ] Panel yenilendiğinde Ayarlar → *LocalPilot Pro — Aktif*
- [ ] Ücretsiz kota kartı ve *Pro'ya Yükselt* kayboldu
- [ ] AI araçları sınırsız (veya dev modda açık)

**İleride (Faz A):** Stripe checkout + webhook otomasyonu yeniden açılabilir.

**Manuel Pro sonrası partner komisyonu:** Stripe yokken SQL ile Pro verdiyseniz ve kullanıcı `?ref=` ile geldiyse:

1. `014_manual_pro_commission.sql` uygulanmış olmalı  
2. Admin hesabına yetki:
```sql
UPDATE profiles SET commission_admin = true WHERE id = '<admin-uuid>';
```
3. Panel → **Platform** → Komisyon Yönetimi → referred user UUID → **Komisyon yaz**  
4. Listeden Onayla / Ödendi

- [ ] `commission_admin = true` (admin hesap)
- [ ] Manuel Pro + attribution sonrası defterde `pending` satır

## 4b. Mini site slug (Faz G)

- [x] `012`–`014` migration’lar (slug / domain / manuel komisyon)
- [ ] `015_backfill_site_slugs.sql` — mevcut işletmelere slug backfill (opsiyonel)
- [ ] Yeni onboarding sonrası Ayarlar’da `/site/{slug}` dolu

## 5. Supabase migrations ve RLS (Faz B)

Sırayla SQL Editor'de uygulayın (`supabase/migrations/`):

- [x] `001` → `008` tamamlandı (`008_schema_migrations.sql` dahil)
- [x] `supabase/scripts/verify_schema.sql` çalıştırıldı — tüm satırlar `ok = true`
- [x] `supabase/scripts/rls_audit.sql` çalıştırıldı — RLS fonksiyonları ve policy'ler OK
- [x] Yerel doğrulama: `cd ai-service && python ../supabase/scripts/verify_schema_remote.py`

**Manuel RLS audit (iki test hesabı):**

1. Kullanıcı A: işletme sahibi, en az bir müşteri/randevu kaydı
2. Kullanıcı B: A'nın işletmesine üye değil
3. B ile giriş → A'nın `customers`, `appointments`, `businesses` verisi **görünmemeli**
4. Panel RLS recursion hatası vermemeli (`infinite recursion detected`)

- [ ] Çapraz kullanıcı erişimi engelli
- [ ] İşletme sahibi kendi verisine erişebiliyor

## 5b. Legacy dual-read kapatma (Faz C)

Tablolar doluysa JSON fallback kapatılır:

- [x] `NEXT_PUBLIC_DISABLE_LEGACY_DUAL_READ=true` — `.env.local`
- [x] Aynı değişken Vercel Environment Variables (Production)
- [x] Vercel **Redeploy** yapıldı (`NEXT_PUBLIC_*` build zamanında gömülür)
- [x] Panelde randevu, sipariş, kampanya, içerik sekmeleri veri gösteriyor (tablolardan)

## 6. Ana akışlar

> CI: `npm run test:integration` → `main-flows.test.ts` kod bağlantılarını doğrular.  
> Aşağıdaki maddeler **canlı panelde** manuel test içindir.

- [x] Randevu oluştur / güncelle / sil
- [x] Sipariş oluştur ve ödeme durumu güncelle («Teslim Edildi» = sipariş durumu, ödeme değil)
- [x] CRM müşteri ekle ve takip tarihi kaydet
- [x] AI kampanya üret (Pro veya free kota içinde)
- [x] Mini site yayınla ve lead formu gönder → CRM'de görünür
- [x] Karar Merkezi öneri onayla → görev oluşur

## 7. Platform (Faz 6)

- [ ] Platform sekmesi: ekip üyesi ekle (owner/staff/read_only)
- [ ] Audit log kayıtları görünüyor
- [ ] API anahtarı oluştur → `GET /platform/business-summary` çalışıyor
- [ ] Dil seçici TR/EN geçişi
- [ ] Ajans modu: `profiles.role = agency` ile işletme switcher

## 8. CI / E2E ve production monitoring (Faz B)

GitHub repo → Settings → **Variables** → Actions (production smoke / keep-warm için):

| Variable | Örnek | Açıklama |
|----------|-------|----------|
| `PRODUCTION_MONITORING_ENABLED` | `true` | `true` değilse veya URL'ler eksikse smoke + keep-warm yeşil skip eder |
| `AI_SERVICE_URL` | `https://localpilot-ai-1eea.onrender.com` | Render dashboard → Service URL (keep-warm + smoke; `/health` ekleme) |
| `FRONTEND_URL` | `https://localpilot-ai-1b2h-phi.vercel.app` | Vercel → Settings → Domains production URL |

GitHub repo → Settings → **Secrets** → Actions (E2E için):

| Secret | Açıklama |
|--------|----------|
| `E2E_TEST_EMAIL` | Test kullanıcı e-postası |
| `E2E_TEST_PASSWORD` | Test kullanıcı şifresi |
| `E2E_TEST_HAS_BUSINESS` | `true` — randevu E2E için |
| `E2E_PUBLIC_BUSINESS_ID` | Mini site lead form E2E |

- [ ] Secrets tanımlı (yoksa CI authenticated E2E skip eder — normal)
- [x] GitHub Actions `Production Smoke` workflow yeşil (6 saatte bir)
- [x] CI `main` push pipeline yeşil (smoke + integration + ai-service tests)