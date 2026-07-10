export interface ThemeConfig {
  primaryColor?: string;
}

export interface Campaign {
  id?: string;
  campaign_name: string;
  strategy: string;
  sms_whatsapp_template: string;
}

export type MiniSitePublishStatus = "draft" | "published";

export interface MiniSiteData {
  hero_slogan?: string;
  about_us?: string;
  cta_text?: string;
  features?: string[];
  publish_status?: MiniSitePublishStatus;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  whatsapp_prefill_message?: string;
  campaigns?: Campaign[];
  testimonials?: Testimonial[];
  crm_follow_ups?: Record<string, CustomerFollowUp>;
  appointments?: Appointment[];
  orders?: Order[];
  tasks?: StaffTask[];
  google_business_checklist?: GoogleBusinessChecklist;
  decision_cycles?: DecisionCycle[];
  sector_workflow_items?: SectorWorkflowItem[];
}

export type CustomDomainStatus =
  | "none"
  | "pending_dns"
  | "active"
  | "error";

export interface Business {
  id?: string;
  owner_id?: string;
  created_at?: string;
  name?: string;
  sector?: string;
  industry?: string;
  city?: string;
  address?: string;
  whatsapp_number?: string;
  working_hours?: string;
  target_audience?: string;
  business_type?: string;
  goals?: string[];
  top_products?: string;
  active_modules?: string[];
  theme_config?: ThemeConfig;
  /** Public path key: /site/{site_slug} */
  site_slug?: string | null;
  /** White-label hostname (Faz G.2+) */
  custom_domain?: string | null;
  custom_domain_status?: CustomDomainStatus | string | null;
  custom_domain_error?: string | null;
}

export interface BusinessDiagnosis {
  summary?: string;
  main_growth_opportunity?: string;
  biggest_risk?: string;
  ideal_first_focus?: string;
}

export interface NextSevenDaysItem {
  day: number;
  task: string;
  expected_result: string;
}

export interface GeneratedPlan {
  id?: string;
  business_id?: string;
  mini_site_data?: MiniSiteData;
  campaigns?: Campaign[];
  business_diagnosis?: BusinessDiagnosis;
  quick_wins?: string[];
  next_7_days_plan?: NextSevenDaysItem[];
  social_media_calendar?: SocialPost[];
  whatsapp_templates?: WhatsappTemplate[];
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
}

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  phone?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface CrmStatusHistoryItem {
  from?: string;
  to: string;
  changedAt: string;
}

export interface CustomerFollowUp {
  followUpDate?: string;
  statusHistory?: CrmStatusHistoryItem[];
}

export interface Appointment {
  id: string;
  customerName: string;
  phone?: string;
  service: string;
  startsAt: string;
  notes?: string;
  status: "planlandi" | "tamamlandi" | "iptal";
  createdAt: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone?: string;
  summary: string;
  total: number;
  channel: "magaza" | "telefon" | "whatsapp" | "web";
  status: "yeni" | "hazirlaniyor" | "hazir" | "teslim_edildi" | "iptal";
  paymentStatus: "bekliyor" | "odendi";
  createdAt: string;
}

export interface StaffTask {
  id: string;
  title: string;
  assignee: string;
  dueDate?: string;
  priority: "dusuk" | "normal" | "yuksek";
  status: "bekliyor" | "devam_ediyor" | "tamamlandi";
  notes?: string;
  createdAt: string;
}

export interface GoogleBusinessChecklist {
  completedItemIds: string[];
  updatedAt?: string;
}

export interface DecisionCycle {
  id: string;
  recommendationKey:
    | "pending_payment"
    | "overdue_tasks"
    | "open_orders"
    | "google_profile"
    | "growth_review"
    | "finance_decline"
    | "crm_churn_risk"
    | "empty_appointment_slots"
    | "review_insight";
  signal: string;
  analysis: string;
  recommendation: string;
  expectedResult: string;
  metric: string;
  status: "oneri" | "onaylandi" | "otomasyonda" | "olculdu";
  result?: "basarili" | "basarisiz";
  taskId?: string;
  createdAt: string;
  approvedAt?: string;
  automatedAt?: string;
  measuredAt?: string;
  confidenceScore?: number;
  learningEvidenceCount?: number;
}

export interface SectorStage {
  id: string;
  label: string;
}

export type SectorMetricKind =
  | "active_count"
  | "completed_count"
  | "stage_count"
  | "pipeline_value"
  | "completion_rate";

export interface SectorPackMetricDef {
  id: string;
  label: string;
  kind: SectorMetricKind;
  stageIds?: string[];
}

export type SectorAutomationTrigger =
  | "items_in_stage"
  | "stalled_in_stage"
  | "high_pipeline";

export interface SectorAutomationDef {
  id: string;
  title: string;
  description: string;
  trigger: SectorAutomationTrigger;
  triggerStageId?: string;
  suggestedAction: string;
}

export interface SectorPackMetricCard {
  id: string;
  label: string;
  value: number;
  displayValue: string;
}

export interface SectorPackAutomationSuggestion {
  id: string;
  title: string;
  description: string;
  suggestedAction: string;
  affectedCount: number;
}

export interface SectorPack {
  id: string;
  name: string;
  matches: string[];
  onboardingMatches?: string[];
  itemName: string;
  titleLabel: string;
  customerLabel: string;
  detailLabel: string;
  valueLabel: string;
  stages: SectorStage[];
  metricLabel: string;
  metrics: SectorPackMetricDef[];
  automations: SectorAutomationDef[];
}

export interface SectorWorkflowItem {
  id: string;
  packId: string;
  title: string;
  customer: string;
  detail?: string;
  value?: number;
  stage: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  type: "gelir" | "gider";
  amount: number;
  description: string;
  created_at: string;
}

export interface SocialPost {
  id?: string | number;
  platform: string;
  type?: string;
  text: string;
  image_prompt?: string;
  created_at?: string;
}

export interface WhatsappTemplate {
  id?: string | number;
  name: string;
  text: string;
  created_at?: string;
}

export interface Testimonial {
  name: string;
  comment: string;
}
