/**
 * Migração: valores de pedidos de Float para DECIMAL(10,2)
 *
 * Fase 3 / PR 1 do módulo de gestão (docs/modulo-gestao.md §13.1).
 *
 * POR QUE NÃO `db:push`: trocar o tipo de coluna pelo push pode recriar a coluna
 * (perdendo os valores) ou exigir --accept-data-loss. Aqui a troca é um ALTER com
 * USING ROUND(col::numeric, 2), que converte no lugar.
 *
 * ORDEM DE DEPLOY: este script → `npm run db:push` (não deve encontrar diferença
 * nessas colunas) → publicar o código. Testado: o código anterior (client Float)
 * continua lendo e gravando normalmente nas colunas DECIMAL, então migrar antes de
 * publicar não quebra a produção.
 *
 * Idempotente: só altera colunas que ainda são `double precision`.
 * Conferência: imprime a soma de cada coluna (arredondada a centavos) antes e depois.
 * Rodar com a conexão DIRETA (DIRECT_URL, porta 5432) — o pooler trava DDL.
 *
 * Rodar: npx tsx prisma/migrate-dinheiro-decimal.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL })

const COLUNAS: [tabela: string, coluna: string][] = [
  ["pedidos", "subtotal"],
  ["pedidos", "taxaEntrega"],
  ["pedidos", "total"],
  ["pedidos", "trocoPara"],
  ["pedido_itens", "precoUnit"],
  ["pedido_configs", "pedidoMinimo"],
  ["zonas_entrega", "taxa"],
]

async function somas() {
  const out: Record<string, string> = {}
  for (const [t, c] of COLUNAS) {
    const [r] = await prisma.$queryRawUnsafe<{ soma: string | null; n: bigint }[]>(
      `SELECT ROUND(COALESCE(SUM("${c}"::numeric), 0), 2)::text AS soma, COUNT("${c}") AS n FROM "${t}"`,
    )
    out[`${t}.${c}`] = `${r.soma} (${r.n} valores)`
  }
  return out
}

async function main() {
  const tipos = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string; data_type: string }[]>(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
     WHERE table_schema = current_schema() AND (table_name, column_name) IN (${COLUNAS.map(([t, c]) => `('${t}','${c}')`).join(",")})`,
  )
  const pendentes = COLUNAS.filter(([t, c]) =>
    tipos.some((x) => x.table_name === t && x.column_name === c && x.data_type === "double precision"),
  )

  const antes = await somas()
  if (pendentes.length === 0) {
    console.log("✅ Todas as colunas já são DECIMAL — nada a fazer.")
    console.table(antes)
    return
  }

  console.log(`🔧 Convertendo ${pendentes.length} coluna(s): ${pendentes.map(([t, c]) => `${t}.${c}`).join(", ")}`)
  await prisma.$transaction(
    pendentes.map(([t, c]) =>
      prisma.$executeRawUnsafe(
        `ALTER TABLE "${t}" ALTER COLUMN "${c}" TYPE DECIMAL(10,2) USING ROUND("${c}"::numeric, 2)`,
      ),
    ),
  )
  const depois = await somas()

  console.log("Somas (arredondadas a centavos) antes → depois:")
  let divergente = false
  for (const k of Object.keys(antes)) {
    const igual = antes[k] === depois[k]
    if (!igual) divergente = true
    console.log(`  ${igual ? "✓" : "✗"} ${k}: ${antes[k]} → ${depois[k]}`)
  }
  if (divergente) {
    // Diferença só é esperada quando havia valor com 3+ casas (ex.: 33.335), que o
    // ROUND por linha arredonda individualmente. Conferir antes de publicar.
    console.warn("⚠️  Alguma soma mudou — confira os valores com mais de 2 casas decimais.")
    process.exitCode = 2
  } else {
    console.log("✅ Conversão concluída sem diferença nas somas.")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
