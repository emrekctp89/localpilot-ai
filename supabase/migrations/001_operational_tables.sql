-- LocalPilot AI: operational data tables (PR-3)
-- Run in Supabase SQL Editor or via supabase db push

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT,
  service TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planlandi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT,
  summary TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'yeni',
  payment_status TEXT NOT NULL DEFAULT 'bekliyor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee TEXT NOT NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'bekliyor',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_cycles (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recommendation_key TEXT NOT NULL,
  signal TEXT NOT NULL,
  analysis TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  metric TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'oneri',
  result TEXT,
  task_id UUID,
  confidence_score INTEGER,
  learning_evidence_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  automated_at TIMESTAMPTZ,
  measured_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS google_checklists (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  completed_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sector_workflow_items (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  title TEXT NOT NULL,
  customer TEXT NOT NULL,
  detail TEXT,
  value NUMERIC,
  stage TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_business ON staff_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_decision_cycles_business ON decision_cycles(business_id);
CREATE INDEX IF NOT EXISTS idx_sector_workflow_business ON sector_workflow_items(business_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_workflow_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_owner ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = appointments.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY orders_owner ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = orders.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY staff_tasks_owner ON staff_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = staff_tasks.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY decision_cycles_owner ON decision_cycles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = decision_cycles.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY google_checklists_owner ON google_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = google_checklists.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY sector_workflow_owner ON sector_workflow_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = sector_workflow_items.business_id
        AND businesses.owner_id = auth.uid()
    )
  );