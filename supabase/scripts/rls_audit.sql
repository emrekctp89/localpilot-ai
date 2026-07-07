-- LocalPilot AI: RLS manuel audit (Faz B)
-- İki test kullanıcısı ile çapraz erişim testinden ÖNCE/SONRA çalıştırın.
-- UUID'leri kendi test hesaplarınızla değiştirin.

-- Örnek:
--   owner_id  = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
--   outsider  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

-- 1) Her kullanıcının erişebildiği işletmeler (service role ile)
SELECT b.id, b.name, b.owner_id
FROM businesses b
ORDER BY b.created_at DESC
LIMIT 20;

-- 2) RLS helper fonksiyonları yüklü mü?
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'user_owns_business',
    'user_is_business_member',
    'user_can_access_business',
    'user_can_write_business'
  )
ORDER BY proname;

-- 3) Kritik tablolarda RLS açık mı?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'businesses',
    'business_members',
    'customers',
    'appointments',
    'profiles'
  )
ORDER BY tablename;

-- 4) Uygulanan migration kayıtları (008 sonrası)
SELECT version, name, applied_at
FROM schema_migrations
ORDER BY version;