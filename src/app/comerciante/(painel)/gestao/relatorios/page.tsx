import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { BarrasLista, BarrasTempo, Colunas } from "@/components/comerciante/relatorios/graficos"
import { getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"
import { formaPagamentoLabel } from "@/lib/hospedagem"
import { ORIGEM_LABEL } from "@/lib/pedidos"
import { cn } from "@/lib/utils"
import {
  ATALHOS,
  cancelamentos,
  complementosMaisVendidos,
  conversaoGuia,
  diasNoPeriodo,
  entregasPorBairro,
  fechamentoPorForma,
  hojeLocal,
  itensMaisVendidos,
  lerPeriodo,
  periodoAnterior,
  resumoVendas,
  serieFaturamento,
  variacao,
  vendasPorAtendente,
  vendasPorHorario,
  vendasPorOrigem,
} from "@/lib/gestao/relatorios"

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const dataCurta = (dia: string) => {
  const [a, m, d] = dia.split("-")
  return `${d}/${m}/${a}`
}
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const dataHora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d)

function Variacao({ pct, invertido }: { pct: number | null; invertido?: boolean }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">sem base anterior</span>
  if (pct === 0) return <span className="text-xs text-muted-foreground">igual ao período anterior</span>
  const bom = invertido ? pct < 0 : pct > 0
  const Icone = pct > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", bom ? "text-emerald-700" : "text-rose-700")}>
      <Icone className="h-3.5 w-3.5" />
      {Math.abs(pct).toLocaleString("pt-BR")}%
    </span>
  )
}

function Numero({ label, valor, pct, invertido, detalhe }: { label: string; valor: string; pct?: number | null; invertido?: boolean; detalhe?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{valor}</p>
      <div className="mt-0.5 min-h-4">{pct !== undefined ? <Variacao pct={pct} invertido={invertido} /> : detalhe && <span className="text-xs text-muted-foreground">{detalhe}</span>}</div>
    </div>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

// Relatórios de vendas (Fase 3 / PR 3). Só dono e gerente (vendas:ver), com a flag
// gestao_relatorios. Período na URL; tudo calculado no servidor em SQL.
export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string }> }) {
  const [params, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null
  if (!temPermissao(base.permissoes, "vendas:ver")) notFound()
  const { features } = base.comercio.plan
  if (!temFeature(features, "gestao_relatorios")) {
    return (
      <RecursoBloqueado
        titulo="Relatórios"
        descricao="Faturamento, fechamento por forma de pagamento, itens mais vendidos, horários de pico e desempenho da equipe — de todas as vendas da loja."
      />
    )
  }

  const { periodo, atalho, aviso } = lerPeriodo(params)
  const anterior = periodoAnterior(periodo)
  const id = base.comercio.id

  const [resumo, resumoAnt, serie, origens, formas, itens, complementos, horarios, atendentes, entregas, cancel, conversao] = await Promise.all([
    resumoVendas(id, periodo),
    resumoVendas(id, anterior),
    serieFaturamento(id, periodo),
    vendasPorOrigem(id, periodo),
    fechamentoPorForma(id, periodo),
    itensMaisVendidos(id, periodo),
    complementosMaisVendidos(id, periodo),
    vendasPorHorario(id, periodo),
    vendasPorAtendente(id, periodo),
    entregasPorBairro(id, periodo),
    cancelamentos(id, periodo),
    conversaoGuia(id, features, periodo),
  ])

  const somaFormasC = formas.reduce((a, f) => a + f.valorC, 0)
  const dinheiro = formas.find((f) => f.forma === "dinheiro")
  const dias = diasNoPeriodo(periodo)
  const semVendas = resumo.vendas === 0

  const rotuloSerie = (chave: string, i: number) => {
    if (serie.agrupamento === "mes") {
      const [a, m] = chave.split("-")
      return `${MESES[Number(m) - 1]}${serie.pontos.length > 12 ? "" : `/${a.slice(2)}`}`
    }
    const cada = Math.ceil(serie.pontos.length / 10)
    return i % cada === 0 ? chave.slice(8, 10) + "/" + chave.slice(5, 7) : null
  }

  return (
    <div className="space-y-4">
      {/* Período */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">
              {periodo.de === periodo.ate ? dataCurta(periodo.de) : `${dataCurta(periodo.de)} a ${dataCurta(periodo.ate)}`}
            </h2>
            <p className="text-sm text-muted-foreground">{dias} dia(s)</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ATALHOS.map((a) => (
              <Link
                key={a.id}
                href={`/comerciante/gestao/relatorios?periodo=${a.id}`}
                className={cn("rounded-full border px-3 py-1 text-sm", atalho === a.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}
              >
                {a.label}
              </Link>
            ))}
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">De</span>
              <input type="date" name="de" defaultValue={periodo.de} max={hojeLocal()} className="h-9 rounded-md border border-input bg-background px-2" />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">Até</span>
              <input type="date" name="ate" defaultValue={periodo.ate} max={hojeLocal()} className="h-9 rounded-md border border-input bg-background px-2" />
            </label>
            <button type="submit" className="h-9 rounded-md border border-border px-3 font-medium hover:bg-accent">Aplicar</button>
          </form>
          {aviso && <p className="text-sm text-rose-700">{aviso} Mostrando os últimos 7 dias.</p>}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A venda conta no dia em que foi concluída (comanda fechada, pedido entregue). Comparação com os {dias} dia(s) anteriores.
          </p>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Numero label="Faturamento" valor={brl(resumo.faturamentoC)} pct={variacao(resumo.faturamentoC, resumoAnt.faturamentoC)} />
        <Numero label="Vendas" valor={String(resumo.vendas)} pct={variacao(resumo.vendas, resumoAnt.vendas)} />
        <Numero label="Ticket médio" valor={brl(resumo.ticketC)} pct={variacao(resumo.ticketC, resumoAnt.ticketC)} />
        <Numero label="Descontos dados" valor={brl(resumo.descontosC)} detalhe={resumo.brutoC > 0 ? `${((resumo.descontosC / resumo.brutoC) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do bruto` : undefined} />
        <Numero label="Taxa de serviço" valor={brl(resumo.servicoC)} />
        <Numero label="Taxas de entrega" valor={brl(resumo.entregaC)} />
      </div>

      {semVendas ? (
        <Card>
          <CardContent>
            <Vazio>Nenhuma venda concluída neste período.</Vazio>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Faturamento {serie.agrupamento === "dia" ? "por dia" : "por mês"}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarrasTempo pontos={serie.pontos} rotulo={rotuloSerie} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Fechamento por forma de pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fechamento por forma de pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="divide-y divide-border text-sm">
                  {formas.map((f) => (
                    <li key={f.forma} className="flex items-baseline justify-between gap-2 py-2">
                      <span>
                        {formaPagamentoLabel(f.forma)}
                        <span className="ml-1.5 text-xs text-muted-foreground">{f.pagamentos} pagamento(s)</span>
                      </span>
                      <span className="font-semibold tabular-nums">{brl(f.valorC)}</span>
                    </li>
                  ))}
                  <li className="flex items-baseline justify-between gap-2 py-2 font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{brl(somaFormasC)}</span>
                  </li>
                </ul>
                {dinheiro && dinheiro.trocoC > 0 && (
                  <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-muted-foreground">
                    Dinheiro: recebido {brl(dinheiro.recebidoC)} · troco devolvido {brl(dinheiro.trocoC)} · fica na gaveta {brl(dinheiro.valorC)}
                  </p>
                )}
                {somaFormasC !== resumo.faturamentoC && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Os pagamentos somam {brl(somaFormasC)} e o faturamento é {brl(resumo.faturamentoC)}. Diferença de {brl(Math.abs(resumo.faturamentoC - somaFormasC))} — confira vendas antigas sem pagamento registrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Por origem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Por origem</CardTitle>
              </CardHeader>
              <CardContent>
                <BarrasLista
                  linhas={origens.map((o) => ({
                    chave: o.origem,
                    rotulo: ORIGEM_LABEL[o.origem],
                    valorC: o.faturamentoC,
                    detalhe: `${o.vendas} · ticket ${brl(o.ticketC)}`,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Itens mais vendidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Itens mais vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <BarrasLista
                linhas={itens.map((i, idx) => ({
                  chave: `${idx}`,
                  rotulo: (
                    <>
                      <span className="font-medium">{i.titulo}</span>
                      {i.variacao && <span className="text-muted-foreground"> · {i.variacao}</span>}
                      {i.avulso && <span className="ml-1.5 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">avulso</span>}
                    </>
                  ),
                  valorC: i.valorC,
                  detalhe: `${i.quantidade} un.`,
                }))}
              />
            </CardContent>
          </Card>

          {complementos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Adicionais mais vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <BarrasLista
                  linhas={complementos.map((x, idx) => ({
                    chave: `${idx}`,
                    rotulo: (
                      <>
                        <span className="font-medium">{x.nome}</span>
                        <span className="text-muted-foreground"> · {x.grupo}</span>
                      </>
                    ),
                    valorC: x.valorC,
                    detalhe: `${x.quantidade} un.`,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Horários */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Por hora do dia</CardTitle>
              </CardHeader>
              <CardContent>
                <Colunas itens={horarios.horas.map((h) => ({ rotulo: h.n % 3 === 0 ? `${h.n}h` : "", titulo: `${h.n}h`, valorC: h.faturamentoC, vendas: h.vendas }))} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Por dia da semana</CardTitle>
              </CardHeader>
              <CardContent>
                <Colunas itens={horarios.dias.map((d) => ({ rotulo: DIAS_SEMANA[d.n], titulo: DIAS_SEMANA[d.n], valorC: d.faturamentoC, vendas: d.vendas }))} />
              </CardContent>
            </Card>
          </div>

          {/* Atendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Por atendente</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Quem lançou</th>
                    <th className="pb-2 text-right font-medium">Vendas</th>
                    <th className="pb-2 text-right font-medium">Valor</th>
                    <th className="pb-2 text-right font-medium">Descontos</th>
                    <th className="pb-2 text-right font-medium">Serviço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {atendentes.map((a) => (
                    <tr key={`${a.nome}:${a.online}`}>
                      <td className={cn("py-2", a.online && "text-muted-foreground")}>{a.nome}</td>
                      <td className="py-2 text-right tabular-nums">{a.vendas}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{brl(a.faturamentoC)}</td>
                      <td className="py-2 text-right tabular-nums">{a.descontosC > 0 ? brl(a.descontosC) : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{a.servicoC > 0 ? brl(a.servicoC) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {entregas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Taxas de entrega por bairro</CardTitle>
              </CardHeader>
              <CardContent>
                <BarrasLista linhas={entregas.map((e) => ({ chave: e.bairro, rotulo: e.bairro, valorC: e.taxasC, detalhe: `${e.entregas} entrega(s)` }))} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Cancelamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cancelamentos e recusas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Numero label="Cancelados" valor={String(cancel.cancelados.qtd)} detalhe={brl(cancel.cancelados.valorC)} />
            <Numero label="Recusados" valor={String(cancel.recusados.qtd)} detalhe={brl(cancel.recusados.valorC)} />
          </div>
          {cancel.lista.length === 0 ? (
            <Vazio>Nenhum cancelamento ou recusa neste período.</Vazio>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {cancel.lista.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold tabular-nums">#{l.numero}</span>{" "}
                      <span className="text-muted-foreground">
                        {ORIGEM_LABEL[l.origem]}
                        {l.mesa ? ` · Mesa ${l.mesa}` : ""} · {l.status === "RECUSADO" ? "recusado" : "cancelado"}
                        {l.canceladoEm ? ` em ${dataHora(l.canceladoEm)}` : ""}
                      </span>
                    </p>
                    {l.depoisDeConcluida && <p className="text-xs text-amber-700">Cancelada depois de concluída em {dataHora(l.fechadaEm)}</p>}
                    {l.motivo && <p className="truncate text-xs text-rose-600">✕ {l.motivo}</p>}
                  </div>
                  <span className="shrink-0 tabular-nums text-muted-foreground line-through">{brl(l.totalC)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {conversao && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Do guia para a venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Numero label="Visitas ao cardápio" valor={conversao.visitasCardapio.toLocaleString("pt-BR")} detalhe={`${conversao.visitantes.toLocaleString("pt-BR")} visitante(s)`} />
              <Numero label="Pedidos online" valor={String(conversao.pedidosOnline)} detalhe={`${conversao.concluidos} concluído(s)`} />
              <Numero label="Conversão" valor={conversao.taxa === null ? "—" : `${conversao.taxa.toLocaleString("pt-BR")}%`} detalhe="pedidos ÷ visitantes" />
            </div>
            <p className="text-xs text-muted-foreground">Números agregados do período, sem identificar quem visitou. Pedidos contam pela data em que foram feitos.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
