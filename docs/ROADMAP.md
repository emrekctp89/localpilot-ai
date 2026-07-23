# LocalPilot AI — Geliştirme Roadmap

**Güncel sürüm:** `2.6.6` (Faz H — owner channel notify)  
**Son güncelleme:** 23 Temmuz 2026  
**Aktif sprint:** **Faz H** (kapanışa yakın)

---

## Vizyon

Yerel işletmeler için tek panelden çalışan, ölçülebilir kararlar üreten ve operasyonu otomasyona dönüştüren bir **Business OS**.

---

## Kararlar (güncel)

| Konu | Karar |
|------|--------|
| **Pro üyelik** | Manuel + checkout kodda; Stripe Price ID opsiyonel |
| **Canlı Google OAuth** | **Ertelendi** — gerçek public domain + Google Cloud OAuth client sonra. Şimdilik: checklist auto-seed, kopyalanabilir metinler, Haritalar / Profil Yöneticisi linkleri |
| **Canlı WhatsApp Cloud** | Ertelendi — `wa.me` fallback |
| **Partner komisyonu** | Ajans %20 · Referans %10 · panelden onay |
| **Aktif faz** | **Faz H** (Faz G kod kapandı) |
| **Public launch** | Henüz değil — preview domain (`*.vercel.app` / Render) geliştirme için yeterli |
| **Production** | Vercel `localpilot-ai-1b2h-phi` · Render `localpilot-ai-1eea` |

---

## Öncelik Matrisi

| Öncelik | Anlam |
|---------|--------|
| **P0** | Production güvenilirliği |
| **P1** | Ürün değeri / tutma (lead → aksiyon) |
| **P2** | Büyüme |
| **P3** | Platform ölçeği |

---

## Sürüm Planı

| Sürüm | Odak | Durum |
|-------|------|--------|
| **2.5.x** | Mini site + onboarding + universal tabs | ✅ |
| **2.6.0** | **Faz H** — panel bildirimleri (lead / site) | ✅ |
| **2.6.5** | Realtime, lead→CRM deep link, bildirim tercihleri | ✅ |
| **2.6.6** | Owner e-posta (Resend) / WhatsApp Cloud + tarayıcı push | ✅ |
| **2.7.x** | Ops: domain env, E2E secrets, Stripe Price ID | ops |
| **2.7.0** | Ops: domain env, E2E secrets, Stripe Price ID | ops |
| **2.8.0** | Faz E canlı Google/Meta (gerçek domain + credential) | ⏸️ domain sonrası |

---

## Faz G — Platform Ölçeği ✅ KAPANDI

- [x] White-label G.1–G.3 (slug, domain UI, middleware)
- [x] G.4 footer hide (active domain)
- [x] Onboarding 2.5.x (AI chip, magic-fill, ML sekmeler)
- [x] Universal tabs (Kasa, CRM, İçerik, İş Akışı)
- [x] Mini site vitrin polish (nav, ürün, konum, smart WA CTA)

**Ops kalan (kod dışı):** Vercel domain env · migration 015/016 doğrulama · E2E secrets

---

## Faz H — Bildirim ve Tutma (P1) ← AKTİF

**Hedef:** Mini site’den gelen lead veya site güncellemesi işletme sahibinin panelde kaçırılmasın.

### H.1 In-app bildirim altyapısı
- [x] `017_business_notifications.sql` — tablo + RLS + public lead RPC
- [x] Repository: listele, okundu işaretle, oluştur
- [x] Dashboard header **zil** + okunmamış sayacı

### H.2 Mini site lead bildirimi
- [x] Public lead formu → `lead.created` bildirimi (sahip/üye görür)
- [x] Mevcut webhook + localStorage CRM toast korunur
- [x] Zilden CRM sekmesine atlama

### H.3 Mini site ayar / yayın bildirimi
- [x] Ayarlar kaydı / Yayına Al / Taslağa Al → `mini_site.updated` | `mini_site.published` | `mini_site.draft`
- [x] Panelde okunabilir özet metin

### H.4 Sonraki (2.6.x)
- [x] 30–45 sn poll (zil, Realtime fallback)
- [x] Google checklist auto-seed (gerçek site / onboarding verisi)
- [x] Realtime (Supabase channel + migration `018`)
- [x] Bildirim tercihleri (Ayarlar)
- [x] Mini site lead → CRM deep link + WhatsApp / Ara
- [x] E-posta / WhatsApp owner notify (Resend + Cloud API opsiyonel; soft-fail)
- [x] Tarayıcı / sistem bildirimi (Notification API)
- [ ] Google Places API canlı profil (credential)

---

## Faz H sonrası backlog

| Madde | Öncelik |
|-------|---------|
| GitHub E2E secrets + panel E2E (Kasa sabit) | P1 |
| Vercel `VERCEL_TOKEN` / domain canlı doğrulama | P2 ops |
| Stripe Price ID env | P2 ops |
| Faz E Google OAuth (gerçek domain + Cloud Console + Render env) | P2 — **bilinçli ertelendi** (public hazır değil) |
| Sentry | P3 |
| İki hesaplı RLS manuel | P3 |

---

## Mevcut Durum (özet)

| Alan | Durum |
|------|--------|
| Auth + onboarding | ✅ |
| Dashboard sekmeleri | ✅ universal + model |
| Mini site public | ✅ RPC 016 + vitrin |
| Partner / komisyon | ✅ |
| CI smoke + integration | ✅ |
| In-app owner bildirim | ✅ Faz H (+ Realtime 2.6.5) |
| E2E secrets | ⏸️ opsiyonel |

---

## Nasıl kullanılır? (Faz H)

1. Supabase’de `017_business_notifications.sql` + **`018_notifications_realtime.sql`** uygula.
2. Deploy frontend (+ gerekirse ai-service).
3. Mini site lead gönder → panel zilinde bildirim (Realtime veya poll).
4. Zilden lead’e tıkla → CRM + WhatsApp/Ara; Ayarlar’dan tercihleri yönet.
5. Ayarlar’dan site kaydet / yayına al → bildirim (tercih açıksa).

**Migration sırası:** `001`–`016` + **`017`** + **`018`**.
