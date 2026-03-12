-- ================================================================
-- Lovable Infinite - Setup do banco de dados Supabase
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tvslxvrzskhxjnrxzjzu/sql
-- ================================================================

-- Tabela de licenças
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text UNIQUE NOT NULL,
  email text,
  name text,
  status text NOT NULL DEFAULT 'active',
  max_devices int DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Tabela de sessões por dispositivo
CREATE TABLE IF NOT EXISTS license_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL REFERENCES licenses(license_key) ON DELETE CASCADE,
  device_id text NOT NULL,
  session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  UNIQUE(license_key, device_id)
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- ================================================================
-- Row Level Security
-- ================================================================

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total via service_role (o proxy usa service_role)
CREATE POLICY "service_role_all_licenses" ON licenses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_sessions" ON license_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_notifications" ON notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permitir leitura de notificações para anon
CREATE POLICY "anon_read_notifications" ON notifications
  FOR SELECT TO anon USING (active = true);

-- ================================================================
-- Inserir uma licença de teste
-- ================================================================

INSERT INTO licenses (license_key, email, name, status, max_devices)
VALUES ('TEST-LICENSE-001', 'admin@example.com', 'Teste', 'active', 10)
ON CONFLICT (license_key) DO NOTHING;
