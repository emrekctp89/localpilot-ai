-- LocalPilot AI: geliştirme ortamı örnek veri (Faz C)
-- Yalnızca boş/test işletmelerde kullanın. UUID'leri kendi hesabınızla değiştirin.
--
-- Önkoşul: auth.users ve profiles satırı mevcut olmalı.

-- Örnek değişkenler (SQL Editor'de düzenleyin):
--   :owner_id  -> profiles.id / auth.users.id
--   :business_id -> businesses.id (yoksa INSERT ile oluşur)

/*
INSERT INTO businesses (id, owner_id, name, industry, city, sector)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Demo Kafe',
  'Yeme-İçme',
  'İstanbul',
  'kafe'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, business_id, name, phone, status)
VALUES (
  gen_random_uuid(),
  '00000000-0000-4000-8000-000000000101',
  'Demo Müşteri',
  '+905551112233',
  'aktif'
);
*/

SELECT 'seed_dev.sql: UUID değerlerini düzenleyip yorumu kaldırarak çalıştırın.' AS note;