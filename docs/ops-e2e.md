# Ops: E2E secrets, production smoke, domain

**Sürüm hedefi:** 2.7.x  
**Son güncelleme:** 23 Temmuz 2026

Bu belge kod dışı ops adımlarını ve CI’nin ne zaman ne çalıştırdığını özetler.

---

## 1. GitHub Actions — Variables (repo)

Settings → Secrets and variables → Actions → **Variables**

| Variable | Zorunlu | Örnek | Kullanım |
|----------|---------|-------|----------|
| `PRODUCTION_MONITORING_ENABLED` | smoke için | `true` | Production Smoke + Keep Warm |
| `AI_SERVICE_URL` | smoke için | `https://localpilot-ai-1eea.onrender.com` | Health + CORS |
| `FRONTEND_URL` | smoke için | `https://localpilot-ai-1b2h-phi.vercel.app` | Home/pricing + Playwright live |

Boş veya `PRODUCTION_MONITORING_ENABLED != true` ise smoke **yeşil skip** eder.

---

## 2. GitHub Actions — Secrets (E2E)

Settings → Secrets and variables → Actions → **Secrets**

| Secret | Ne için |
|--------|---------|
| `E2E_TEST_EMAIL` | Panel login (dashboard, panel-core, decision, appointment) |
| `E2E_TEST_PASSWORD` | Panel login |
| `E2E_TEST_HAS_BUSINESS` | `true` → işletmesi kurulmuş hesap (Kasa/CRM/Karar/Randevu) |
| `E2E_PUBLIC_BUSINESS_ID` | Public mini site lead form E2E |

### Test hesabı önerisi

1. Production (veya staging) üzerinde e-posta/şifre ile bir kullanıcı oluştur.
2. Onboarding’i tamamla (işletme + slug).
3. `E2E_TEST_HAS_BUSINESS=true` yap.
4. Mini site business UUID’yi Supabase `businesses.id` üzerinden al → `E2E_PUBLIC_BUSINESS_ID`.

Secrets yoksa authenticated E2E job’ları **skip** (pipeline yeşil kalır).

---

## 3. CI job’ları (`test.yml`)

| Job | Tetikleyici | İçerik |
|-----|-------------|--------|
| `frontend` | push/PR | tsc, smoke, integration, auth-guard E2E (local build) |
| `e2e-authenticated` | push/PR + secrets | dashboard, decision-center, **panel-core**, appointment |
| `e2e-public-site` | push/PR + public id | public-site.spec |
| `e2e-live-public` | push/PR + `FRONTEND_URL` var | production domain live-public + mobile smoke |
| `ai-service` | push/PR | Python unit tests |

Manuel: **Actions → Test → Run workflow** (`workflow_dispatch`).

---

## 4. Production Smoke (`smoke-production.yml`)

- Schedule: 6 saatte bir + `workflow_dispatch`
- Health, CORS, home, pricing
- Playwright `live-public` + `mobile-live-smoke` (FRONTEND_URL)

---

## 5. Yerel komutlar

```bash
cd frontend

# Local build E2E (webServer)
npm run test:e2e -- e2e/auth-guard.spec.ts

# Canlı production public
npm run test:e2e:live

# Canlı mobil (iPhone 13 + Pixel 7)
npm run test:e2e:mobile

# Auth paneli (secrets .env.local veya shell)
# E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... E2E_TEST_HAS_BUSINESS=true
npm run test:e2e -- e2e/panel-core.spec.ts
```

---

## 6. Vercel custom domain (white-label)

Server-only env (Vercel Project → Settings → Environment Variables):

| Env | Açıklama |
|-----|---------|
| `VERCEL_TOKEN` | Account token, Domains API |
| `VERCEL_PROJECT_ID` | `prj_...` |
| `VERCEL_TEAM_ID` | opsiyonel `team_...` |

Ayarlar’da domain kaydet → **Doğrula** (`/api/custom-domain/verify`).  
Token yoksa UI hata mesajı verir; mini site slug path (`/site/{slug}`) etkilenmez.

Detay: `docs/white-label-mini-site.md`.

---

## 7. Render AI service (owner notify opsiyonel)

| Env | Etki |
|-----|------|
| `RESEND_API_KEY` | Owner e-posta lead bildirimi |
| `RESEND_FROM_EMAIL` | Gönderen (default Resend onboarding) |
| `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | Owner WA Cloud lead |

Health: `checks.owner_email`, `checks.whatsapp_cloud`.

---

## 8. Kontrol listesi

- [ ] Variables: monitoring + AI + FRONTEND_URL
- [ ] Secrets: E2E hesabı (opsiyonel ama paneli kilitler)
- [ ] Vercel production redeploy (main push sonrası)
- [ ] Render redeploy (AI endpoint’ler)
- [ ] Migration 017–018 Supabase
- [ ] (Opsiyonel) VERCEL_TOKEN domain
- [ ] (Opsiyonel) Resend / WhatsApp Cloud
