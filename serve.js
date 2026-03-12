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
// PROXY WEBHOOK — forward to Lovable with credit-bypass tag
// ============================================================

// Magic tag appended to every message — Lovable detects this and skips billing
const BYPASS_TAG = ' <details><summary>⚙️ </summary> </details>';

async function forwardToLovable(payload) {
  const { message, projectId, token, files } = payload || {};
  if (!token || !projectId || !message) {
    console.log(`[proxy] missing: token=${!!token} project=${!!projectId} message=${!!message}`);
    return { success: false, reason: 'missing params' };
  }

  // Append the bypass tag exactly as the original server did
  const patchedMessage = message + BYPASS_TAG;

  console.log(`[proxy] → Lovable /chat: project=${projectId} msg="${message.substring(0,50)}" (bypass tag appended)`);

  const url = `https://api.lovable.dev/projects/${projectId}/chat`;
  const body = {
    id: generateLovableId('umsg'),
    ai_message_id: generateLovableId('aimsg'),
    message: patchedMessage,
    files: files || [],
    chat_only: false,
    client_logs: [],
    current_page: '/',
    current_viewport_dpr: 1,
    current_viewport_height: 887,
    current_viewport_width: 582,
    integration_metadata: { preview_viewport_width: 582, preview_viewport_height: 887, is_logged_out: false },
    model: null,
    network_requests: [],
    optimisticImageUrls: [],
    runtime_errors: [],
    selected_elements: [],
    session_replay: '[]',
    thread_id: 'main',
    view: 'preview',
    view_description: 'The user is currently viewing the preview.',
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://lovable.dev',
        'Referer': `https://lovable.dev/projects/${projectId}`,
        'x-client-git-sha': 'b8b07b9f4b4ea48a8dfdca5721b369',
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    console.log(`[proxy] Lovable ${resp.status}: ${text.substring(0, 200)}`);

    if (resp.ok) {
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}
      const reply = data.message || data.response || data.content || data.text || null;
      return { success: true, reply };
    }

    return { success: false, reason: `http_${resp.status}`, details: text.substring(0, 150) };
  } catch (err) {
    console.log(`[proxy] error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

function generateLovableId(prefix) {
  const chars = '0123456789abcdefghjkmnpqrstvwxyz';
  let tsStr = '';
  let t = Date.now();
  for (let i = 0; i < 10; i++) { tsStr = chars[t % 32] + tsStr; t = Math.floor(t / 32); }
  let rand = '';
  for (let i = 0; i < 16; i++) rand += chars[Math.floor(Math.random() * 32)];
  return `${prefix}_${tsStr}${rand}`;
}

// ============================================================
// OWN AI — fallback if Lovable call fails (uses GROQ_API_KEY or OPENAI_API_KEY)
// ============================================================

async function callAI(message, files) {
  const groqKey   = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let apiUrl, apiKey, model, headers;
  if (groqKey) {
    apiUrl  = 'https://api.groq.com/openai/v1/chat/completions';
    apiKey  = groqKey;
    model   = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    headers = { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' };
    console.log('[ai] using Groq:', model);
  } else if (openaiKey) {
    apiUrl  = 'https://api.openai.com/v1/chat/completions';
    apiKey  = openaiKey;
    model   = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    headers = { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' };
    console.log('[ai] using OpenAI:', model);
  } else {
    console.log('[ai] no AI key configured (set GROQ_API_KEY or OPENAI_API_KEY)');
    return { text: 'Nenhuma IA configurada. Adicione GROQ_API_KEY (grátis) ou OPENAI_API_KEY nas variáveis do Railway.', changes: [] };
  }

  const MAX_FILES = 10;
  const MAX_CHARS = 40000;
  let fileContext = '';
  let charCount = 0;
  for (const f of (files || []).slice(0, MAX_FILES)) {
    const filePath = f.path || f.name || 'unknown';
    const content  = f.content || '';
    const snippet  = `\n### ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
    if (charCount + snippet.length > MAX_CHARS) break;
    fileContext += snippet;
    charCount   += snippet.length;
  }

  const systemPrompt = `You are an expert web developer assistant. Given project files and a user request, respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "text": "Brief explanation of changes (in the same language as the user's request)",
  "changes": [
    {"path": "relative/path/file.ext", "content": "COMPLETE new file content"}
  ]
}
Rules:
- Always include COMPLETE file content for each changed file (no diffs, no partial updates)
- Only include files that actually need to change
- If no file changes needed (question/clarification), return empty changes array and answer in "text"
- Match the coding style of the existing project files`;

  const userPrompt = fileContext
    ? `Project files:${fileContext}\n\nUser request: ${message}`
    : `User request: ${message}`;

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 8192,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.log(`[ai] error ${resp.status}: ${err.substring(0, 200)}`);
      return { text: `Erro na IA (${resp.status}). Verifique sua API key.`, changes: [] };
    }

    const data    = await resp.json();
    const raw     = data.choices?.[0]?.message?.content || '{}';
    const parsed  = JSON.parse(raw);
    console.log(`[ai] reply="${(parsed.text || '').substring(0, 80)}" changes=${(parsed.changes || []).length}`);
    return { text: parsed.text || '', changes: parsed.changes || [] };
  } catch (err) {
    console.log('[ai] error:', err.message);
    return { text: `Erro interno: ${err.message}`, changes: [] };
  }
}

async function applyChanges(projectId, token, commitMessage, changes) {
  if (!changes || changes.length === 0) return true;
  const url  = `https://api.lovable.dev/projects/${projectId}`;
  const body = {
    changes: changes.map(c => ({ path: c.path, content: c.content })),
    uploads: [],
    commit_message: (commitMessage || 'update').substring(0, 72),
    file_edit_type: 'full',
  };
  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'accept': '*/*',
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'x-client-git-sha': 'b8b07b9f4b4ea48a8dfdca5721b369',
      },
      body: JSON.stringify(body),
    });
    const txt = await resp.text();
    console.log(`[apply] PUT ${url} → ${resp.status}: ${txt.substring(0, 100)}`);
    return resp.ok;
  } catch (err) {
    console.log('[apply] error:', err.message);
    return false;
  }
}

// ============================================================
// API ROUTES (imita lovable.tentalus.qzz.io)
// ============================================================

// License validate / create session
app.post('/api/license/validate', async (req, res) => {
  try {
    const { licenseKey, deviceId, action, create_session, payload, sessionToken } = req.body;
    console.log(`[license/validate] key=${licenseKey?.substring(0,8)}... action=${action}`);

    if (action === 'proxy_webhook' && payload) {
      const result = await forwardToLovable(payload);
      return res.json({ success: true, ...result });
    }

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

// Valid session URL — also handles action-based requests (proxy_webhook, etc.)
app.post('/api/license/nse/validate', async (req, res) => {
  try {
    const { licenseKey, sessionToken, deviceId, action, payload } = req.body;

    // Validate session first
    const sessionResult = await validateSession(licenseKey, sessionToken, deviceId);

    if (action === 'proxy_webhook' && payload) {
      // Forward the prompt to the Lovable API on behalf of the user
      const { message, projectId, token, files } = payload;
      if (!token || !projectId) {
        return res.json({ success: true, sessionValid: sessionResult.valid });
      }

      let lovableResult = null;
      const lovableEndpoints = [
        `https://api.lovable.dev/api/projects/${projectId}/messages`,
        `https://api.lovable.dev/projects/${projectId}/messages`,
        `https://api.lovable.dev/api/projects/${projectId}/chat`,
      ];

      for (const endpoint of lovableEndpoints) {
        try {
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: message, message, files: files || [] }),
          });
          if (resp.ok) {
            lovableResult = await resp.json().catch(() => ({}));
            console.log(`[proxy_webhook] success via ${endpoint}`);
            break;
          } else {
            console.log(`[proxy_webhook] ${endpoint} → ${resp.status}`);
          }
        } catch (err) {
          console.log(`[proxy_webhook] ${endpoint} failed: ${err.message}`);
        }
      }

      return res.json({ success: true, sessionValid: sessionResult.valid, result: lovableResult });
    }

    res.json(sessionResult);
  } catch (e) {
    console.error('[nse/validate] error:', e.message);
    res.json({ valid: false });
  }
});

// Also handle the obfuscated path variant
app.post('/license/validate', async (req, res) => {
  try {
    const { licenseKey, sessionToken, deviceId, action, create_session, payload } = req.body;

    if (action === 'proxy_webhook' && payload) {
      const result = await forwardToLovable(payload);
      return res.json({ success: true, ...result });
    }

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

// MAIN SEND-PROMPT endpoint — this is vt.FUNCTION_URL called by the extension
app.post('/api/license/send-prompt', async (req, res) => {
  try {
    const { licenseKey, sessionToken, deviceId, action, payload } = req.body;
    console.log(`[send-prompt] key=${licenseKey?.substring(0,8)}... action=${action}`);

    if (action === 'proxy_webhook' && payload) {
      const result = await forwardToLovable(payload);
      return res.json(result);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[send-prompt] error:', e.message);
    res.json({ success: false, error: e.message });
  }
});

// Prompt enhance — also handles proxy_webhook if extension sends it here
app.post('/api/license-prompt', async (req, res) => {
  try {
    const { licenseKey, sessionToken, prompt, action, payload } = req.body;

    if (action === 'proxy_webhook' && payload) {
      const result = await forwardToLovable(payload);
      return res.json({ success: true, ...result });
    }

    // Return enhanced prompt (pass-through)
    res.json({ enhancedPrompt: prompt || '', success: true });
  } catch (e) {
    res.json({ enhancedPrompt: req.body?.prompt || '', success: true });
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
  const { action, payload } = req.body || {};
  console.log(`[API catch-all] POST ${req.path} action=${action}`, JSON.stringify(req.body).substring(0, 80));
  if (action === 'proxy_webhook' && payload) {
    const result = await forwardToLovable(payload);
    return res.json({ success: true, ...result });
  }
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

  validateLicense(licenseKey, deviceId, true).then(result => {
    if (result.valid) {
      const activeSessionToken = result.sessionToken;
      console.log(`[WS] auth-success for key=${licenseKey.substring(0,8)}... token=${activeSessionToken?.substring(0,8)}...`);
      socket.emit('auth-success', {
        valid: true,
        sessionToken: activeSessionToken,
        license: result.license
      });

      socket.on('validate', (data, callback) => {
        // Extension calls validate with {} (no sessionToken) — use the one from auth
        const tokenToCheck = data?.sessionToken || activeSessionToken;
        console.log(`[WS] validate called, token=${tokenToCheck?.substring(0,8)}...`);
        if (!tokenToCheck) {
          // No token at all — just check license is still active
          validateLicense(licenseKey, deviceId, false).then(r => {
            const resp = { valid: r.valid, sessionToken: activeSessionToken };
            if (callback) callback(resp);
            else socket.emit('validate-result', resp);
          });
          return;
        }
        validateSession(licenseKey, tokenToCheck, deviceId).then(r => {
          const resp = { ...r, sessionToken: r.valid ? tokenToCheck : undefined };
          if (callback) callback(resp);
          else socket.emit('validate-result', resp);
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
