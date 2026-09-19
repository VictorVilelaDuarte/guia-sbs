"use client"

import { useEffect, useRef, useState } from "react"
import { Move, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import type { MesaPainel } from "@/lib/gestao/mesas"
import { celulaLivre, GRADE_COLUNAS, GRADE_LINHAS, type PosicaoMesa } from "@/lib/gestao/mesas-grade"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { cn } from "@/lib/utils"

const CELULA_MIN = 64
const CELULA_MAX = 110

const areaDe = (m: { area: string | null }) => m.area?.trim() || "Salão"

// Editor da planta do salão: arrasta a mesa para a posição dela. A posição é
// salva em CÉLULAS da grade, então a planta não quebra quando a tela muda.
// Funciona com mouse e com o dedo (pointer events + touch-action: none).
export function MapaEditor({ mesas, onMesas }: { mesas: MesaPainel[]; onMesas: (m: MesaPainel[]) => void }) {
  const areas = [...new Set(mesas.map(areaDe))]
  const [area, setArea] = useState(areas[0] ?? "Salão")
  const areaAtual = areas.includes(area) ? area : (areas[0] ?? "Salão")

  const gradeRef = useRef<HTMLDivElement>(null)
  const [celula, setCelula] = useState(88)
  const [arrastando, setArrastando] = useState<{ id: string; x: number; y: number } | null>(null)
  const [salvando, setSalvando] = useState(false)

  // A célula acompanha a largura disponível: no celular fica menor, sem rolagem
  // horizontal até o mínimo legível.
  useEffect(() => {
    const el = gradeRef.current
    if (!el) return
    const medir = () => setCelula(Math.min(Math.max(Math.floor(el.clientWidth / GRADE_COLUNAS), CELULA_MIN), CELULA_MAX))
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const daArea = mesas.filter((m) => areaDe(m) === areaAtual)
  const naPlanta = daArea.filter((m) => m.posX != null && m.posY != null)
  const semPosicao = daArea.filter((m) => m.posX == null || m.posY == null)

  async function salvar(posicoes: PosicaoMesa[]) {
    setSalvando(true)
    const res = await fetch("/api/comerciante/gestao/mesas/posicoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posicoes }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    setSalvando(false)
    if (!res?.ok) return toast.error(data?.error ?? "Não foi possível salvar a planta.")
    onMesas(data)
  }

  async function tirar(m: MesaPainel) {
    const res = await fetch("/api/comerciante/gestao/mesas/posicoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tirar: m.id }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) return toast.error(data?.error ?? "Não foi possível tirar da planta.")
    onMesas(data)
    toast.success(`${rotuloMesa(m.nome)} saiu da planta.`)
  }

  // Converte a posição do ponteiro na célula da grade, com encaixe.
  function celulaDoPonteiro(e: { clientX: number; clientY: number }) {
    const r = gradeRef.current?.getBoundingClientRect()
    if (!r) return null
    return {
      x: Math.floor((e.clientX - r.left) / celula),
      y: Math.floor((e.clientY - r.top) / celula),
    }
  }

  function aoSoltar(id: string, e: PointerEvent | React.PointerEvent) {
    const alvo = celulaDoPonteiro(e)
    setArrastando(null)
    if (!alvo) return
    const ocupadas = new Set(
      naPlanta.filter((m) => m.id !== id).map((m) => `${m.posX},${m.posY}`),
    )
    const destino = celulaLivre(alvo.x, alvo.y, ocupadas)
    const atual = mesas.find((m) => m.id === id)
    if (atual?.posX === destino.x && atual?.posY === destino.y) return

    // Otimista: a planta já mostra a mesa no lugar novo enquanto salva.
    const novas = mesas.map((m) => (m.id === id ? { ...m, posX: destino.x, posY: destino.y } : m))
    onMesas(novas)
    salvar(
      novas
        .filter((m) => m.posX != null && m.posY != null)
        .map((m) => ({ id: m.id, x: m.posX!, y: m.posY! })),
    )
  }

  function iniciarArraste(id: string, e: React.PointerEvent) {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const mover = (ev: PointerEvent) => {
      const c = celulaDoPonteiro(ev)
      if (c) setArrastando({ id, x: c.x, y: c.y })
    }
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover)
      window.removeEventListener("pointerup", soltar)
      aoSoltar(id, ev)
    }
    window.addEventListener("pointermove", mover)
    window.addEventListener("pointerup", soltar)
  }

  // A grade cresce conforme o salão ocupa: duas linhas livres sempre sobram
  // abaixo (espaço para arrastar), sem deixar uma quadra vazia na tela.
  const usadas = naPlanta.reduce((max, m) => Math.max(max, m.posY! + 1), 0)
  const linhas = Math.min(GRADE_LINHAS, Math.max(4, usadas + 2))
  const largura = celula * GRADE_COLUNAS
  const altura = celula * linhas

  return (
    <div className="space-y-3">
      {areas.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                a === areaAtual ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Arraste as mesas para montar o salão. {salvando ? "Salvando…" : "A posição é salva sozinha e aparece igual no PDV."}
      </p>

      <div className="overflow-x-auto">
        <div
          ref={gradeRef}
          className="relative touch-none rounded-xl border border-dashed border-border bg-muted/30"
          style={{
            width: "100%",
            minWidth: CELULA_MIN * GRADE_COLUNAS,
            height: altura,
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.06) 1px, transparent 1px)",
            backgroundSize: `${celula}px ${celula}px`,
          }}
        >
          {arrastando && (
            <div
              className="pointer-events-none absolute rounded-xl border-2 border-primary/60 bg-primary/10"
              style={{ left: arrastando.x * celula + 3, top: arrastando.y * celula + 3, width: celula - 6, height: celula - 6 }}
            />
          )}

          {naPlanta.map((m) => (
            <div
              key={m.id}
              onPointerDown={(e) => iniciarArraste(m.id, e)}
              className={cn(
                "absolute flex cursor-grab touch-none select-none flex-col justify-between rounded-xl bg-background p-1.5 text-left shadow-sm ring-1 ring-border active:cursor-grabbing",
                arrastando?.id === m.id && "opacity-50",
                m.comandaAberta && "ring-amber-300",
              )}
              style={{ left: m.posX! * celula + 3, top: m.posY! * celula + 3, width: celula - 6, height: celula - 6 }}
            >
              {/* Sem ícone de arraste: o cartão inteiro é a alça — dentro de uma
                  célula pequena, o ícone só roubaria espaço do nome. */}
              <span className="line-clamp-2 text-[11px] font-bold leading-tight" title={rotuloMesa(m.nome)}>
                {rotuloMesa(m.nome)}
              </span>
              <span className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                {m.lugares ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" /> {m.lugares}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  aria-label={`Tirar ${m.nome} da planta`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => tirar(m)}
                  className="rounded p-0.5 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </div>
          ))}

          {largura > 0 && naPlanta.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Arraste as mesas de baixo para cá para montar o salão.
            </p>
          )}
        </div>
      </div>

      {semPosicao.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Sem posição ({semPosicao.length})</p>
          <div className="flex flex-wrap gap-2">
            {semPosicao.map((m) => (
              <div
                key={m.id}
                onPointerDown={(e) => iniciarArraste(m.id, e)}
                className="flex cursor-grab touch-none select-none items-center gap-1.5 rounded-xl border border-dashed border-border bg-background px-3 py-2 text-sm font-medium active:cursor-grabbing"
              >
                <Move className="h-3.5 w-3.5 text-muted-foreground" />
                {rotuloMesa(m.nome)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
