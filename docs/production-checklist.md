# Production Doğrulama Checklist

Canlı ortamda deploy sonrası veya migration uygulamasından sonra bu listeyi çalıştırın.

## 1. Altyapı sağlığı

- [ ] `curl https://localpilot-ai-service.onrender.com/health` → `status: ok` veya `degraded`
- [ ] Health yanıtında `checks.gemini`, `checks.supabase`, `checks.stripe` true
- [ ] `curl https://localpilot-ai-1b2h.vercel.app` → 200
- [ ] `curl https://localpilot-ai-1b2h.vercel.app/fiyatlandirma` → 200

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

## 5. Supabase migrations ve RLS (Faz B)

Sırayla SQL Editor'de uygulayın (`supabase/migrations/`):

- [ ] `001` → `007` tamamlandı
- [ ] `supabase/scripts/verify_schema.sql` çalıştırıldı — tüm satırlar `ok = true`

**Manuel RLS audit (iki test hesabı):**

1. Kullanıcı A: işletme sahibi, en az bir müşteri/randevu kaydı
2. Kullanıcı B: A'nın işletmesine üye değil
3. B ile giriş → A'nın `customers`, `appointments`, `businesses` verisi **görünmemeli**
4. Panel RLS recursion hatası vermemeli (`infinite recursion detected`)

- [ ] Çapraz kullanıcı erişimi engelli
- [ ] İşletme sahibi kendi verisine erişebiliyor

## 6. Ana akışlar

- [ ] Randevu oluştur / güncelle / sil
- [ ] Sipariş oluştur ve ödeme durumu güncelle
- [ ] CRM müşteri ekle ve takip tarihi kaydet
- [ ] AI kampanya üret (Pro veya free kota içinde)
- [ ] Mini site yayınla ve lead formu gönder → CRM'de görünür
- [ ] Karar Merkezi öneri onayla → görev oluşur

## 7. Platform (Faz 6)

- [ ] Platform sekmesi: ekip üyesi ekle (owner/staff/read_only)
- [ ] Audit log kayıtları görünüyor
- [ ] API anahtarı oluştur → `GET /platform/business-summary` çalışıyor
- [ ] Dil seçici TR/EN geçişi
- [ ] Ajans modu: `profiles.role = agency` ile işletme switcher

## 8. CI / E2E (Faz B)

GitHub repo → Settings → Secrets → Actions:

| Secret | Açıklama |
|--------|----------|
| `E2E_TEST_EMAIL` | Test kullanıcı e-postası |
| `E2E_TEST_PASSWORD` | Test kullanıcı şifresi |
| `E2E_TEST_HAS_BUSINESS` | `true` — randevu E2E için |
| `E2E_PUBLIC_BUSINESS_ID` | Mini site lead form E2E |

- [ ] Secrets tanımlı (yoksa CI authenticated E2E skip eder — normal)
- [ ] GitHub Actions `Production Smoke` workflow yeşil (6 saatte bir)
- [ ] CI `main` push pipeline yeşil (smoke + integration + ai-service tests)