import { cn } from "@/lib/utils"

// Gráficos dos relatórios em SVG/HTML puro (sem biblioteca), renderizados no
// servidor — mesmo princípio do painel de analytics. Valores em centavos.

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const brlCurto = (c: number) => {
  const r = c / 100
  if (r >= 1000) return `R$ ${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
  return `R$ ${Math.round(r).toLocaleString("pt-BR")}`
}

// Barras verticais com rótulo embaixo e valor no title (hover/leitor de tela).
export function BarrasTempo({
  pontos,
  rotulo,
  destacarUltimo,
}: {
  pontos: { chave: string; faturamentoC: number; vendas: number }[]
  rotulo: (chave: string, i: number) => string | null
  destacarUltimo?: boolean
}) {
  const max = Math.max(...pontos.map((p) => p.faturamentoC), 1)
  const L = 600
  const A = 160
  const passo = L / Math.max(pontos.length, 1)
  const larg = Math.max(Math.min(passo * 0.7, 40), 2)
  return (
    <div className="space-y-1">
      <p className="text-right text-[11px] text-muted-foreground">máx. {brlCurto(max)}</p>
      <svg viewBox={`0 0 ${L} ${A + 18}`} className="h-44 w-full" role="img" aria-label="Faturamento no período" preserveAspectRatio="none">
        <line x1="0" y1={A} x2={L} y2={A} stroke="currentColor" strokeOpacity="0.15" />
        {pontos.map((p, i) => {
          const h = p.faturamentoC > 0 ? Math.max((p.faturamentoC / max) * (A - 6), 2) : 0
          const x = i * passo + (passo - larg) / 2
          const r = rotulo(p.chave, i)
          return (
            <g key={p.chave}>
              <rect x={x} y={A - h} width={larg} height={h} rx="2" className={cn(destacarUltimo && i === pontos.length - 1 ? "fill-amber-500" : "fill-stone-700")}>
                <title>{`${p.chave}: ${brl(p.faturamentoC)} · ${p.vendas} venda(s)`}</title>
              </rect>
              {r && (
                <text x={i * passo + passo / 2} y={A + 14} textAnchor="middle" className="fill-stone-500" fontSize="11">
                  {r}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Barras horizontais (ranking): rótulo, barra proporcional e valor.
export function BarrasLista({ linhas }: { linhas: { rotulo: React.ReactNode; valorC: number; detalhe?: string; chave: string }[] }) {
  const max = Math.max(...linhas.map((l) => l.valorC), 1)
  return (
    <ul className="space-y-2">
      {linhas.map((l) => (
        <li key={l.chave} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{l.rotulo}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {brl(l.valorC)}
              {l.detalhe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{l.detalhe}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-100">
            <div className="h-1.5 rounded-full bg-stone-700" style={{ width: `${Math.max((l.valorC / max) * 100, l.valorC > 0 ? 1 : 0)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Colunas compactas (horas do dia, dias da semana) com a de maior valor destacada.
export function Colunas({ itens }: { itens: { rotulo: string; titulo: string; valorC: number; vendas: number }[] }) {
  const max = Math.max(...itens.map((i) => i.valorC), 1)
  const pico = itens.reduce((m, i, idx) => (i.valorC > itens[m].valorC ? idx : m), 0)
  return (
    <div className="flex h-32 items-end gap-0.5">
      {itens.map((it, idx) => (
        <div key={idx} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${it.titulo}: ${brl(it.valorC)} · ${it.vendas} venda(s)`}>
          <div
            className={cn("w-full rounded-t-sm", it.valorC > 0 && idx === pico ? "bg-amber-500" : "bg-stone-700")}
            style={{ height: `${it.valorC > 0 ? Math.max((it.valorC / max) * 100, 3) : 0}%` }}
          />
          <span className="text-[10px] tabular-nums text-muted-foreground">{it.rotulo}</span>
        </div>
      ))}
    </div>
  )
}
