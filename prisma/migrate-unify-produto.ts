/**
 * Migração: unifica CardapioItem → Produto
 *
 * Cada CardapioItem vira um Produto com o mesmo ID (para preservar o
 * vínculo com CardapioVariacao sem precisar remapear chaves).
 * Depois, CardapioVariacao.produtoId recebe o valor de itemId.
 *
 * Rodar: npx tsx prisma/migrate-unify-produto.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔍 Buscando CardapioItens...")

  const itens = await prisma.$queryRaw<
    {
      id: string
      titulo: string
      descricao: string | null
      preco: number | null
      imagens: string[]
      disponivel: boolean
      ordem: number
      categoriaId: string
      comercioId: string
      createdAt: Date
      updatedAt: Date
    }[]
  >`SELECT * FROM cardapio_itens ORDER BY "createdAt"`

  console.log(`📦 ${itens.length} itens encontrados.`)

  if (itens.length === 0) {
    console.log("✅ Nada a migrar.")
    return
  }

  // Verifica conflito de IDs (improvável com cuid, mas seguro checar)
  const ids = itens.map((i) => i.id)
  const conflitos = await prisma.produto.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })

  if (conflitos.length > 0) {
    throw new Error(
      `❌ Conflito de IDs detectado: ${conflitos.map((c) => c.id).join(", ")}. Abortando.`
    )
  }

  console.log("🔄 Migrando itens para a tabela produtos...")

  await prisma.$transaction(async (tx) => {
    for (const item of itens) {
      await tx.$executeRaw`
        INSERT INTO produtos (id, titulo, descricao, preco, imagens, disponivel, ordem, "comercioId", "categoriaCardapioId", "createdAt", "updatedAt")
        VALUES (
          ${item.id},
          ${item.titulo},
          ${item.descricao},
          ${item.preco},
          ${item.imagens},
          ${item.disponivel},
          ${item.ordem},
          ${item.comercioId},
          ${item.categoriaId},
          ${item.createdAt},
          ${item.updatedAt}
        )
      `
    }

    console.log("🔗 Atualizando CardapioVariacao.produtoId...")
    await tx.$executeRaw`
      UPDATE cardapio_variacoes
      SET "produtoId" = "itemId"
      WHERE "itemId" IS NOT NULL
    `
  })

  console.log("✅ Migração concluída com sucesso!")
  console.log(`   ${itens.length} produtos criados a partir de CardapioItens`)
  console.log("   CardapioVariacoes vinculadas aos novos Produtos")
}

main()
  .catch((e) => {
    console.error("❌ Erro na migração:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
