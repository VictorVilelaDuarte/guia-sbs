# Deploy e ambiente de produção

> Conferido no ar em **2026-09-23**. Este documento descreve como o projeto chega aos
> visitantes hoje — não um plano futuro.

## Como funciona hoje

| O quê | Onde |
|---|---|
| Hospedagem | Vercel, projeto `guia-sbs` (time `vvictor-projects`) |
| Produção | `https://guia-sbs.vercel.app` (sem domínio próprio) |
| Publicação | **Automática a cada push na `main`** |
| Banco | Supabase — **o mesmo do `.env` local** (pooler 6543) |

**Não existe ambiente de desenvolvimento separado.** O `.env` local aponta para o banco de
produção, onde convivem a loja real (`Chão Bento`), a demo (`Cantinho da Serra`) e os
cadastros de teste. Consequências práticas:

- `npm run db:push` e os scripts `prisma/migrate-*.ts` alteram **produção** — rodar só com
  intenção, e lembrar que o Prisma aplica DDL sem janela de manutenção.
- `npx tsx prisma/seed-demo.ts` **recria os usuários da demo com ids novos** e derruba a
  sessão de quem estiver logado nela. Nunca rodar sem avisar.
- Todo push na `main` publica na hora. Não há passo manual de deploy.

## Estado das migrações

Tudo da Fase 3 (PDV, comandas, pagamentos, relatórios, QR na mesa, complementos, planta do
salão) **já está aplicado**, e os backfills não têm pendência — conferido por consulta
direta ao banco em 2026-09-23:

| Verificação | Resultado |
|---|---|
| Tabelas `pedido_pagamentos`, `mesas`, `chamados_mesa`, complementos | existem |
| Colunas `fechadaEm`, `mesaId`, `divisao`, `taxaServicoPct`, `posX`/`posY`, flags `mesaQr*` | existem |
| Flags `gestao_relatorios` / `gestao_clientes` / `gestao_equipe` no plano Premium | ligadas |
| Pedidos `CONCLUIDO` sem pagamento registrado | 0 de 253 |
| Pedidos terminais sem `fechadaEm` | 0 |
| Comércios sem vínculo em `ComercioMembro` | 0 |

Os scripts de backfill (`migrate-pagamentos-pedidos.ts`, `migrate-fechada-em.ts`,
`migrate-clientes-pedidos.ts`, `migrate-membros-dono.ts`, `migrate-flag-*.ts`) são
idempotentes e podem ser rodados de novo sem estrago, mas hoje não têm o que fazer.

## Variáveis de ambiente na Vercel (Production)

Configuradas: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Pendências conhecidas (adiadas por decisão do dono em 2026-09-23)

**1. `NEXT_PUBLIC_SITE_URL` não está definida.** `SITE_URL` (`src/lib/seo/site.ts`) cai no
fallback `http://localhost:3000`, então em produção:

```
/robots.txt   → Sitemap: http://localhost:3000/sitemap.xml
/sitemap.xml  → <loc>http://localhost:3000</loc>
```

Afeta sitemap, `robots`, canonical, OG images e JSON-LD (o Google não aproveita nada
disso) e o **QR das mesas**, que imprime adesivo apontando para localhost. Decisão: esperar
o domínio definitivo. Ao definir o domínio, a ordem é **setar a variável → redeploy →
gerar os QR**, nessa ordem — adesivo impresso antes fica inutilizável.

**2. Chaves VAPID ausentes** (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`). Sem push de pedido novo para o comerciante; o alerta sonoro com o painel
aberto continua funcionando. Gerar o par com:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

**3. Demo e cadastros de teste públicos.** `Cantinho da Serra`, `Sabor da Serra` e
`Hospedagem teste` estão `ATIVO` e aparecem no guia público (listagens, mapa, sitemap) ao
lado da loja real. Para tirar do ar sem perder os dados, basta mudar `status` para
`INATIVO` — o painel deles continua acessível para demonstração.

## Ambiente novo (do zero)

Ordem para um Supabase vazio, reunindo o que está espalhado pelo `CLAUDE.md`:

1. `npm run db:push`
2. `npx tsx prisma/seed.ts` (super admin) e, se quiser, `npx tsx prisma/seed-bairros.ts`
3. `npx tsx prisma/migrate-membros-dono.ts`
4. `npx tsx prisma/migrate-flag-gestao-equipe.ts`
5. `npx tsx prisma/migrate-flag-gestao-clientes.ts`
6. `npx tsx prisma/migrate-flag-gestao-relatorios.ts`
7. publicar o código
8. `npx tsx prisma/migrate-clientes-pedidos.ts`, `migrate-pagamentos-pedidos.ts`,
   `migrate-fechada-em.ts` (backfills — depois de publicar, para pegar registros criados
   pelo código antigo)

`prisma/migrate-dinheiro-decimal.ts` e `migrate-unify-produto.ts` são migrações históricas
de tipo de coluna: só para bancos anteriores a elas, **nunca** via `db:push`.
