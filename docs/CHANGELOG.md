# Changelog

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
