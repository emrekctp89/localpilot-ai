-- LocalPilot AI: core table RLS (Faz 1.2)
-- Run in Supabase SQL Editor after 001_operational_tables.sql

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_plans ENABLE ROW LEVEL SECURITY;

-- profiles: users read/update only their own row
DROP POLICY IF EXISTS profiles_self_select ON profiles;
CREATE POLICY profiles_self_select ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- businesses: owners manage their businesses
DROP POLICY IF EXISTS businesses_owner ON businesses;
CREATE POLICY businesses_owner ON businesses
  FOR ALL USING (owner_id = auth.uid());

-- customers: only for businesses owned by the current user
DROP POLICY IF EXISTS customers_owner ON customers;
CREATE POLICY customers_owner ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- transactions: only for businesses owned by the current user
DROP POLICY IF EXISTS transactions_owner ON transactions;
CREATE POLICY transactions_owner ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = transactions.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- generated_plans: only for businesses owned by the current user
DROP POLICY IF EXISTS generated_plans_owner ON generated_plans;
CREATE POLICY generated_plans_owner ON generated_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = generated_plans.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- Public mini-site lead capture: anonymous visitors may insert customers
DROP POLICY IF EXISTS customers_public_insert ON customers;
CREATE POLICY customers_public_insert ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
    )
  );