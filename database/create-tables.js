/**
 * Script para criar as tabelas no Supabase
 * Execute: node database/create-tables.js
 * 
 * Ou execute o SQL manualmente em:
 * https://supabase.com/dashboard/project/tvslxvrzskhxjnrxzjzu/sql/new
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tvslxvrzskhxjnrxzjzu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS licenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key text UNIQUE NOT NULL,
    email text,
    name text,
    status text NOT NULL DEFAULT 'active',
    max_devices int DEFAULT 3,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    metadata jsonb DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS license_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key text NOT NULL,
    device_id text NOT NULL,
    session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    created_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    active boolean DEFAULT true,
    UNIQUE(license_key, device_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL DEFAULT 'info',
    title text NOT NULL,
    message text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
  )`,
  `ALTER TABLE licenses ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE license_sessions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'service_role_all_licenses') THEN
      CREATE POLICY "service_role_all_licenses" ON licenses FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_sessions' AND policyname = 'service_role_all_sessions') THEN
      CREATE POLICY "service_role_all_sessions" ON license_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'service_role_all_notifications') THEN
      CREATE POLICY "service_role_all_notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
];

async function createTables() {
  console.log('Creating tables via Supabase...\n');

  for (const sql of SQL_STATEMENTS) {
    try {
      const { error } = await supabase.rpc('exec_ddl', { statement: sql });
      if (error) throw error;
      console.log('✅', sql.split('\n')[0].trim().substring(0, 60));
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('⚠️  Already exists:', sql.split('\n')[0].trim().substring(0, 40));
      } else {
        console.log('ℹ️  (needs manual SQL):', e.message?.substring(0, 60));
      }
    }
  }

  console.log('\n--- Verificando tabelas ---');
  const tables = ['licenses', 'license_sessions', 'notifications'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log(`❌ ${t}: NÃO EXISTE - execute o SQL em database/setup.sql`);
    } else {
      console.log(`✅ ${t}: OK`);
    }
  }
}

createTables().catch(console.error);
