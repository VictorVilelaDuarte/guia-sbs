"use client"

import { useState } from "react"
import Link from "next/link"
import { Copy, Plus, QrCode, RefreshCw, Trash2, Users } from "lucide-react"
import { MapaEditor } from "./mapa-editor"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { MesaPainel } from "@/lib/gestao/mesas"
import { linkDaMesa, rotuloMesa } from "@/lib/gestao/mesas-link"
import { cn } from "@/lib/utils"

interface ConfigQr {
  mesaQrAbrirConta: boolean
  mesaQrPedido: boolean
  mesaQrChamarGarcom: boolean
  mesaQrPedirConta: boolean
}

const OPCOES: { chave: keyof ConfigQr; titulo: string; descricao: string }[] = [
  { chave: "mesaQrChamarGarcom", titulo: "Chamar o atendente", descricao: "Botão que avisa a equipe no PDV." },
  { chave: "mesaQrPedirConta", titulo: "Pedir a conta", descricao: "Avisa que a mesa quer fechar." },
  { chave: "mesaQrPedido", titulo: "Pedir pelo QR", descricao: "O cliente monta o pedido e o atendente aprova antes de lançar." },
  { chave: "mesaQrAbrirConta", titulo: "Abrir a conta pelo QR", descricao: "Quando a mesa está livre, o próprio cliente começa a conta." },
]

async function api<T>(url: string, body?: unknown, method = "POST"): Promise<T | null> {
  const res = await fetch(url, {
    method,
    ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  }).catch(() => null)
  const data = await res?.json().catch(() => ({}))
  if (!res?.ok) {
    toast.error(data?.error ?? "Não foi possível salvar.")
    return null
  }
  return data as T
}

// Cadastro de mesas e do que o cliente pode fazer pelo QR.
export function MesasManager({ iniciais, base, config }: { iniciais: MesaPainel[]; base: string; config: ConfigQr }) {
  const [mesas, setMesas] = useState(iniciais)
  const [cfg, setCfg] = useState(config)
  const [nova, setNova] = useState({ nome: "", area: "", lugares: "" })
  const [salvando, setSalvando] = useState(false)
  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!nova.nome.trim() || salvando) return
    setSalvando(true)
    const r = await api<MesaPainel[]>("/api/comerciante/gestao/mesas", {
      nome: nova.nome,
      area: nova.area || null,
      lugares: nova.lugares ? Number(nova.lugares) : null,
    })
    if (r) {
      setMesas(r)
      setNova({ nome: "", area: nova.area, lugares: nova.lugares })
      toast.success("Mesa cadastrada.")
    }
    setSalvando(false)
  }

  async function alterar(id: string, body: Record<string, unknown>, ok?: string) {
    const r = await api<MesaPainel[]>(`/api/comerciante/gestao/mesas/${id}`, body, "PATCH")
    if (r) {
      setMesas(r)
      if (ok) toast.success(ok)
    }
  }

  async function excluir(m: MesaPainel) {
    if (!window.confirm(`Excluir a mesa ${m.nome}? O QR impresso dela para de funcionar.`)) return
    const r = await api<MesaPainel[]>(`/api/comerciante/gestao/mesas/${m.id}`, undefined, "DELETE")
    if (r) {
      setMesas(r)
      toast.success("Mesa excluída.")
    }
  }

  async function mudarConfig(chave: keyof ConfigQr, valor: boolean) {
    const anterior = cfg
    setCfg({ ...cfg, [chave]: valor })
    const r = await api<ConfigQr>("/api/comerciante/gestao/pdv", { [chave]: valor }, "PATCH")
    if (!r) setCfg(anterior)
  }

  function copiar(m: MesaPainel) {
    const link = linkDaMesa(m.token, base)
    navigator.clipboard?.writeText(link).then(
      () => toast.success(`Link da mesa ${m.nome} copiado.`),
      () => toast.error("Não foi possível copiar. Use a folha de impressão."),
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Mesas</CardTitle>
            <p className="text-sm text-muted-foreground">Cada mesa tem um QR Code próprio. Monte a planta do salão abaixo — ela aparece igual no PDV.</p>
          </div>
          <Link
            href="/comerciante/gestao/mesas/qr"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <QrCode className="h-4 w-4" /> Imprimir QR
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={adicionar} className="flex flex-wrap gap-2">
            <input
              value={nova.nome}
              onChange={(e) => setNova({ ...nova, nome: e.target.value })}
              placeholder="Mesa (ex.: 4)"
              maxLength={20}
              className="h-10 w-28 rounded-md border border-input bg-background px-3 text-[16px]"
            />
            <input
              value={nova.area}
              onChange={(e) => setNova({ ...nova, area: e.target.value })}
              placeholder="Área (opcional)"
              maxLength={40}
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-[16px]"
            />
            <input
              value={nova.lugares}
              onChange={(e) => setNova({ ...nova, lugares: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              placeholder="Lugares"
              inputMode="numeric"
              className="h-10 w-24 rounded-md border border-input bg-background px-3 text-[16px]"
            />
            <button type="submit" disabled={!nova.nome.trim() || salvando} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-40">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </form>

          {mesas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mesa cadastrada. Comece pelas mesas do salão.</p>
          ) : (
            <ul className="divide-y divide-border">
              {mesas.map((m) => (
                <li key={m.id} className={cn("flex flex-wrap items-center gap-2 py-2.5", !m.ativa && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {rotuloMesa(m.nome)}
                      {m.area && <span className="text-xs font-normal text-muted-foreground">{m.area}</span>}
                      {m.lugares && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-normal text-muted-foreground">
                          <Users className="h-3 w-3" /> {m.lugares}
                        </span>
                      )}
                      {m.comandaAberta && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          conta aberta · #{m.comandaAberta.numero}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{linkDaMesa(m.token, base)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => copiar(m)} title="Copiar link" aria-label={`Copiar link da mesa ${m.nome}`} className="rounded-md p-2 text-muted-foreground hover:bg-accent">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Gerar um QR novo para a mesa ${m.nome}? O adesivo atual para de funcionar.`)) {
                          alterar(m.id, { trocarToken: true }, "QR novo gerado — reimprima o adesivo.")
                        }
                      }}
                      title="Gerar QR novo"
                      aria-label={`Gerar QR novo para a mesa ${m.nome}`}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <label className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                      <Switch checked={m.ativa} onCheckedChange={(v: boolean) => alterar(m.id, { ativa: v })} />
                      {m.ativa ? "Ativa" : "Inativa"}
                    </label>
                    <button type="button" onClick={() => excluir(m)} title="Excluir" aria-label={`Excluir a mesa ${m.nome}`} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planta do salão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Arraste cada mesa para o lugar dela. É essa planta que o PDV mostra na aba Comandas.
          </p>
        </CardHeader>
        <CardContent>
          <MapaEditor mesas={mesas} onMesas={setMesas} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que o cliente pode fazer pelo QR</CardTitle>
          <p className="text-sm text-muted-foreground">Ver a conta é sempre permitido. O resto você liga e desliga aqui, e vale na hora.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {OPCOES.map((o) => (
            <label key={o.chave} className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-medium">{o.titulo}</span>
                <span className="block text-xs text-muted-foreground">{o.descricao}</span>
              </span>
              <Switch checked={cfg[o.chave]} onCheckedChange={(v: boolean) => mudarConfig(o.chave, v)} />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
