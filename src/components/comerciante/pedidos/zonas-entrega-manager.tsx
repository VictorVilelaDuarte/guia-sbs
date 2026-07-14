"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BairroCatalogo, ZonaEntregaData } from "./types"

interface CustomZona {
  nome: string
  cidade: string
  uf: string
  taxa: string
}

function moneyToStr(n: number): string {
  return n ? n.toString().replace(".", ",") : ""
}
function parseTaxa(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0
}

export function ZonasEntregaManager({
  catalogo,
  zonasIniciais,
}: {
  catalogo: BairroCatalogo[]
  zonasIniciais: ZonaEntregaData[]
}) {
  // bairroId -> taxa (string). Presença = bairro atendido.
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const z of zonasIniciais) if (z.bairroId) m[z.bairroId] = moneyToStr(z.taxa)
    return m
  })
  const [custom, setCustom] = useState<CustomZona[]>(() =>
    zonasIniciais
      .filter((z) => !z.bairroId)
      .map((z) => ({ nome: z.nome, cidade: z.cidade, uf: z.uf, taxa: moneyToStr(z.taxa) })),
  )
  const [busca, setBusca] = useState("")
  const [novo, setNovo] = useState<CustomZona>({ nome: "", cidade: "São Bento do Sapucaí", uf: "SP", taxa: "" })
  const [saving, setSaving] = useState(false)

  const catalogoMap = useMemo(() => new Map(catalogo.map((b) => [b.id, b])), [catalogo])

  // Agrupa catálogo por cidade, aplicando o filtro de busca.
  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const filtrado = q
      ? catalogo.filter((b) => `${b.nome} ${b.cidade}`.toLowerCase().includes(q))
      : catalogo
    return filtrado.reduce<Record<string, BairroCatalogo[]>>((acc, b) => {
      const key = `${b.cidade} · ${b.uf}`
      ;(acc[key] ??= []).push(b)
      return acc
    }, {})
  }, [catalogo, busca])

  function toggle(id: string) {
    setSel((s) => {
      const n = { ...s }
      if (id in n) delete n[id]
      else n[id] = ""
      return n
    })
  }

  function addCustom() {
    if (!novo.nome.trim() || !novo.cidade.trim() || novo.uf.length !== 2) {
      toast.error("Preencha nome, cidade e UF da área.")
      return
    }
    setCustom((c) => [...c, novo])
    setNovo({ nome: "", cidade: "São Bento do Sapucaí", uf: "SP", taxa: "" })
  }

  async function salvar() {
    const zonas = [
      ...Object.entries(sel).map(([bairroId, taxaStr]) => {
        const b = catalogoMap.get(bairroId)!
        return { bairroId, nome: b.nome, cidade: b.cidade, uf: b.uf, taxa: parseTaxa(taxaStr) }
      }),
      ...custom.map((c) => ({
        bairroId: null,
        nome: c.nome.trim(),
        cidade: c.cidade.trim(),
        uf: c.uf.toUpperCase(),
        taxa: parseTaxa(c.taxa),
      })),
    ]
    setSaving(true)
    try {
      const res = await fetch("/api/comerciante/zonas-entrega", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zonas }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Erro ao salvar zonas.")
        return
      }
      toast.success(`${zonas.length} bairro(s) de entrega salvos.`)
    } catch {
      toast.error("Falha de conexão.")
    } finally {
      setSaving(false)
    }
  }

  const totalSelecionados = Object.keys(sel).length + custom.length

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Marque os bairros que você atende e defina a taxa de cada um. Não achou? Adicione uma área personalizada abaixo.
      </p>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar bairro…"
          className="pl-9"
        />
      </div>

      {/* Catálogo agrupado por cidade */}
      <div className="space-y-4">
        {Object.entries(grupos).map(([cidade, lista]) => (
          <div key={cidade} className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
              {cidade}
            </div>
            <div className="divide-y">
              {lista.map((b) => {
                const on = b.id in sel
                return (
                  <div key={b.id} className="flex items-center gap-3 px-3 py-2">
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(b.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className={cn("text-sm", on && "font-medium")}>{b.nome}</span>
                    </label>
                    {on && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input
                          inputMode="decimal"
                          value={sel[b.id]}
                          onChange={(e) => setSel((s) => ({ ...s, [b.id]: e.target.value }))}
                          placeholder="0,00"
                          className="h-8 w-20 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {Object.keys(grupos).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum bairro encontrado para “{busca}”.</p>
        )}
      </div>

      {/* Áreas custom */}
      <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
        <Label className="text-sm">Áreas personalizadas (não estão na lista)</Label>
        {custom.length > 0 && (
          <div className="space-y-1.5">
            {custom.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1">
                  {c.nome} <span className="text-muted-foreground">· {c.cidade}/{c.uf}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    inputMode="decimal"
                    value={c.taxa}
                    onChange={(e) =>
                      setCustom((arr) => arr.map((x, j) => (j === i ? { ...x, taxa: e.target.value } : x)))
                    }
                    placeholder="0,00"
                    className="h-8 w-20 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => setCustom((arr) => arr.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Input
            value={novo.nome}
            onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
            placeholder="Nome da área"
            className="h-9"
          />
          <Input
            value={novo.cidade}
            onChange={(e) => setNovo((n) => ({ ...n, cidade: e.target.value }))}
            placeholder="Cidade"
            className="h-9 w-36"
          />
          <Input
            value={novo.uf}
            onChange={(e) => setNovo((n) => ({ ...n, uf: e.target.value.toUpperCase() }))}
            placeholder="UF"
            maxLength={2}
            className="h-9 w-14 uppercase"
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addCustom}>
          <Plus className="h-3.5 w-3.5" /> Adicionar área
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={salvar} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar bairros de entrega
        </Button>
        <span className="text-xs text-muted-foreground">{totalSelecionados} área(s) selecionada(s)</span>
      </div>
    </div>
  )
}
