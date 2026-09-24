/**
 * Migração: "onde aparece" do produto — cardápio e catálogo independentes
 *
 * Antes: um produto estava no cardápio (tinha categoriaCardapioId) OU no catálogo
 * (não tinha), e `mostrarNaVitrine = false` o deixava só no PDV. Agora o catálogo
 * tem a própria chave, `noCatalogo`, e o mesmo produto pode estar nos dois.
 *
 * O que faz (uma vez — só quando a coluna `noCatalogo` ainda não existe):
 *   1. cria `produtos."noCatalogo"` (boolean, default false);
 *   2. marca `noCatalogo = true` em quem estava no catálogo — sem categoria do
 *      cardápio e com `mostrarNaVitrine = true`. Item do cardápio fica só no
 *      cardápio; item que estava "fora da vitrine" vira só PDV (nenhum dos dois)
 *      e perde a categoria do cardápio, se tinha (senão continuaria no cardápio
 *      público). Ninguém vê a loja mudar.
 *
 * Por que script e não `db:push`: o push criaria a coluna com o default para
 * todos, sem o preenchimento — por um instante todo item do catálogo sumiria.
 * Rodar de novo não faz nada (a coluna já existe), então não desfaz escolhas
 * feitas depois pelo comerciante.
 *
 * ORDEM DE DEPLOY: este script → publicar o código → `npm run db:push` (remove a
 * coluna antiga `mostrarNaVitrine`, que o código novo não usa; o código antigo
 * ainda a lê, por isso ela só sai depois da publicação).
 * Rodar com a conexão DIRETA (DIRECT_URL, porta 5432) — o pooler trava DDL.
 *
 * Rodar: npx tsx prisma/migrate-onde-aparece.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL })

async function colunaExiste(coluna: string) {
  const [r] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = ${coluna}`
  return Number(r.n) > 0
}

async function main() {
  if (await colunaExiste("noCatalogo")) {
    console.log("✓ Coluna produtos.noCatalogo já existe — nada a fazer.")
    return
  }
  const temMostrar = await colunaExiste("mostrarNaVitrine")

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`ALTER TABLE produtos ADD COLUMN "noCatalogo" BOOLEAN NOT NULL DEFAULT false`)
    const noCatalogo = await tx.$executeRawUnsafe(
      `UPDATE produtos SET "noCatalogo" = true
       WHERE "categoriaCardapioId" IS NULL ${temMostrar ? `AND "mostrarNaVitrine" = true` : ""}`,
    )
    const soPdv = temMostrar
      ? await tx.$executeRawUnsafe(
          `UPDATE produtos SET "categoriaCardapioId" = NULL WHERE "mostrarNaVitrine" = false AND "categoriaCardapioId" IS NOT NULL`,
        )
      : 0
    console.log(`✅ noCatalogo criada: ${noCatalogo} produto(s) no catálogo; ${soPdv} item(ns) do cardápio "fora da vitrine" viraram só PDV.`)
  })

  const [r] = await prisma.$queryRaw<{ cardapio: bigint; catalogo: bigint; so_pdv: bigint }[]>`
    SELECT COUNT(*) FILTER (WHERE "categoriaCardapioId" IS NOT NULL) AS cardapio,
           COUNT(*) FILTER (WHERE "noCatalogo") AS catalogo,
           COUNT(*) FILTER (WHERE "categoriaCardapioId" IS NULL AND NOT "noCatalogo") AS so_pdv
    FROM produtos`
  console.log(`   Agora: ${r.cardapio} no cardápio · ${r.catalogo} no catálogo · ${r.so_pdv} só no PDV`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
