import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao, pode } from "@/lib/comercio-ctx"
import { negarLimiteCatalogo } from "@/lib/plan-limites"
import type { Permissao } from "@/lib/gestao/permissoes"
import { z } from "zod"
import { vincularGrupos } from "@/lib/gestao/complementos"
import { camposCadastroSchema, variacaoSchema } from "@/lib/produto-campos"
import { conflitoDeCodigos } from "@/lib/produtos-codigos"
import { deleteFile } from "@/lib/supabase-storage"


const patchSchema = z.object({
  tipo: z.enum(["PRODUTO", "SERVICO"]).optional(),
  titulo: z.string().min(1).max(120).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  preco: z.number().positive().optional().nullable(),
  imagens: z.array(z.string().url()).max(3).optional(),
  disponivel: z.boolean().optional(),
  destaque: z.boolean().optional(),
  precoPromo: z.number().positive().optional().nullable(),
  promoFim: z.string().datetime({ offset: true }).optional().nullable(),
  categoriaCardapioId: z.string().optional().nullable(),
  categoriaCatalogoId: z.string().optional().nullable(),
  variacoes: z.array(variacaoSchema).optional(),
  complementoIds: z.array(z.string()).max(10).optional(), // grupos de complementos do produto
  ...camposCadastroSchema, // códigos, marca, custo, unidade, onde aparece
})

// Cardápio e catálogo compartilham o model Produto: a permissão de edição
// depende de onde o item está — e, num PATCH que o move, de para onde vai.
function permissaoDeEdicao(categoriaCardapioId: string | null): Permissao {
  return categoriaCardapioId ? "cardapio:editar" : "catalogo:editar"
}

async function ownerCheck(produtoId: string) {
  const ctx = await getComercioCtx()
  if (!ctx) return null

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: {
      variacoes: { orderBy: { ordem: "asc" } },
    },
  })

  if (!produto || produto.comercioId !== ctx.comercioId) return null
  return { produto, ctx }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id)
  if (!check) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { produto, ctx } = check

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  // Só ligar/desligar a disponibilidade (botão Visível/Oculto) é liberado para
  // quem tem itens:disponibilidade (ex.: atendente). Qualquer outro campo exige
  // editar o cardápio/catálogo — na origem e no destino, se o item mudar de lugar.
  // Conta só os campos enviados: os opcionais com transform (códigos, marca)
  // podem voltar do Zod como chave com valor undefined.
  const enviados = Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  const soDisponibilidade = enviados.length === 1 && parsed.data.disponivel !== undefined
  if (!(soDisponibilidade && pode(ctx, "itens:disponibilidade"))) {
    const origem = permissaoDeEdicao(produto.categoriaCardapioId)
    const destino =
      parsed.data.categoriaCardapioId !== undefined
        ? permissaoDeEdicao(parsed.data.categoriaCardapioId)
        : origem
    const negado = negarSemPermissao(ctx, origem) ?? negarSemPermissao(ctx, destino)
    if (negado) return negado
  }

  if (parsed.data.categoriaCardapioId) {
    const categoria = await prisma.cardapioCategoria.findUnique({
      where: { id: parsed.data.categoriaCardapioId },
      select: { comercioId: true },
    })
    if (!categoria || categoria.comercioId !== produto.comercioId) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  if (parsed.data.categoriaCatalogoId) {
    const tipoAlvo = parsed.data.tipo ?? produto.tipo
    const categoria = await prisma.catalogoCategoria.findUnique({
      where: { id: parsed.data.categoriaCatalogoId },
      select: { comercioId: true, tipo: true },
    })
    if (!categoria || categoria.comercioId !== produto.comercioId || categoria.tipo !== tipoAlvo) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  // Códigos: confere o estado final (o que veio no PATCH, senão o atual).
  const mexeEmCodigos =
    parsed.data.codigoBarras !== undefined || parsed.data.codigoInterno !== undefined || parsed.data.variacoes !== undefined
  if (mexeEmCodigos) {
    const conflito = await conflitoDeCodigos(
      prisma,
      produto.comercioId,
      {
        codigoBarras: parsed.data.codigoBarras !== undefined ? parsed.data.codigoBarras : produto.codigoBarras,
        codigoInterno: parsed.data.codigoInterno !== undefined ? parsed.data.codigoInterno : produto.codigoInterno,
        variacoes: parsed.data.variacoes ?? produto.variacoes,
      },
      produto.id,
    )
    if (conflito) return NextResponse.json({ error: conflito }, { status: 409 })
  }

  // Entrar no catálogo (saindo do cardápio) ou trocar de aba conta no limite do plano.
  const tipoFinal = parsed.data.tipo ?? produto.tipo
  const cardapioFinal =
    parsed.data.categoriaCardapioId !== undefined ? parsed.data.categoriaCardapioId : produto.categoriaCardapioId
  const entraNaAba = !cardapioFinal && (produto.categoriaCardapioId || tipoFinal !== produto.tipo)
  if (entraNaAba) {
    const limite = await negarLimiteCatalogo(produto.comercioId, ctx.features, tipoFinal, produto.id)
    if (limite) return limite
  }

  const { variacoes, complementoIds, ...produtoData } = parsed.data

  let updated
  if (variacoes !== undefined) {
    updated = await prisma.$transaction(async (tx) => {
      await tx.cardapioVariacao.deleteMany({ where: { produtoId: id } })
      if (variacoes.length > 0) {
        await tx.cardapioVariacao.createMany({
          data: variacoes.map((v, i) => ({ ...v, produtoId: id, ordem: i })),
        })
      }
      return tx.produto.update({
        where: { id },
        data: produtoData,
        include: {
          variacoes: { orderBy: { ordem: "asc" } },
          categoriaCardapio: { select: { id: true, nome: true } },
          categoriaCatalogo: { select: { id: true, nome: true } },
        },
      })
    })
  } else {
    updated = await prisma.produto.update({
      where: { id },
      data: produtoData,
      include: {
        variacoes: { orderBy: { ordem: "asc" } },
        categoriaCardapio: { select: { id: true, nome: true } },
        categoriaCatalogo: { select: { id: true, nome: true } },
      },
    })
  }

  if (complementoIds) await vincularGrupos(produto.comercioId, id, complementoIds)

  return NextResponse.json({ ...updated, complementoIds })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id)
  if (!check) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { produto, ctx } = check
  const negado = negarSemPermissao(ctx, permissaoDeEdicao(produto.categoriaCardapioId))
  if (negado) return negado

  for (const url of produto.imagens) {
    try {
      const parsed = new URL(url)
      const path = parsed.pathname.split("/object/public/comercios/")[1]
      if (path) await deleteFile(path)
    } catch {}
  }

  await prisma.produto.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
