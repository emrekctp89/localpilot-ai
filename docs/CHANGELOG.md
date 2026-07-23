# Changelog

## 2.7.0 - 2026-07-23

### Added
- E2E **panel-core**: Finans, CRM, Ayarlar (bildirim tercihleri), notification bell.
- CI `e2e-live-public`: production `FRONTEND_URL` üzerinde live-public + mobile smoke.
- Production Smoke: `/auth` curl + Playwright live/mobile.
- `docs/ops-e2e.md` — secrets, variables, domain, owner notify env rehberi.
- npm scripts: `test:e2e:live`, `test:e2e:mobile`, `test:e2e:panel`.
- Test workflow: `workflow_dispatch` + concurrency.

### Changed
- Playwright skips local webServer when `PLAYWRIGHT_BASE_URL` is a remote host.

## 2.6.6 - 2026-07-23

### Added
- **Owner channel notify** for mini-site leads (optional):
  - AI service `POST /public/owner-lead-notify` (public, rate-limited, soft-fail)
  - WhatsApp Cloud → `business.whatsapp_number` when Ayarlar’da açık + env
  - Resend e-posta when `RESEND_API_KEY` (+ optional `RESEND_FROM_EMAIL`) + Ayarlar e-posta
- Ayarlar: tarayıcı/sistem bildirimi izni + kanal tercihleri (`theme_config.owner_notify`)
- Lead form calls owner notify after in-app notification
- Health check field `owner_email` (Resend configured?)

### Changed
- Notification prefs: `browserPush` default on

## 2.6.5 - 2026-07-23

### Added
- **Faz H.4** notification polish: Supabase Realtime on `business_notifications` (migration `018`) + 45s poll fallback.
- Notification bell: instant toast on new lead/site events; **WhatsApp** / **Ara** actions on lead items.
- Lead → CRM deep link: open CRM with search, highlight matching customer, banner with WA/call.
- CRM customer detail: WhatsApp + Ara buttons.
- Ayarlar → **Bildirim tercihleri** (lead, mini site, toast) — per-business localStorage.

### Changed
- Poll interval 30s → 45s when Realtime is primary; unread list filters by prefs.

## 2.6.4 - 2026-07-12

### Changed
- Google OAuth **consciously deferred** until real public domain (product not launch-ready).
- Google tab: “Geliştirme modu” copy; Connect disabled as “Bağlan (domain sonrası)” when OAuth env off.
- Manual path emphasized: checklist seed, copy suggestions, Maps + Business Manager links.

## 2.6.3 - 2026-07-12

### Fixed
- Google “Bağlan” felt dead: errors only rendered under AI suggestions (hidden when checklist full). Errors now show next to connect button.
- Block connect when Render `google_oauth` is not configured, with env instructions.
- Reject browser AI URL pointing at localhost; require valid `NEXT_PUBLIC_AI_SERVICE_URL`.

## 2.6.2 - 2026-07-12

### Fixed
- Auth `fetch Invalid value`: sanitize `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` (trim, first line only) so multi-line Vercel paste does not break Authorization headers.
- Auth page shows clear config error when Supabase env is missing/corrupt.

## 2.6.1 - 2026-07-12

### Added
- Google Business checklist **auto-seed** from real onboarding/website fields (contact, category, description, products, review link, profile-claimed when Google Maps / site).
- Setup seeds `google_checklists` and ensures `google_business` module when location/phone present.
- Google tab banner explaining automatic fill; richer product suggestion from `top_products`.

## 2.6.0 - 2026-07-12

### Added
- **Faz H** roadmap: owner notifications for mini-site leads and site updates.
- Migration `017_business_notifications.sql` + `notify_business_lead` RPC (public lead → owner).
- Dashboard **notification bell** (30s poll, mark read, jump to CRM/Ayarlar).
- Lead form writes owner notification; Ayarlar save/publish/draft creates in-app alerts.

## 2.5.10 - 2026-07-12

### Changed
- Dashboard **universal tabs** always visible: Kasa (finans), CRM, İçerik, İş Akışı — all business models + ML path.
- Model-specific only: Ürün → Sipariş/Menü; Hizmet → Randevu/Personel (+ Google when address).

## 2.5.9 - 2026-07-12

### Added
- Industry catalog matcher (`matchIndustryToCatalog`) so magic-fill maps AI sectors onto onboarding select.
- Magic-fill success/error feedback in wizard.
- Expanded ML synthetic training sectors; smoke + unit tests for magic-fill wiring.

### Changed
- Shared `SECTOR_CATEGORIES` in `lib/onboarding-sectors.ts`.
- Faz G marked complete in roadmap (ops env still optional).

## 2.5.8 - 2026-07-12

### Added
- Onboarding **Sihirli Doldurma**: website scrape + AI (`POST /magic-fill`).
- ML tab prediction for new businesses (`POST /predict-tabs`, `tab_predictor.py`).
- Setup accepts `active_modules` from frontend ML result.

### Changed
- `getVisibleTabs` prioritizes non-empty `active_modules` (ML) over type heuristics.
- Docker image includes `tab_predictor.py`; requirements: `requests`, `beautifulsoup4`.

### Fixed
- Magic-fill SSRF basics, text join bug, response sanitize.
- Magic-fill `setData` typing (not React setState).
- Predict-tabs allowlist of known module/tab ids.

## 2.5.7 - 2026-07-12

### Added
- Richer onboarding: story, main problem, price level, digital status, desired outputs.
- Sector-aware AI chip options via `POST /generate-onboarding-options` (goals, audience, USP, product placeholders).
- Onboarding draft normalize for array fields + cached AI options.

### Changed
- Business model selection moved to step 1; step labels Temel → Konum → Hedef → Değer → Marka.
- Setup AI no longer returns `active_modules` (tabs from `getVisibleTabs` / business_type).
- Goals multi-select capped at 3; setup payload strips UI-only `ai_options`.

### Fixed
- Target audience stored as string[] (was incorrectly joined to string mid-wizard).
- Onboarding options setData typing; safe AI response sanitize on backend.

## 2.5.6 - 2026-07-11

### Added
- Dedicated About + “Neden bizi seçmeliler” public sections (`MiniSiteAbout`).
- Multi-paragraph about text (blank-line split).
- Smart CTA routing: WhatsApp-labeled CTA opens WA and hides duplicate WA button.

### Changed
- Hero / top bar / sticky bar share `resolveMiniSiteCtaActions`.
- Ayarlar help copy clarifies Form CTA vs WhatsApp CTA.

## 2.5.5 - 2026-07-11

### Added
- Product-specific WhatsApp inquiry messages (name + optional price).
- Lead form auto-fills notes when visitor taps product “Detay Al”.
- Testimonials section id + top-nav “Yorumlar” when present.
- Ayarlar mini-site readiness checklist (slogan, about, features, WA, slug, CTA).
- Richer live theme preview card with publish badge and open path.

### Changed
- Product list cards also expose Detay Al / WhatsApp actions.

## 2.5.4 - 2026-07-11

### Added
- Mini site desktop section nav (Hakkımızda / Ürünler / Konum / İletişim).
- Interactive product category filter (tabs) on public mini site.
- Dedicated location + working hours section with maps and quick contact.

### Changed
- Product showcase extracted to `MiniSiteProducts` client component.

## 2.5.3 - 2026-07-11

### Added
- Mini site sticky top bar with name + CTA.
- Contact chips: call, WhatsApp, maps, working hours.
- Feature cards filter empty strings; up to 3 highlights.

### Changed
- Product/menu section shows whenever products exist (not only menu module).

## 2.5.2 - 2026-07-11

### Added
- Mini site mobile sticky CTA (contact + WhatsApp).
- Mini site share/copy link control in footer.
- Draft mode page polish with clearer owner guidance.

### Changed
- Mini site hero scales better on small screens; city fallback when empty.
- Lead notes field is optional; consent microcopy under form.

## 2.5.1 - 2026-07-11

### Fixed
- Public mini site 404 for anonymous visitors: RLS blocked `businesses` SELECT.
- Migration `016`: `resolve_public_mini_site` + `business_exists` (SECURITY DEFINER).
- Lead insert policy no longer requires readable `businesses` rows under RLS.

## 2.5.0 - 2026-07-11

### Added
- Auto `site_slug` ensure on dashboard load for businesses missing a slug.
- Lead form TR mobile phone validation and normalized storage.
- Marketing SEO: `robots.ts`, `sitemap.ts`.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Public API business summary: `site_slug`, domain status, orders metric, `public_site` hints.
- Migration `015` site_slug backfill (apply in Supabase if not yet).

### Changed
- Frontend version bump to `2.5.0`.
- OzetTab mini-site opens via slug-aware public path.

## 2.4.0 - 2026-07-10

### Added
- Partner program: referral links, agency/referral commissions, admin approval panel.
- Monthly/yearly Pro plan UI and checkout wiring.
- Faz G multi-business billing draft on Platform tab.
- White-label mini site: `site_slug`, custom domain UI, DNS verify API, host middleware (G.1–G.3).
- PWA: web manifest, service worker, install prompt, offline page, mobile bottom tab bar.
- UI design system (`lp-*` tokens), Auth/landing polish, dashboard module polish.
- Empty states, module loading skeletons, offline banner, skip-to-content a11y link.
- Auto-suggest mini site slug from business name.
- Manual Pro commission: `014_manual_pro_commission.sql` RPC + commission admin form.
- Auto-assign unique `site_slug` on `/setup-business` when migration 012 is present.
- Migration `015`: backfill `site_slug` for existing businesses + migration registry 012–015.

### Changed
- Marketing container desktop gutters so content does not hug viewport edges.
- Production URLs and roadmap advanced to Faz G / UI polish track.
- Schema verify script covers partner tables, domain columns, and RPCs 013–014.
- Production checklist: commission admin + manual Pro commission steps.

## 2.1.1 - 2026-07-07

### Added
- `008_schema_migrations.sql`, `verify_schema_remote.py`, `rls_audit.sql`, `verify-schema.yml` workflow.
- `supabase/scripts/verify_schema.sql` and `rls-migrations.test.ts` integration guard.
- Production monitoring: keep-warm, smoke workflows, URL normalization, CORS fixes.
- Explicit `/health` OPTIONS handler; CRM follow-up date save on blur.
- Dockerfile fix for Faz E modules (`integrations/`, `ai_cache.py`).

### Changed
- Deferred automatic Pro billing; manual `profiles.is_pro` documented as current process.
- Deferred Faz E live integrations and two-account RLS panel test.
- Applied `009_business_integrations.sql` in Supabase.
- Checklist §6 live flows completed; active sprint moved to Faz F (growth).
- Production URLs: Render `localpilot-ai-1eea`, Vercel `localpilot-ai-1b2h-phi`.

## 2.1.0 - Unreleased

### Fixed
- Fixed Pro activation failing on Supabase Python client (`update().single()` not supported).
- Fixed Stripe Checkout session metadata reads for SDK objects (`stripe_utils.py`).
- Fixed dashboard Pro state sync after payment (`useProCheckoutActivation`, `refreshProStatus`).
- Fixed free-tier UI showing after successful Pro payment when `isPro` was stale.

### Added
- Added panel-level Pro checkout activation hook with visible error messages.
- Added optional live Supabase activation integration test (`RUN_STRIPE_INTEGRATION=1`).
- Added v2.1 roadmap focused on billing reliability and production hardening.

## 2.0.0 - 2026-07-06

### Added
- Added platform tab with team roles (owner, staff, read_only), audit log, API keys, and TR/EN locale switching.
- Added agency mode for multi-business management via `profiles.role = agency`.
- Added public API endpoint `GET /platform/business-summary` and outbound webhooks on lead creation.
- Added Pro funnel with free-tier AI usage limits, upgrade CTA, and first-7-day activation checklist.
- Added activation metrics (onboarding rate, first appointment/customer/campaign, decision approval time).
- Added marketing site with landing page, sector demos, and pricing page.
- Added client-side error reporting hook (`NEXT_PUBLIC_ERROR_REPORT_URL`) and global error boundary.
- Added production verification checklist and expanded production smoke workflow (health, CORS, pricing).

### Changed
- Bumped frontend version to `2.0.0` after Faz 6 platform completion.
- Updated `deploy/production.env.template` with migrations 005–006 and E2E secret documentation.

## 1.0.0 - Unreleased

### Added
- Added a persistent Decision Center for operational signals, analysis, and recommendations.
- Added explicit user approval before recommendations can become automated tasks.
- Added recommendation-to-task conversion with linked decision records.
- Added successful and unsuccessful outcome measurement for completed decision cycles.
- Added a shared Business OS engine for signal collection, recommendation ranking, approval policy, automation, and measurement.
- Added outcome-weighted recommendation priorities and confidence scores.
- Added mandatory approval policies for messages, campaign publishing, and financial transactions.
- Added a sector pack registry that resolves workflows from each business industry.
- Added adaptive workflow packs for salons, field service businesses, automotive galleries, retail, and generic services.
- Added persistent sector workflow records, stages, values, and completion metrics.

## 0.9.9 - 2026-06-20

### Added
- Added a persistent Google Business Profile checklist with categorized readiness steps.
- Added live completion progress and automatic Supabase plan persistence.
- Added field-level onboarding validation after attempted step progression.
- Added inline onboarding service feedback inside the setup wizard.
- Added an account and membership center with real Pro status and account email.
- Added checkout return feedback and a manual membership status refresh action.

## 0.9.0 - 2026-06-19

### Added
- Added a persistent appointment management module with upcoming, all, and past views.
- Added appointment creation, status updates, daily counts, and delete actions.
- Added persistent order tracking with channel, fulfillment, and payment statuses.
- Added open-order, pending-payment, and completed-revenue summaries.
- Added persistent staff task planning with assignees, priorities, deadlines, and completion states.
- Added open, overdue, and completed task summaries.
- Added a unified operations summary with live appointment, order, payment, and task indicators.

## 0.3.0 - 2026-06-18

### Added
- Added per-user onboarding draft storage that restores the current step and form values.
- Added automatic onboarding draft cleanup after an existing business is found or setup completes.
- Added persistent social post and WhatsApp template history with timestamps and delete actions.
- Added Supabase-backed CRM follow-up dates and status history.
- Added one-time migration of legacy CRM reminders from local browser storage.

### Fixed
- Normalized older AI content fields such as `caption` and `message` so existing history renders correctly.

## 0.2.0 - Development foundation

### Added
- Connected dashboard AI actions to the backend service.
- Added Pro upgrade wiring for AI tools.
- Added persisted campaign editing in the AI tools panel.
- Added mini site publish status, public link display, copy action, and preview action in settings.
- Added mini site theme color selection with live preview and persisted public-site styling.
- Added richer public mini site product/service showcase with category chips, featured cards, and an empty state.
- Added CRM customer search, status filtering, and filtered result counts.
- Added CRM customer detail panel with contact, status, date, and note summary.
- Added local CRM follow-up dates and status history scaffolding in the customer detail panel.
- Added finance transaction date filters with filtered balances and empty filtered states.
- Added expense categories for finance transactions and category badges for expense rows.
- Added finance monthly summary cards and a simple six-month income/expense trend view.
- Added route-level loading, error, and not-found states for app, dashboard, and public mini site routes.
- Added shared frontend domain types for business, plan, campaign, customer, transaction, product, and content models.
- Added dependency-free smoke tests for auth, onboarding, dashboard tab coverage, and shared domain models.
- Added finance forecast, churn analysis, content, CRM, menu, and settings dashboard modules as typed development targets.
- Added project roadmap for the next feature phase.

### Changed
- Reworked dashboard component ownership so CRM, finance, menu, and content modules manage their own state.
- Normalized visible Turkish text in the finance panel.
- Normalized dashboard loading and error copy.
- Replaced remote Google font dependency with local CSS fallback for safer offline/local builds.
- Updated backend dependency list to match imports used by the API service.
- Set FastAPI metadata version to `0.2.0`.

### Fixed
- Removed dashboard handlers that were placeholders.
- Fixed TypeScript and targeted ESLint issues across dashboard modules.
- Hid dashboard tabs that do not have matching rendered views yet.
- Hardened finance and CRM render paths around missing data.

## 0.1.0 - Prototype

### Added
- Initial Next.js frontend.
- Initial FastAPI AI service.
- Supabase-backed dashboard prototype.
