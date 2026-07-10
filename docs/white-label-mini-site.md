# White-label Mini Site — Özel Domain Araştırması (Faz G)

**Tarih:** 10 Temmuz 2026  
**Durum:** G.1–G.3 kodda · env + migration `013` production’da uygulanmalı  
**Mevcut URL:** `{app}/site/{slug|uuid}` · aktif custom domain → host rewrite

---

## 1. Bugünkü durum

| Bileşen | Durum |
|---------|--------|
| Rota | `frontend/app/site/[id]/page.tsx` |
| Veri | `businesses` + `generated_plans.mini_site_data` + `products` |
| Yayın | `mini_site_data.publish_status`: `draft` \| `published` |
| SEO | `buildMiniSiteSeo`, JSON-LD, canonical = app host + path |
| Middleware | Yok |
| Özel domain / slug | Yok (Faz 1 slug eklendi) |
| Branding | Footer: “LocalPilot AI tarafından…” |

Ziyaretçi her zaman LocalPilot host’unu görür; işletme kendi domain’ini kullanamaz.

---

## 2. Hedef (white-label)

1. **Okunabilir URL:** `/site/guzel-kuafor` (slug) — UUID yerine.
2. **Özel domain:** `www.guzelkuafor.com` → aynı mini site (SSL + DNS).
3. **Marka:** Özel domain’de LocalPilot footer opsiyonel gizleme (Pro/ajans).
4. **Kontrol:** Ayarlar’dan slug + domain; ödeme onayı olmadan domain ücreti yok (taslak politikası).

---

## 3. Seçenekler

### A) Path slug (Faz 1 — önerilen ilk adım) ✅

- `businesses.site_slug` unique (case-insensitive).
- `/site/[id]` hem UUID hem slug kabul eder.
- DNS / Vercel domain API yok.
- SEO: paylaşılabilir kısa link.

### B) Vercel custom domain + middleware (Faz 2)

```
DNS:  CNAME www → cname.vercel-dns.com
Vercel: Project → Domains API (add domain)
Next: middleware host → rewrite /site/{businessId}
```

| Artı | Eksi |
|------|------|
| Gerçek white-label | Vercel token / plan limitleri |
| Otomatik SSL | Domain verify + pending state |
| | Middleware host allowlist |

**Akış:**

1. Kullanıcı domain girer → `custom_domain_status = pending_dns`.
2. Panel DNS talimatı (CNAME).
3. Backend/cron veya “Doğrula” butonu → Vercel Domains API.
4. Aktif olunca `status = active`; middleware `Host` → business resolve.
5. Canonical URL = `https://{custom_domain}/`.

### C) Cloudflare for SaaS / harici proxy (Faz 3 opsiyon)

Çok kiracılı SSL (custom hostnames). Ajans ölçeğinde; erken aşamada aşırı.

---

## 4. Veri modeli (migration `012`)

```text
businesses.site_slug              text  UNIQUE (lower)
businesses.custom_domain          text  UNIQUE (lower)  -- örn. www.ornek.com
businesses.custom_domain_status   text  -- none | pending_dns | active | error
businesses.custom_domain_error    text  nullable
```

`mini_site_data` içinde domain tutulmaz — işletme satırında, index ve RLS net olsun.

---

## 5. Çözümleme sırası

1. Request `Host` app domain değilse → `custom_domain` (active) ara.
2. Path `/site/:key` → UUID ise `id`, değilse `site_slug`.
3. Bulunamazsa 404.

Canonical:

- Custom domain active → `https://{domain}/`
- Değilse → `getSiteBaseUrl() + /site/{slug|id}`

---

## 6. Güvenlik

- Domain claim: sadece owner/agency; unique constraint race’i engeller.
- Public okuma: anon’un mini site için ihtiyaç duyduğu alanlar (bugün `select *` path’i). İleride `resolve_public_mini_site(key)` RPC ile daraltılmalı.
- Draft: mevcut `publish_status` + `?preview=1` korunur; custom domain draft’ta 404 veya preview token.
- Open redirect yok; sadece DB’de kayıtlı host rewrite.

---

## 7. Vercel / env (Faz 2)

| Değişken | Amaç |
|----------|------|
| `VERCEL_TOKEN` | Domains API (server-only) |
| `VERCEL_PROJECT_ID` | Domain ekleme |
| `VERCEL_TEAM_ID` | Opsiyonel |
| `NEXT_PUBLIC_APP_URL` | Primary host (middleware ayrımı) |
| `CUSTOM_DOMAIN_CNAME_TARGET` | Kullanıcıya gösterilen CNAME (varsayılan `cname.vercel-dns.com`) |

---

## 8. UI planı

**Ayarlar (Faz 1):**

- Site adresi (slug) alanı + canlı önizleme linki.
- UUID link geriye dönük çalışır.

**Ayarlar (Faz 2):**

- Özel domain input + durum rozeti.
- DNS talimatları kutusu.
- “DNS’i doğrula” butonu.

**Platform / ajans:**

- Portföyde domain durumu listesi (ileride).

---

## 9. Uygulama fazları

| Faz | Kapsam | Durum |
|-----|--------|--------|
| **G.1** | `site_slug`, resolve UUID\|slug, Ayarlar UI, test, migration `012` | ✅ |
| **G.2** | Custom domain panel UI + DNS CNAME talimatı + `pending_dns` kaydı | ✅ |
| **G.3** | Vercel Domains API + middleware host rewrite + `013` RPC | ✅ |
| **G.4** | White-label footer + Pro-only domain gate | ✅ |

---

## 10. Kararlar

| Konu | Karar |
|------|--------|
| İlk teslimat | Path slug (hızlı değer, düşük risk) |
| Domain sağlayıcı | Vercel (mevcut frontend host) |
| Ücretlendirme | Domain özelliği Pro/ajans; şimdilik taslak UI |
| Apex domain | Kullanıcıya CNAME öner; apex A/ALIAS Vercel docs |
| LocalPilot footer | Custom domain active iken gizlenebilir (Pro) |

---

## 11. Kabul kriterleri

### G.1
- [x] Migration `012` repo’da + Supabase uygulandı
- [x] `/site/{slug}` ve `/site/{uuid}` aynı içeriği üretir
- [x] Ayarlar’da slug kaydı + public link slug kullanır
- [x] Geçersiz slug reddedilir (normalize + validasyon)
- [x] Unit/integration test slug normalize/resolve

### G.2
- [x] Ayarlar’da özel domain input + durum rozeti
- [x] DNS CNAME talimatı (`cname.vercel-dns.com`)
- [x] Kayıt → `pending_dns` / temizle → `none`
- [x] Active domain değişmeden kaydedilince status korunur
- [x] Test: `resolveCustomDomainSaveState` + Ayarlar wiring

### G.3
- [x] Vercel Domains API (`lib/vercel-domains.ts`) + `/api/custom-domain/verify`
- [x] Middleware `Host` → `resolve_mini_site_by_domain` → `/site/{id}`
- [x] Canonical URL custom domain (`getMiniSitePublicUrl` active)
- [x] Active domain’de LocalPilot footer gizleme
- [ ] Production: `013` SQL (kullanıcı uygular)
- [ ] **Sonra:** Vercel env — `docs/ROADMAP.md` → «Sonra yapılacak — Vercel custom domain env»
