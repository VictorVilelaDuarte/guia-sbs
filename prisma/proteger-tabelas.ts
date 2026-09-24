/**
 * Segurança: fecha a API REST automática do Supabase para as tabelas do app
 *
 * O Supabase publica uma API REST (PostgREST) para o schema `public`. Com RLS
 * desligado e as permissões padrão, quem tiver a chave pública (anon key) lê e
 * altera qualquer tabela por ela — inclusive users, clientes e pedidos.
 *
 * O app NÃO usa essa API: acessa o banco pelo Prisma como `postgres` (papel com
 * BYPASSRLS — o RLS não o afeta) e o storage pela service_role key. Então fechar
 * a API não muda nada no app.
 *
 * O que faz (idempotente — pode rodar quantas vezes quiser):
 *   1. liga o RLS em todas as tabelas de `public`, SEM políticas (nega tudo
 *      para anon/authenticated);
 *   2. revoga as permissões de anon/authenticated em tabelas e sequências de
 *      `public`, e o padrão para objetos futuros (segunda camada: se alguém
 *      desligar o RLS de uma tabela por engano, a porta continua fechada);
 *   3. instala um event trigger que faz 1 e 2 em toda tabela criada daqui em
 *      diante (db:push, scripts) — assim tabela nova não nasce aberta.
 *
 * Rodar com a conexão DIRETA (DIRECT_URL, porta 5432) — o pooler trava DDL.
 * Rodar: npx tsx prisma/proteger-tabelas.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL })

// Papéis da API REST do Supabase. Fora do Supabase (ex.: Postgres local) eles
// podem não existir — então cada comando só roda para os papéis que existem.
const PAPEIS_API = ["anon", "authenticated"]

async function main() {
  const existentes = (
    await prisma.$queryRaw<{ rolname: string }[]>`SELECT rolname FROM pg_roles WHERE rolname = ANY(${PAPEIS_API})`
  ).map((r) => r.rolname)
  const papeis = existentes.map((r) => `"${r}"`).join(", ")

  // 1. RLS em todas as tabelas
  const tabelas = await prisma.$queryRaw<{ tabela: string; rls: boolean }[]>`
    SELECT c.relname AS tabela, c.relrowsecurity AS rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`
  let ligadas = 0
  for (const t of tabelas) {
    if (t.rls) continue
    await prisma.$executeRawUnsafe(`ALTER TABLE public."${t.tabela}" ENABLE ROW LEVEL SECURITY`)
    ligadas++
  }
  console.log(`1. RLS: ${tabelas.length} tabela(s) em public — ${ligadas} ligada(s) agora, ${tabelas.length - ligadas} já estavam.`)

  // 2. Permissões dos papéis da API (atuais e padrão para objetos futuros)
  if (papeis) {
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${papeis}`)
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${papeis}`)
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${papeis}`)
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM ${papeis}`)
    console.log(`2. Permissões de ${existentes.join(" e ")} revogadas (tabelas, sequências e padrão para as futuras).`)
  } else {
    console.log("2. Papéis anon/authenticated não existem neste banco — nada a revogar.")
  }

  // 3. Event trigger para tabelas futuras. Função num schema próprio (fora do
  //    `public`, que a API REST expõe).
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS interno`)
    await prisma.$executeRawUnsafe(`REVOKE ALL ON SCHEMA interno FROM PUBLIC`)
    const revogarNovos = papeis
      ? `EXECUTE format('REVOKE ALL ON %s FROM ${existentes.join(", ")}', obj.object_identity);`
      : ""
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION interno.proteger_tabela_nova() RETURNS event_trigger
      LANGUAGE plpgsql AS $$
      DECLARE obj record;
      BEGIN
        FOR obj IN
          SELECT * FROM pg_event_trigger_ddl_commands()
          WHERE object_type = 'table' AND schema_name = 'public'
        LOOP
          EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
          ${revogarNovos}
        END LOOP;
      END $$`)
    await prisma.$executeRawUnsafe(`DROP EVENT TRIGGER IF EXISTS proteger_tabelas_novas`)
    await prisma.$executeRawUnsafe(`
      CREATE EVENT TRIGGER proteger_tabelas_novas ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      EXECUTE FUNCTION interno.proteger_tabela_nova()`)
    console.log("3. Gatilho automático instalado: toda tabela nova em public nasce com RLS ligado e sem acesso pela API.")
  } catch (e) {
    console.log(
      `3. ⚠️ Não foi possível instalar o gatilho automático (${(e as Error).message.split("\n").pop()}). ` +
        "As tabelas atuais estão protegidas; rode este script depois de cada db:push que criar tabela.",
    )
  }

  // Conferência
  const [r] = await prisma.$queryRaw<{ total: bigint; com_rls: bigint }[]>`
    SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c.relrowsecurity) AS com_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`
  const [g] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = ANY(${PAPEIS_API})`
  console.log(`\n✅ ${r.com_rls}/${r.total} tabelas com RLS · ${g.n} permissão(ões) restante(s) para anon/authenticated.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
