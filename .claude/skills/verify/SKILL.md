---
name: verify
description: Receita para verificar mudanças do Guia SBS de ponta a ponta com o app rodando (build de produção, login via NextAuth REST, drive de páginas e APIs).
---

# Verificar o Guia SBS em runtime

## Build e servidor

```bash
npm run build
pkill -f "next start"   # SEMPRE matar antes — EADDRINUSE deixa o servidor velho servindo build antigo
npm start > /tmp/server.log 2>&1 &   # porta 3000; logs de erro SSR aparecem aqui
```

Gotcha: se `npm start` falhar com EADDRINUSE, o teste roda contra o build **antigo**
sem nenhum aviso. Confirmar com `head /tmp/server.log` que o servidor novo subiu.

## Login via REST (NextAuth v5 Credentials)

```bash
CSRF=$(curl -s -c jar.txt http://localhost:3000/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
curl -s -b jar.txt -c jar.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "csrfToken=$CSRF" -d "email=admin@guiasbs.com.br" -d "password=admin123"
# 302 + cookie authjs.session-token no jar = logado
```

Super admin do seed: `admin@guiasbs.com.br` / `admin123` (banco de dev).

## Dados de teste

Consultar/criar direto no banco de dev com Prisma standalone (rodar da raiz do projeto):

```bash
node --env-file=.env --input-type=module -e '
import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
// ... consultas/criação; sempre deletar o que criar ao final
await p.$disconnect()'
```

Para fluxos de comerciante, criar um usuário temporário (role COMERCIANTE, senha via
bcryptjs) + comércio mínimo (`categorias: ["COMERCIO"]`, `status: "ATIVO"`, planId de
`plan.findFirst()`), e **deletar ambos ao final**. Uploads de teste vão pro Supabase
Storage — deletar via REST: `DELETE {SUPABASE_URL}/storage/v1/object/comercios/{path}`
com `Authorization: Bearer {SERVICE_ROLE_KEY}`.

## Fluxos que valem dirigir

- Página gerenciar do admin: `GET /admin/comercios/{id}/gerenciar` (seta cookie
  `admin_comercio_id`; as APIs `/api/comerciante/*` resolvem o comércio por ele).
- APIs do comerciante com os dois perfis (admin+cookie e comerciante) — conferir que
  cada um enxerga o comércio certo via `GET /api/comerciante/comercio` (campo `nome`).
- Erros de SSR só aparecem no build de produção (`next start`), não no dev — módulos
  que tocam `window` na carga (ex.: heic2any) passam batido no `next dev`.
