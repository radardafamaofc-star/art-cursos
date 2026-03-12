const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tvslxvrzskhxjnrxzjzu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2c2x4dnJ6c2toeGpucnh6anp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI5MjUxOCwiZXhwIjoyMDg4ODY4NTE4fQ.vtgdTY_yQfA6tXcgBsjwjY-viNtS6dWa7bYl98UFn9I';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2c2x4dnJ6c2toeGpucnh6anp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTI1MTgsImV4cCI6MjA4ODg2ODUxOH0._WpVHFgSlDYSPBDk6deBNsjWCtGPJ46y2Am933pv4WI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function setupDatabase() {
  console.log('Setting up database tables...');

  const tables = [
    {
      name: 'licenses',
      sql: `
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
      `
    },
    {
      name: 'license_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS license_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          license_key text NOT NULL,
          device_id text NOT NULL,
          session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
          created_at timestamptz DEFAULT now(),
          last_seen_at timestamptz DEFAULT now(),
          active boolean DEFAULT true,
          UNIQUE(license_key, device_id)
        );
      `
    },
    {
      name: 'notifications',
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          type text NOT NULL DEFAULT 'info',
          title text NOT NULL,
          message text NOT NULL,
          active boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          expires_at timestamptz
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_ddl', { ddl: table.sql });
      if (error && !error.message.includes('already exists')) {
        console.log(`Table ${table.name}: trying direct insert check...`);
        const { error: checkError } = await supabase.from(table.name).select('id').limit(1);
        if (checkError && checkError.code === 'PGRST205') {
          console.error(`Table ${table.name} does not exist and could not be created:`, checkError.message);
        } else {
          console.log(`Table ${table.name}: OK`);
        }
      } else {
        console.log(`Table ${table.name}: ready`);
      }
    } catch (e) {
      console.log(`Table ${table.name} setup skipped:`, e.message);
    }
  }

  const { error: checkErr } = await supabase.from('licenses').select('id').limit(1);
  if (checkErr && checkErr.code === 'PGRST205') {
    console.error('\n⚠️  IMPORTANT: Tables do not exist yet.');
    console.error('Please run the SQL from database/setup.sql in your Supabase SQL Editor.\n');
  } else {
    console.log('✅ Database tables verified.');
  }
}

async function validateLicense(licenseKey, deviceId, createSession = false) {
  if (!licenseKey) return { valid: false, error: 'No license key' };

  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .single();

  if (error || !license) return { valid: false, error: 'License not found' };
  if (license.status !== 'active') return { valid: false, error: 'License inactive' };
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return { valid: false, error: 'License expired' };
  }

  let sessionToken = null;

  if (deviceId) {
    const { data: sessions } = await supabase
      .from('license_sessions')
      .select('*')
      .eq('license_key', licenseKey)
      .eq('active', true);

    const existingSession = sessions?.find(s => s.device_id === deviceId);

    if (existingSession) {
      await supabase.from('license_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existingSession.id);
      sessionToken = existingSession.session_token;
    } else if (createSession) {
      const activeCount = sessions?.length || 0;
      if (activeCount >= (license.max_devices || 3)) {
        return { valid: false, error: 'Max devices reached' };
      }
      const newToken = crypto.randomUUID();
      const { data: newSession } = await supabase.from('license_sessions').insert({
        license_key: licenseKey,
        device_id: deviceId,
        session_token: newToken
      }).select().single();
      sessionToken = newSession?.session_token || newToken;
    }
  }

  return {
    valid: true,
    sessionToken,
    license: {
      key: license.license_key,
      status: license.status,
      email: license.email,
      name: license.name,
      maxDevices: license.max_devices
    }
  };
}

async function validateSession(licenseKey, sessionToken, deviceId) {
  if (!licenseKey || !sessionToken) return { valid: false };

  const { data: session } = await supabase
    .from('license_sessions')
    .select('*')
    .eq('license_key', licenseKey)
    .eq('session_token', sessionToken)
    .eq('active', true)
    .single();

  if (!session) return { valid: false };

  await supabase.from('license_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', session.id);

  const licResult = await validateLicense(licenseKey, deviceId || session.device_id, false);
  return { valid: licResult.valid, sessionToken };
}

// ============================================================
// API ROUTES (imita lovable.tentalus.qzz.io)
// ============================================================

// License validate / create session
app.post('/api/license/validate', async (req, res) => {
  try {
    const { licenseKey, deviceId, action, create_session } = req.body;
    console.log(`[license/validate] key=${licenseKey?.substring(0,8)}... action=${action}`);

    const result = await validateLicense(licenseKey, deviceId, create_session || action === 'activate');
    res.json(result);
  } catch (e) {
    console.error('[license/validate] error:', e.message);
    res.json({ valid: false, error: e.message });
  }
});

// Session revalidation
app.post('/api/license/revalidate', async (req, res) => {
  try {
    const { licenseKey, sessionToken, deviceId } = req.body;
    const result = await validateSession(licenseKey, sessionToken, deviceId);
    res.json(result);
  } catch (e) {
    res.json({ valid: false });
  }
});

// Valid session URL
app.post('/api/license/nse/validate', async (req, res) => {
  try {
    const { licenseKey, sessionToken, deviceId } = req.body;
    const result = await validateSession(licenseKey, sessionToken, deviceId);
    res.json(result);
  } catch (e) {
    res.json({ valid: false });
  }
});

// Also handle the obfuscated path variant
app.post('/license/validate', async (req, res) => {
  try {
    const { licenseKey, sessionToken, deviceId, action, create_session } = req.body;
    if (sessionToken) {
      const result = await validateSession(licenseKey, sessionToken, deviceId);
      return res.json(result);
    }
    const result = await validateLicense(licenseKey, deviceId, create_session || action === 'activate');
    res.json(result);
  } catch (e) {
    res.json({ valid: false });
  }
});

// Prompt enhance
app.post('/api/license-prompt', async (req, res) => {
  try {
    const { licenseKey, sessionToken, prompt } = req.body;
    const sessionResult = await validateSession(licenseKey, sessionToken, null);
    if (!sessionResult.valid) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    // Return enhanced prompt (pass-through, enhancement is optional)
    res.json({ enhancedPrompt: prompt, success: true });
  } catch (e) {
    res.json({ enhancedPrompt: req.body.prompt || '', success: true });
  }
});

// Notifications
app.post('/api/notifications', async (req, res) => {
  try {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({ notifications: notifs || [], success: true });
  } catch (e) {
    res.json({ notifications: [], success: true });
  }
});

// Check version
app.post('/api/check-version', async (req, res) => {
  try {
    res.json({ upToDate: true, latestVersion: '1.0.12', success: true });
  } catch (e) {
    res.json({ upToDate: true });
  }
});

// Proxy webhook / message
app.post('/api/proxy-webhook', async (req, res) => {
  try {
    const { licenseKey, sessionToken } = req.body;
    const sessionResult = await validateSession(licenseKey, sessionToken, null);
    if (!sessionResult.valid) return res.status(401).json({ error: 'Invalid session' });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// Catch-all API routes
app.post('/api/*path', async (req, res) => {
  console.log(`[API catch-all] POST ${req.path}`, JSON.stringify(req.body).substring(0, 100));
  res.json({ success: true });
});
app.get('/api/*path', async (req, res) => {
  res.json({ success: true });
});

// ============================================================
// SOCKET.IO (imita WebSocket do lovable.tentalus.qzz.io)
// ============================================================
const io = new SocketIOServer(httpServer, {
  path: '/ws',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  const { licenseKey, deviceId } = socket.handshake.auth || {};
  console.log(`[WS] connection attempt key=${licenseKey?.substring(0,8)}...`);

  if (!licenseKey) {
    socket.emit('auth-error', { message: 'No license key' });
    socket.disconnect();
    return;
  }

  validateLicense(licenseKey, deviceId, false).then(result => {
    if (result.valid) {
      console.log(`[WS] auth-success for key=${licenseKey.substring(0,8)}...`);
      socket.emit('auth-success', {
        valid: true,
        sessionToken: result.sessionToken,
        license: result.license
      });

      socket.on('validate', (data, callback) => {
        validateSession(licenseKey, data?.sessionToken, deviceId).then(r => {
          if (callback) callback(r);
          else socket.emit('validate-result', r);
        });
      });

      socket.on('disconnect', () => {
        console.log(`[WS] disconnected key=${licenseKey.substring(0,8)}...`);
      });
    } else {
      console.log(`[WS] auth-failed for key=${licenseKey.substring(0,8)}...: ${result.error}`);
      socket.emit('auth-error', { message: result.error });
      socket.disconnect();
    }
  }).catch(e => {
    socket.emit('auth-error', { message: e.message });
    socket.disconnect();
  });
});

// ============================================================
// STATIC FILES (extensão)
// ============================================================
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
};

app.get('*path', (req, res) => {
  let filePath = '.' + req.path;
  if (filePath === './' || filePath === '.') filePath = './index.html';

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') { res.status(404).end('Not Found'); }
      else { res.status(500).end('Server Error'); }
    } else {
      res.setHeader('Content-Type', contentType);
      res.end(content);
    }
  });
});

// ============================================================
// START
// ============================================================
setupDatabase().then(() => {
  httpServer.listen(PORT, HOST, () => {
    console.log(`\n✅ Lovable Infinite Backend + Static Server`);
    console.log(`   Running at http://${HOST}:${PORT}/`);
    console.log(`   Supabase: ${SUPABASE_URL}`);
    console.log(`   WebSocket path: /ws\n`);
  });
}).catch(e => {
  console.error('Setup error:', e);
  httpServer.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/ (DB setup failed)`);
  });
});
