# LocalPilot AI Roadmap

## Current Version: 0.9.9

This release focuses on local visibility, onboarding clarity, and account readiness.

### Release Scope
- Add a persistent Google Business Profile readiness checklist. (Done with categorized steps and progress tracking.)
- Add inline onboarding validation and setup feedback. (Done with field-level errors and in-wizard service feedback.)
- Improve Pro billing and account settings. (Done with plan status, payment feedback, and membership refresh controls.)

## Planned Version: 1.0.0

This release turns LocalPilot modules into a measurable business decision system.

### Release Scope
- Add a persistent decision center that analyzes operational signals. (Done as a shared Business OS engine with a dashboard control surface.)
- Require explicit user approval before automation. (Done for task automation.)
- Convert approved recommendations into tracked operational tasks. (Done with atomic decision and task persistence.)
- Measure recommendation outcomes and preserve the learning history. (Done with successful and unsuccessful result states.)
- Use measured outcomes to improve future recommendation priority. (Done with outcome-weighted ranking and confidence scores.)
- Apply mandatory approval policies to message, campaign, and financial side effects. (Done in the shared automation policy.)
- Add a shared core plus sector-specific component pack architecture. (Started with salon, field service, automotive gallery, retail, and generic workflow packs.)
- Expand sector packs with dedicated fields, metrics, and automations.

## Next Feature Phase

### 1. Onboarding Quality
- Add clearer validation for required onboarding fields. (Done with validation on attempted step progression.)
- Save setup progress before final submission. (Done with per-user local drafts.)
- Show setup errors inline instead of only using alerts. (Done inside the onboarding wizard.)

### 2. AI Output Management
- Persist generated campaigns from the AI tools panel.
- Add regenerate and edit actions for campaign ideas. (Campaign edit is done; regenerate is available through the same action.)
- Add content history for social posts and WhatsApp templates. (Done in the content panel.)

### 3. Mini Site Builder
- Add visual theme preview. (Done in settings panel.)
- Add publish status and public link copy action. (Done in settings panel.)
- Add richer product/service sections. (Done on public mini site.)

### 4. CRM Improvements
- Add customer search and filters. (Done in CRM panel.)
- Add customer detail view. (Done in CRM panel.)
- Add follow-up reminders and status history. (Done with Supabase persistence and local reminder migration.)

### 5. Finance Module
- Add date filters for transactions. (Done in finance panel.)
- Add expense categories. (Done in finance panel.)
- Add simple monthly summary cards and trend chart. (Done in finance panel.)

### 6. Product Readiness
- Normalize Turkish UI text and encoding. (Finance panel done.)
- Add shared domain types for Supabase tables. (Done for dashboard and public mini site models.)
- Add route-level loading and error states. (Done for app, dashboard, and public mini site routes.)
- Add smoke tests for auth, onboarding, and dashboard tabs. (Done with the frontend smoke test suite.)

## Later Ideas

- Automated Google Business Profile content suggestions.
- Team roles and permissions.
