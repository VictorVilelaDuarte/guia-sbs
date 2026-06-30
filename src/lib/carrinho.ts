"use client"

// Carrinho do pedido online — estado client-side persistido em localStorage,
// isolado POR slug de comércio (nunca misturar itens de lojas diferentes).
// Linhas com mesmo produto + variação são mescladas (soma a quantidade).

import { useCallback, useEffect, useState } from "react"
import { arredondar } from "@/lib/pedidos"

export interface ItemCarrinho {
  uid: string // determinístico: `${produtoId}|${variacaoId ?? ""}`
  produtoId: string
  titulo: string
  imagem: string | null
  variacaoId: string | null
  variacaoNome: string | null
  precoUnit: number
  quantidade: number
  observacao: string | null
}

// Payload de adição (sem uid/quantidade-acumulada — o hook resolve).
export interface AddCarrinho {
  produtoId: string
  titulo: string
  imagem: string | null
  variacaoId: string | null
  variacaoNome: string | null
  precoUnit: number
  quantidade: number
  observacao: string | null
}

const PREFIXO = "carrinho:"

function chave(slug: string) {
  return PREFIXO + slug
}

function uidDe(produtoId: string, variacaoId: string | null) {
  return `${produtoId}|${variacaoId ?? ""}`
}

function ler(slug: string): ItemCarrinho[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(chave(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as ItemCarrinho[]
  } catch {
    return []
  }
}

function salvar(slug: string, itens: ItemCarrinho[]) {
  if (typeof window === "undefined") return
  try {
    if (itens.length === 0) window.localStorage.removeItem(chave(slug))
    else window.localStorage.setItem(chave(slug), JSON.stringify(itens))
  } catch {}
}

export function useCarrinho(slug: string) {
  // Lazy init evita o setState-em-effect; no servidor cai em [].
  const [itens, setItens] = useState<ItemCarrinho[]>(() =>
    typeof window === "undefined" ? [] : ler(slug),
  )
  // `mounted` evita hydration mismatch da barra (server renderiza vazio).
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted) salvar(slug, itens)
  }, [slug, itens, mounted])

  const adicionar = useCallback((add: AddCarrinho) => {
    const uid = uidDe(add.produtoId, add.variacaoId)
    setItens((prev) => {
      const existente = prev.find((i) => i.uid === uid)
      if (existente) {
        return prev.map((i) =>
          i.uid === uid
            ? {
                ...i,
                quantidade: i.quantidade + add.quantidade,
                observacao: add.observacao?.trim() || i.observacao,
                precoUnit: add.precoUnit, // mantém o preço mais recente
              }
            : i,
        )
      }
      return [
        ...prev,
        {
          uid,
          produtoId: add.produtoId,
          titulo: add.titulo,
          imagem: add.imagem,
          variacaoId: add.variacaoId,
          variacaoNome: add.variacaoNome,
          precoUnit: add.precoUnit,
          quantidade: add.quantidade,
          observacao: add.observacao?.trim() || null,
        },
      ]
    })
  }, [])

  const setQuantidade = useCallback((uid: string, quantidade: number) => {
    setItens((prev) =>
      quantidade <= 0
        ? prev.filter((i) => i.uid !== uid)
        : prev.map((i) => (i.uid === uid ? { ...i, quantidade } : i)),
    )
  }, [])

  const remover = useCallback((uid: string) => {
    setItens((prev) => prev.filter((i) => i.uid !== uid))
  }, [])

  const limpar = useCallback(() => setItens([]), [])

  const contagem = itens.reduce((acc, i) => acc + i.quantidade, 0)
  const subtotal = arredondar(
    itens.reduce((acc, i) => acc + i.precoUnit * i.quantidade, 0),
  )

  return {
    itens,
    contagem,
    subtotal,
    mounted,
    adicionar,
    setQuantidade,
    remover,
    limpar,
  }
}
