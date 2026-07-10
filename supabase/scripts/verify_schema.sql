-- LocalPilot AI: migration doğrulama (Faz B)
-- Supabase SQL Editor'de çalıştırın. Tüm satırlar expected = true olmalı.

-- 001 operasyonel tablolar
SELECT 'appointments' AS check_name,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'appointments'
       ) AS ok;
SELECT 'orders',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'orders'
       );
SELECT 'staff_tasks',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'staff_tasks'
       );
SELECT 'decision_cycles',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'decision_cycles'
       );

-- 003 kampanya / içerik
SELECT 'campaigns',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'campaigns'
       );
SELECT 'content_items',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'content_items'
       );

-- 004 CRM aktiviteleri
SELECT 'crm_activities',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'crm_activities'
       );

-- 005 AI usage + Pro kolonları
SELECT 'ai_usage_counters',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'ai_usage_counters'
       );
SELECT 'profiles.is_pro',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'profiles'
           AND column_name = 'is_pro'
       );
SELECT 'profiles.pro_activated_at',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'profiles'
           AND column_name = 'pro_activated_at'
       );

-- 006 platform
SELECT 'business_members',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'business_members'
       );
SELECT 'audit_logs',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'audit_logs'
       );
SELECT 'business_api_keys',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'business_api_keys'
       );

-- 007 RLS recursion fix fonksiyonları
SELECT 'fn_user_owns_business',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'user_owns_business'
       );
SELECT 'fn_user_can_access_business',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'user_can_access_business'
       );
SELECT 'policy_businesses_member_select',
       EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'businesses'
           AND policyname = 'businesses_member_select'
       );

-- 008 migration tracking
SELECT 'schema_migrations',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'schema_migrations'
       );

-- 009 integrations (Faz E)
SELECT 'business_integrations',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'business_integrations'
       );
SELECT 'ai_quality_feedback',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'ai_quality_feedback'
       );

-- 010–011 partner program
SELECT 'partner_profiles',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'partner_profiles'
       );
SELECT 'commission_ledger',
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'commission_ledger'
       );

-- 012 mini site domains
SELECT 'businesses_site_slug',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'businesses'
           AND column_name = 'site_slug'
       );
SELECT 'businesses_custom_domain',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'businesses'
           AND column_name = 'custom_domain'
       );

-- 013 domain resolve RPC
SELECT 'fn_resolve_mini_site_by_domain',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'resolve_mini_site_by_domain'
       );

-- 014 manual pro commission RPC
SELECT 'fn_record_manual_pro_commission',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'record_manual_pro_commission'
       );

-- 015 slug backfill helpers
SELECT 'fn_lp_normalize_site_slug',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'lp_normalize_site_slug'
       );
SELECT 'fn_lp_backfill_business_site_slugs',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'lp_backfill_business_site_slugs'
       );