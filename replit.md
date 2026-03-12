# Lovable Infinite - Browser Extension + Backend Proxy

## Overview
Chrome browser extension "Lovable Infinite" (v1.0.12) com servidor proxy backend conectado ao Supabase.

## Arquitetura
O servidor (`serve.js`) faz duas coisas:
1. **Serve os arquivos estáticos** da extensão (index.html, assets/)
2. **Proxy de API** — imita os endpoints do `lovable.tentalus.qzz.io` usando o Supabase como banco de dados

## Banco de Dados (Supabase)
- **URL:** https://tvslxvrzskhxjnrxzjzu.supabase.co
- **Tabelas:**
  - `licenses` — licenças dos usuários (license_key, email, name, status, max_devices, expires_at)
  - `license_sessions` — sessões ativas por dispositivo
  - `notifications` — notificações que aparecem na extensão

## Endpoints da API
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/license/validate` | Valida licença e cria sessão |
| POST | `/api/license/revalidate` | Revalida sessão existente |
| POST | `/api/license-prompt` | Enhance de prompt |
| POST | `/api/notifications` | Busca notificações ativas |
| POST | `/api/check-version` | Verifica versão |
| WS | `/ws` | WebSocket socket.io para auth em tempo real |

## Como gerenciar licenças
Acesse o Supabase Dashboard > Table Editor > `licenses`:

**Adicionar licença:**
```sql
INSERT INTO licenses (license_key, email, name, status, max_devices)
VALUES ('CHAVE-AQUI', 'email@exemplo.com', 'Nome', 'active', 3);
```

**Desativar licença:**
```sql
UPDATE licenses SET status = 'inactive' WHERE license_key = 'CHAVE-AQUI';
```

**Ver sessões ativas:**
```sql
SELECT * FROM license_sessions WHERE active = true;
```

## Estrutura de arquivos
- `serve.js` — servidor principal (Express + Socket.IO + Supabase)
- `database/setup.sql` — SQL para criar as tabelas
- `assets/` — bundles compilados da extensão (Vite)
- `manifest.json` — manifesto da extensão Chrome (v3)
- `background.js` — service worker da extensão
- `content.js` — script injetado no lovable.dev

## Variáveis de ambiente
- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_ANON_KEY` — chave anon pública
- `SUPABASE_SERVICE_KEY` — chave service_role (admin)
