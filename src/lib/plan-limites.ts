import { NextResponse } from "next/server"
import type { TipoProduto } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { temFeature, LIMITES_FREE, type FeatureKey } from "@/lib/plan-features"

// Limites e recursos do plano aplicados no SERVIDOR. A tela mostra os mesmos
// números (cadeado, "3/3 fotos"), mas quem chama a API direto não pode passar
// deles. Plano com `fotos_ilimitadas` não tem limite de quantidade.

type Recurso = "fotos" | "tags" | "produtos"

const ROTULO: Record<Recurso, string> = {
  fotos: "fotos",
  tags: "palavras-chave",
  produtos: "itens por aba do catálogo",
}

function limite(features: unknown, recurso: Recurso): number | null {
  return temFeature(features, "fotos_ilimitadas") ? null : LIMITES_FREE[recurso]
}

function negar(recurso: Recurso, max: number) {
  return NextResponse.json(
    { error: `Limite de ${max} ${ROTULO[recurso]} no plano Gratuito. Faça upgrade para o Premium.` },
    { status: 403 },
  )
}

export async function negarLimiteFotos(comercioId: string, features: unknown) {
  const max = limite(features, "fotos")
  if (max == null) return null
  const total = await prisma.foto.count({ where: { comercioId } })
  return total >= max ? negar("fotos", max) : null
}

export async function negarLimiteTags(comercioId: string, features: unknown) {
  const max = limite(features, "tags")
  if (max == null) return null
  const total = await prisma.tag.count({ where: { comercioId } })
  return total >= max ? negar("tags", max) : null
}

// Conta só itens do catálogo (fora do cardápio), por tipo — a mesma regra da
// tela ("até 3 itens por aba"). `ignorarId` = o próprio item numa edição.
export async function negarLimiteCatalogo(comercioId: string, features: unknown, tipo: TipoProduto, ignorarId?: string) {
  const max = limite(features, "produtos")
  if (max == null) return null
  const total = await prisma.produto.count({
    where: { comercioId, tipo, categoriaCardapioId: null, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
  })
  return total >= max ? negar("produtos", max) : null
}

// Recurso que o plano não inclui (ex.: eventos no Gratuito).
export function negarSemRecurso(features: unknown, recurso: FeatureKey, nome: string) {
  if (temFeature(features, recurso)) return null
  return NextResponse.json({ error: `${nome} não faz parte do plano deste comércio.` }, { status: 403 })
}
