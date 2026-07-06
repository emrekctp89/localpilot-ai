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

## 4. Ödeme (Stripe — test modu)

Stripe **Test mode** açıkken gerçek kart gerekmez. `sk_test_` anahtarı kullanıldığından emin olun.

- [ ] `/health` yanıtında `stripe_mode: "test"` (canlıda test için Render env'de `sk_test_`)
- [ ] Stripe Dashboard (Test mode) → Webhooks → `checkout.session.completed`
- [ ] Test kartı: `4242 4242 4242 4242`, SKT: gelecek tarih, CVC: `123`
- [ ] Checkout → Pro plan aktif
- [ ] Webhook sonrası panelde `is_pro` güncelleniyor (yenile veya polling)

**Yerel geliştirme webhook:**

```bash
stripe listen --forward-to localhost:8000/stripe-webhook
```

CLI'nin verdiği `whsec_...` değerini `ai-service/.env` içindeki `STRIPE_WEBHOOK_SECRET` olarak kullanın.

## 5. Supabase migrations

- [ ] `001_operational_tables.sql` uygulandı
- [ ] `002_core_rls.sql` uygulandı
- [ ] `003_campaigns_content.sql` uygulandı
- [ ] `004_crm_activities.sql` uygulandı
- [ ] `005_ai_usage.sql` uygulandı
- [ ] `006_platform.sql` uygulandı
- [ ] `007_fix_rls_recursion.sql` uygulandı (006 sonrası RLS recursion fix)
- [ ] Başka kullanıcının verisine erişim engelli (RLS)

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

## 8. Otomatik izleme

- [ ] GitHub Actions `Production Smoke` workflow yeşil (6 saatte bir)
- [ ] CI `main` push pipeline yeşil (smoke + integration + ai-service tests)