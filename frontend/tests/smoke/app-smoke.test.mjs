import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDirectory, "../..");

const readSource = (relativePath) =>
  readFile(path.join(frontendRoot, relativePath), "utf8");

test("auth screen keeps email, password, signup, and Google login flows", async () => {
  const source = await readSource("app/auth/page.tsx");

  assert.match(source, /type="email"/);
  assert.match(source, /type="password"/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /signUp/);
  assert.match(source, /signInWithOAuth/);
  assert.match(source, /provider:\s*['"]google['"]/);
  assert.match(source, /router\.push\(['"]\/dashboard['"]\)/);
});

test("dashboard protects unauthenticated access and exposes onboarding", async () => {
  const [pageSource, sessionSource] = await Promise.all([
    readSource("app/dashboard/page.tsx"),
    readSource("hooks/useDashboardSession.ts"),
  ]);

  assert.match(sessionSource, /ensureSupabaseSession/);
  assert.match(sessionSource, /waitForSupabaseSession/);
  assert.match(sessionSource, /shouldShowOnboarding/);
  assert.match(sessionSource, /readPaymentReturn/);
  assert.match(sessionSource, /if\s*\(!session\?\.user\)\s*\{/);
  assert.match(sessionSource, /router\.push\(["']\/auth["']\)/);
  assert.match(pageSource, /session\.shouldShowOnboarding/);
  assert.match(pageSource, /<OnboardingWizard/);
  assert.match(pageSource, /onComplete=\{handleCompleteOnboarding\}/);
});

test("onboarding progress is restored, saved, and cleared per user", async () => {
  const [sessionSource, draftSource, setupSource] = await Promise.all([
    readSource("hooks/useDashboardSession.ts"),
    readSource("hooks/useOnboarding.ts"),
    readSource("app/dashboard/page.tsx"),
  ]);

  assert.match(sessionSource, /onboardingDraftKey\(user\.id\)/);
  assert.match(sessionSource, /window\.localStorage\.getItem\(draftStorageKey\)/);
  assert.match(draftSource, /window\.localStorage\.setItem\(/);
  assert.match(draftSource, /step:\s*onboardingStep/);
  assert.match(draftSource, /data:\s*onboardingData/);
  assert.match(
    draftSource,
    /window\.localStorage\.removeItem\(onboardingStorageKey\)/,
  );
});

test("onboarding keeps five steps with inline validation and setup feedback", async () => {
  const source = await readSource(
    "app/components/dashboard/OnboardingWizard.tsx",
  );

  for (const step of [1, 2, 3, 4, 5]) {
    assert.match(source, new RegExp(`step === ${step}`));
  }

  for (const nextStep of [2, 3, 4, 5]) {
    assert.match(source, new RegExp(`handleContinue\\(${nextStep}\\)`));
  }

  assert.match(source, /attemptedSteps/);
  assert.match(source, /handleContinue/);
  assert.match(source, /handleComplete/);
  assert.match(source, /buildDraftOnboardingRate/);
  assert.match(source, /aria-invalid/);
  assert.match(source, /<FieldError\s+field="name"/);
  assert.match(source, /<FieldError\s+field="whatsapp_number"/);
  assert.match(source, /<FieldError\s+field="brand_tone"/);
  assert.match(source, /\{setupError\}/);
  assert.match(source, /disabled=\{isSettingUp\}/);
});

test("content history normalizes, timestamps, persists, and deletes items", async () => {
  const source = await readSource(
    "app/components/dashboard/IcerikTab.tsx",
  );

  assert.match(source, /normalizeSocialPosts/);
  assert.match(source, /record\.caption/);
  assert.match(source, /normalizeWhatsappTemplates/);
  assert.match(source, /record\.message/);
  assert.match(source, /created_at:\s*createdAt/);
  assert.match(source, /listContentItems/);
  assert.match(source, /saveContentItems/);
  assert.match(source, /handleDeleteSocialPost/);
  assert.match(source, /handleDeleteWhatsappTemplate/);
  assert.match(source, /İçerik Geçmişi/);
});

test("CRM follow-ups migrate locally and persist to Supabase", async () => {
  const [crmSource, domainSource] = await Promise.all([
    readSource("app/components/dashboard/CrmTab.tsx"),
    readSource("lib/domain-types.ts"),
  ]);

  assert.match(crmSource, /localpilot-crm-reminders-/);
  assert.match(crmSource, /listCustomerFollowUps/);
  assert.match(crmSource, /saveCustomerFollowUps/);
  assert.match(crmSource, /window\.localStorage\.removeItem\(reminderStorageKey\)/);
  assert.match(crmSource, /Buluta kaydedildi/);
  assert.match(domainSource, /crm_follow_ups\?:\s*Record<string,\s*CustomerFollowUp>/);
  assert.match(domainSource, /export interface CustomerFollowUp/);
});

test("appointment module persists scheduling and status changes", async () => {
  const [appointmentSource, domainSource] = await Promise.all([
    readSource("app/components/dashboard/RandevuTab.tsx"),
    readSource("lib/domain-types.ts"),
  ]);

  assert.match(appointmentSource, /Randevu Yönetimi/);
  assert.match(appointmentSource, /saveAppointments/);
  assert.match(appointmentSource, /handleAddAppointment/);
  assert.match(appointmentSource, /handleStatusChange/);
  assert.match(appointmentSource, /handleDelete/);
  assert.match(domainSource, /export interface Appointment/);
});

test("order module persists fulfillment and payment statuses", async () => {
  const [orderSource, domainSource] = await Promise.all([
    readSource("app/components/dashboard/SiparisTab.tsx"),
    readSource("lib/domain-types.ts"),
  ]);

  assert.match(orderSource, /Sipariş Yönetimi/);
  assert.match(orderSource, /saveOrders/);
  assert.match(orderSource, /handleAddOrder/);
  assert.match(orderSource, /handleOrderUpdate/);
  assert.match(orderSource, /paymentStatus/);
  assert.match(orderSource, /completedRevenue/);
  assert.match(domainSource, /export interface Order/);
});

test("staff task module persists assignments and deadlines", async () => {
  const [taskSource, domainSource] = await Promise.all([
    readSource("app/components/dashboard/GorevlerTab.tsx"),
    readSource("lib/domain-types.ts"),
  ]);

  assert.match(taskSource, /Görev ve Personel Planlama/);
  assert.match(taskSource, /saveStaffTasks/);
  assert.match(taskSource, /handleAddTask/);
  assert.match(taskSource, /handleStatusChange/);
  assert.match(taskSource, /overdueCount/);
  assert.match(domainSource, /export interface StaffTask/);
});

test("dashboard presents a unified operations summary", async () => {
  const [summarySource, overviewSource] = await Promise.all([
    readSource("app/components/dashboard/OperasyonOzeti.tsx"),
    readSource("app/components/dashboard/OzetTab.tsx"),
  ]);

  assert.match(summarySource, /Operasyon Özeti/);
  assert.match(summarySource, /todayAppointments/);
  assert.match(summarySource, /openOrders/);
  assert.match(summarySource, /pendingPayment/);
  assert.match(summarySource, /openTasks/);
  assert.match(summarySource, /overdueTasks/);
  assert.match(summarySource, /loadOperationalSnapshot/);
  assert.match(summarySource, /setActiveTab\(card\.tab\)/);
  assert.match(overviewSource, /<OperasyonOzeti/);
});

test("Google Business checklist persists profile readiness", async () => {
  const [googleSource, domainSource] = await Promise.all([
    readSource("app/components/dashboard/GoogleBusinessTab.tsx"),
    readSource("lib/domain-types.ts"),
  ]);

  assert.match(googleSource, /Google İşletme Profili/);
  assert.match(googleSource, /saveGoogleChecklist/);
  assert.match(googleSource, /handleToggle/);
  assert.match(googleSource, /completedItemIds/);
  assert.match(googleSource, /progress/);
  assert.match(domainSource, /export interface GoogleBusinessChecklist/);
});

test("settings exposes account and Pro membership controls", async () => {
  const [settingsSource, dashboardSource] = await Promise.all([
    readSource("app/components/dashboard/AyarlarTab.tsx"),
    readSource("app/dashboard/page.tsx"),
  ]);

  assert.match(settingsSource, /Hesap ve Üyelik/);
  assert.match(settingsSource, /Pro'ya Yükselt/);
  assert.match(settingsSource, /Üyelik Durumunu Yenile/);
  assert.match(settingsSource, /confirmProCheckout/);
  assert.match(settingsSource, /checkoutSessionId/);
  assert.match(settingsSource, /Üyelik Durumunu Yenile/);
  assert.match(dashboardSource, /useProCheckoutActivation/);
  assert.match(dashboardSource, /readPaymentReturn/);
  assert.match(dashboardSource, /refreshProStatus/);
  assert.match(dashboardSource, /accountEmail=\{session\.accountEmail\}/);
  assert.match(dashboardSource, /isPro=\{session\.isPro\}/);
});

test("decision center closes the data-to-measurement loop", async () => {
  const [decisionSource, engineSource, domainSource] = await Promise.all([
    readSource("app/components/dashboard/KararMerkeziTab.tsx"),
    readSource("lib/business-os.ts"),
    readSource("lib/domain-types.ts"),
  ]);

  assert.match(decisionSource, /Karar Merkezi/);
  assert.match(decisionSource, /Verileri Analiz Et/);
  assert.match(decisionSource, /handleApprove/);
  assert.match(decisionSource, /applyApprovedAutomation/);
  assert.match(decisionSource, /measureDecisionOutcome/);
  assert.match(decisionSource, /saveDecisionCycles/);
  assert.match(decisionSource, /loadDecisionContext/);
  assert.match(decisionSource, /getLearningHistory/);
  assert.match(decisionSource, /buildDecisionDashboardSummary/);
  assert.match(decisionSource, /Tek Tık Aksiyon/);
  assert.match(decisionSource, /getDecisionQuickActions/);
  assert.match(decisionSource, /triggerBusinessWebhooks/);
  assert.match(engineSource, /export const APPROVAL_POLICY/);
  assert.match(engineSource, /export const AUTOMATION_ACTION_UX/);
  assert.match(engineSource, /getAutomationActionForKey/);
  assert.match(engineSource, /send_message:\s*true/);
  assert.match(engineSource, /publish_campaign:\s*true/);
  assert.match(engineSource, /financial_transaction:\s*true/);
  assert.match(engineSource, /cycle\.status === "onaylandi"/);
  assert.match(engineSource, /learningScore/);
  assert.match(engineSource, /successes \* 8 - failures \* 12/);
  assert.match(engineSource, /tasks:\s*\[task,\s*\.\.\.existingTasks\]/);
  assert.match(domainSource, /export interface DecisionCycle/);
});

test("sector packs adapt one workflow component to each business", async () => {
  const [workflowSource, packsSource, domainSource, onboardingSource] =
    await Promise.all([
      readSource("app/components/dashboard/SektorIsAkisiTab.tsx"),
      readSource("lib/sector-packs.ts"),
      readSource("lib/domain-types.ts"),
      readSource("app/components/dashboard/OnboardingWizard.tsx"),
    ]);

  assert.match(packsSource, /id:\s*"salon"/);
  assert.match(packsSource, /id:\s*"field_service"/);
  assert.match(packsSource, /id:\s*"auto_gallery"/);
  assert.match(packsSource, /id:\s*"restaurant"/);
  assert.match(packsSource, /id:\s*"clinic"/);
  assert.match(packsSource, /id:\s*"real_estate"/);
  assert.match(packsSource, /Kuaför ve Güzellik/);
  assert.match(packsSource, /Restoran ve Yeme-İçme/);
  assert.match(packsSource, /Klinik ve Sağlık/);
  assert.match(packsSource, /Gayrimenkul ve Emlak/);
  assert.match(packsSource, /resolveSectorPack/);
  assert.match(packsSource, /resolveSectorPackFromIndustry/);
  assert.match(packsSource, /computePackMetricCards/);
  assert.match(packsSource, /getActiveSectorAutomations/);
  assert.match(packsSource, /onboardingMatches/);
  assert.match(workflowSource, /saveSectorWorkflowItems/);
  assert.match(workflowSource, /pack\.stages/);
  assert.match(workflowSource, /handleStageChange/);
  assert.match(workflowSource, /computePackMetricCards/);
  assert.match(workflowSource, /getActiveSectorAutomations/);
  assert.match(workflowSource, /handleApplyAutomation/);
  assert.match(workflowSource, /Sektör Otomasyonları/);
  assert.match(onboardingSource, /resolveSectorPackFromIndustry/);
  assert.match(onboardingSource, /Atanan sektör paketi/);
  assert.match(domainSource, /export interface SectorPack/);
  assert.match(domainSource, /export interface SectorPackMetricDef/);
  assert.match(domainSource, /export interface SectorAutomationDef/);
  assert.match(domainSource, /export interface SectorWorkflowItem/);
});

test("performance upgrades add keep-warm, ai cache, and parallel bootstrap", async () => {
  const repoRoot = path.resolve(frontendRoot, "..");
  const readRepoSource = (relativePath) =>
    readFile(path.join(repoRoot, relativePath), "utf8");

  const [
    keepWarmWorkflow,
    bootstrapSource,
    sessionSource,
    aiServiceSource,
    aiCacheSource,
    renderConfig,
  ] = await Promise.all([
    readFile(path.join(repoRoot, ".github/workflows/keep-warm.yml"), "utf8"),
    readSource("lib/dashboard-bootstrap.ts"),
    readSource("hooks/useDashboardSession.ts"),
    readRepoSource("ai-service/main.py"),
    readRepoSource("ai-service/ai_cache.py"),
    readRepoSource("render.yaml"),
  ]);

  assert.match(keepWarmWorkflow, /Keep Warm/);
  assert.match(keepWarmWorkflow, /\*\/10 \* \* \* \*/);
  assert.match(aiCacheSource, /get_cached_response/);
  assert.match(aiServiceSource, /ai_cache/);
  assert.match(aiServiceSource, /use_cache=False/);
  assert.match(aiServiceSource, /"ai_cache": get_cache_stats\(\)/);
  assert.match(bootstrapSource, /loadDashboardBootstrap/);
  assert.match(sessionSource, /fetchDashboardContext/);
  assert.match(renderConfig, /AI_CACHE_TTL_SECONDS/);
});

test("external integrations wire google, whatsapp, and calendar flows", async () => {
  const repoRoot = path.resolve(frontendRoot, "..");
  const readRepoSource = (relativePath) =>
    readFile(path.join(repoRoot, relativePath), "utf8");

  const [
    googleTabSource,
    randevuSource,
    icerikSource,
    integrationsSource,
    aiServiceSource,
  ] = await Promise.all([
    readSource("app/components/dashboard/GoogleBusinessTab.tsx"),
    readSource("app/components/dashboard/RandevuTab.tsx"),
    readSource("app/components/dashboard/IcerikTab.tsx"),
    readSource("lib/integrations/google-business.ts"),
    readRepoSource("ai-service/main.py"),
  ]);

  assert.match(integrationsSource, /buildGoogleProfileSuggestions/);
  assert.match(googleTabSource, /Canlı Profil Önerileri/);
  assert.match(googleTabSource, /fetchGoogleProfileSuggestions/);
  assert.match(randevuSource, /Google Calendar Sync/);
  assert.match(randevuSource, /Takvime Ekle/);
  assert.match(icerikSource, /WhatsApp Business API/);
  assert.match(icerikSource, /buildWhatsAppTemplateSendPlan/);
  assert.match(aiServiceSource, /integration\/google-profile-suggestions/);
});

test("ai quality upgrades wire campaigns, reviews, and finance forecast", async () => {
  const repoRoot = path.resolve(frontendRoot, "..");
  const readRepoSource = (relativePath) =>
    readFile(path.join(repoRoot, relativePath), "utf8");

  const [aiServiceSource, promptSource, campaignsHookSource, aiToolsSource, dashboardSource, businessOsSource, kasaSource] =
    await Promise.all([
      readRepoSource("ai-service/main.py"),
      readRepoSource("ai-service/prompt_context.py"),
      readSource("hooks/useCampaigns.ts"),
      readSource("app/components/dashboard/AiAraclarTab.tsx"),
      readSource("app/dashboard/page.tsx"),
      readSource("lib/business-os.ts"),
      readSource("app/components/dashboard/KasaTab.tsx"),
    ]);

  assert.match(promptSource, /build_business_profile_block/);
  assert.match(aiServiceSource, /decision_bridge/);
  assert.match(aiServiceSource, /months_covered/);
  assert.match(aiServiceSource, /build_campaign_mode_instruction/);
  assert.match(campaignsHookSource, /handleGenerateCampaignVariant/);
  assert.match(campaignsHookSource, /buildCampaignRequest\(business, "variant"/);
  assert.match(aiToolsSource, /Varyant Üret/);
  assert.match(aiToolsSource, /Karar Merkezi Köprüsü/);
  assert.match(dashboardSource, /buildReviewDecisionCycle/);
  assert.match(dashboardSource, /handleSendReviewToDecisionCenter/);
  assert.match(businessOsSource, /review_insight/);
  assert.match(businessOsSource, /buildReviewDecisionCycle/);
  assert.match(kasaSource, /incomeMonthCount/);
});

test("mini site lead flow, seo, and publish status are wired", async () => {
  const [sitePageSource, leadFormSource, settingsSource, miniSiteSource, crmSource] =
    await Promise.all([
      readSource("app/site/[id]/page.tsx"),
      readSource("app/site/[id]/LeadForm.tsx"),
      readSource("app/components/dashboard/AyarlarTab.tsx"),
      readSource("lib/mini-site.ts"),
      readSource("app/components/dashboard/CrmTab.tsx"),
    ]);

  assert.match(sitePageSource, /generateMetadata/);
  assert.match(sitePageSource, /openGraph/);
  assert.match(sitePageSource, /application\/ld\+json/);
  assert.match(sitePageSource, /buildWhatsAppDeepLink/);
  assert.match(sitePageSource, /<LeadForm/);
  assert.match(sitePageSource, /MiniSiteDraft/);
  assert.match(leadFormSource, /recordLeadCapture/);
  assert.match(leadFormSource, /buildLeadEmailDraft/);
  assert.match(leadFormSource, /Yeni Potansiyel/);
  assert.match(settingsSource, /publish_status/);
  assert.match(settingsSource, /seo_title/);
  assert.match(settingsSource, /whatsapp_prefill_message/);
  assert.match(settingsSource, /Yayına Al/);
  assert.match(settingsSource, /Taslağa Al/);
  assert.match(miniSiteSource, /buildWhatsAppDeepLink/);
  assert.match(miniSiteSource, /buildLocalBusinessJsonLd/);
  assert.match(crmSource, /LEAD_CAPTURE_EVENT/);
  assert.match(crmSource, /mini site lead/);
});

test("every rendered dashboard tab has a matching view", async () => {
  const [menuSource, dashboardSource] = await Promise.all([
    readSource("app/components/dashboard/TabMenu.tsx"),
    readSource("app/dashboard/page.tsx"),
  ]);

  const expectedTabs = [
    "ozet",
    "karar",
    "is_akisi",
    "icerik",
    "crm",
    "randevu",
    "siparis",
    "personel",
    "google_business",
    "kasa",
    "menu",
    "araclar",
    "ayarlar",
    "platform",
  ];

  for (const tab of expectedTabs) {
    assert.match(menuSource, new RegExp(`["']${tab}["']`));
    assert.match(
      dashboardSource,
      new RegExp(`activeTab === ["']${tab}["']`),
    );
  }

  for (const unfinishedTab of [
    "sadakat",
    "raporlar",
    "sosyal_medya",
  ]) {
    assert.doesNotMatch(
      dashboardSource,
      new RegExp(`activeTab === ["']${unfinishedTab}["']`),
    );
  }
});

test("ai client attaches Supabase session token to protected requests", async () => {
  const source = await readSource("lib/ai-client.ts");

  assert.match(source, /ensureSupabaseSession/);
  assert.match(source, /Authorization/);
  assert.match(source, /Bearer \$\{session\.access_token\}/);
});

test("auth form labels are associated with inputs for accessibility", async () => {
  const source = await readSource("app/auth/page.tsx");

  assert.match(source, /htmlFor="auth-email"/);
  assert.match(source, /id="auth-email"/);
  assert.match(source, /htmlFor="auth-password"/);
  assert.match(source, /id="auth-password"/);
});

test("ai service enforces auth, rate limits, and strict cors", async () => {
  const projectRoot = path.resolve(testDirectory, "../..");
  const [mainSource, configSource, securitySource] = await Promise.all([
    readFile(path.join(projectRoot, "../ai-service/main.py"), "utf8"),
    readFile(
      path.join(projectRoot, "../ai-service/middleware/config.py"),
      "utf8",
    ),
    readFile(
      path.join(projectRoot, "../ai-service/middleware/security.py"),
      "utf8",
    ),
  ]);

  assert.match(mainSource, /create_auth_middleware/);
  assert.match(mainSource, /create_rate_limit_middleware/);
  assert.match(mainSource, /parse_allow_origin_regex/);
  assert.match(mainSource, /allow_origin_regex/);
  assert.match(configSource, /parse_allow_origin_regex/);
  assert.match(securitySource, /verify_access/);
  assert.match(securitySource, /status_code=401/);
  assert.match(securitySource, /status_code=429/);
});

test("deploy artifacts exist for production rollout", async () => {
  const projectRoot = path.resolve(testDirectory, "../..");
  const repoRoot = path.resolve(projectRoot, "..");

  const [dockerfile, dockerignore, vercelJson, renderYaml, prodEnv] =
    await Promise.all([
      readFile(path.join(repoRoot, "ai-service/Dockerfile"), "utf8"),
      readFile(path.join(repoRoot, "ai-service/.dockerignore"), "utf8"),
      readFile(path.join(projectRoot, "vercel.json"), "utf8"),
      readFile(path.join(repoRoot, "render.yaml"), "utf8"),
      readFile(path.join(repoRoot, "deploy/production.env.template"), "utf8"),
    ]);

  assert.match(dockerfile, /uvicorn main:app/);
  assert.match(dockerignore, /__pycache__/);
  assert.match(vercelJson, /fra1/);
  assert.match(renderYaml, /healthCheckPath:\s*\/health/);
  assert.match(prodEnv, /AI_SERVICE_REQUIRE_AUTH=true/);
  assert.match(prodEnv, /NEXT_PUBLIC_AI_SERVICE_URL=/);
});

test("operational repositories support table storage with legacy fallback", async () => {
  const [indexSource, migrationSource] = await Promise.all([
    readSource("lib/repositories/index.ts"),
    readFile(
      path.join(
        path.resolve(testDirectory, "../.."),
        "../supabase/migrations/001_operational_tables.sql",
      ),
      "utf8",
    ),
  ]);

  assert.match(indexSource, /saveAppointments/);
  assert.match(indexSource, /saveOrders/);
  assert.match(indexSource, /saveStaffTasks/);
  assert.match(indexSource, /saveDecisionCycles/);
  assert.match(indexSource, /loadOperationalSnapshot/);
  assert.match(indexSource, /loadDecisionContext/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS appointments/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS orders/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS staff_tasks/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS decision_cycles/);
});

test("shared domain models remain available to dashboard modules", async () => {
  const source = await readSource("lib/domain-types.ts");

  for (const model of [
    "Business",
    "GeneratedPlan",
    "Campaign",
    "Customer",
    "Transaction",
    "Product",
  ]) {
    assert.match(source, new RegExp(`export interface ${model}\\b`));
  }
});

test("platform tab exposes team roles, audit log, api and i18n", async () => {
  const [platformSource, dashboardSource, migrationSource] = await Promise.all([
    readSource("app/components/dashboard/PlatformTab.tsx"),
    readSource("app/dashboard/page.tsx"),
    readFile(
      path.join(
        path.resolve(testDirectory, "../.."),
        "../supabase/migrations/006_platform.sql",
      ),
      "utf8",
    ),
  ]);

  assert.match(platformSource, /listBusinessMembers/);
  assert.match(platformSource, /listAuditLogs/);
  assert.match(platformSource, /listBusinessApiKeys/);
  assert.match(platformSource, /useLocale/);
  assert.match(dashboardSource, /switchBusiness/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS audit_logs/);
});

test("marketing site exposes landing, sector demos and pricing page", async () => {
  const [landingSource, pricingSource, marketingLibSource] = await Promise.all([
    readSource("app/page.tsx"),
    readSource("app/fiyatlandirma/page.tsx"),
    readSource("lib/marketing-site.ts"),
  ]);

  assert.match(landingSource, /MARKETING_VALUE_PROPS/);
  assert.match(landingSource, /SectorDemoShowcase/);
  assert.match(landingSource, /İşletmenizi yönetin, AI ile büyütün/);
  assert.doesNotMatch(landingSource, /redirect\(/);
  assert.match(pricingSource, /PricingCards/);
  assert.match(marketingLibSource, /SECTOR_DEMOS/);
  assert.match(marketingLibSource, /PRICING_PLANS/);
});

test("activation metrics surface onboarding rate and milestone durations", async () => {
  const [ozetSource, metricsSource, componentSource] = await Promise.all([
    readSource("app/components/dashboard/OzetTab.tsx"),
    readSource("lib/activation-metrics.ts"),
    readSource("app/components/dashboard/AktivasyonMetrikleri.tsx"),
  ]);

  assert.match(ozetSource, /AktivasyonMetrikleri/);
  assert.match(metricsSource, /buildActivationMetrics/);
  assert.match(metricsSource, /first_decision_approval/);
  assert.match(componentSource, /Aktivasyon Metrikleri/);
});

test("error boundaries report client errors and expose global fallback", async () => {
  const [reportingSource, fallbackSource, globalErrorSource, appErrorSource] =
    await Promise.all([
      readSource("lib/error-reporting.ts"),
      readSource("app/components/ErrorFallback.tsx"),
      readSource("app/global-error.tsx"),
      readSource("app/error.tsx"),
    ]);

  assert.match(reportingSource, /captureClientError/);
  assert.match(reportingSource, /NEXT_PUBLIC_ERROR_REPORT_URL/);
  assert.match(fallbackSource, /captureClientError/);
  assert.match(globalErrorSource, /Uygulama yüklenemedi/);
  assert.match(appErrorSource, /ErrorFallback/);
});

test("production checklist and env template document live verification", async () => {
  const [checklistSource, prodEnv] = await Promise.all([
    readFile(
      path.join(path.resolve(testDirectory, "../.."), "../docs/production-checklist.md"),
      "utf8",
    ),
    readFile(
      path.join(path.resolve(testDirectory, "../.."), "../deploy/production.env.template"),
      "utf8",
    ),
  ]);

  assert.match(checklistSource, /verify_schema\.sql/);
  assert.match(checklistSource, /001.*008/);
  assert.match(checklistSource, /main-flows\.test\.ts/);
  assert.match(checklistSource, /PRODUCTION_MONITORING_ENABLED/);
  assert.match(checklistSource, /CORS/);
  assert.match(prodEnv, /005_ai_usage\.sql/);
  assert.match(prodEnv, /006_platform\.sql/);
  assert.match(prodEnv, /007_fix_rls_recursion\.sql/);
  assert.match(prodEnv, /NEXT_PUBLIC_ERROR_REPORT_URL/);
});

test("pro funnel exposes usage limits, upgrade CTA and activation checklist", async () => {
  const [dashboardSource, funnelSource, bannerSource, checklistSource] =
    await Promise.all([
      readSource("app/dashboard/page.tsx"),
      readSource("lib/pro-funnel.ts"),
      readSource("app/components/dashboard/ProUpgradeBanner.tsx"),
      readSource("app/components/dashboard/ProActivationChecklist.tsx"),
    ]);

  assert.match(dashboardSource, /useAiUsage/);
  assert.match(dashboardSource, /ProActivationChecklist/);
  assert.match(funnelSource, /FREE_AI_DAILY_LIMIT/);
  assert.match(funnelSource, /buildActivationChecklist/);
  assert.match(bannerSource, /Ücretsiz AI Kotası/);
  assert.match(bannerSource, /Pro&apos;ya Yükselt/);
  assert.match(checklistSource, /Pro İlk 7 Gün/);
});
