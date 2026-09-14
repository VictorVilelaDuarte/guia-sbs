import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { paraCentavos } from "@/lib/dinheiro"
import { formaPagamentoLabel } from "@/lib/hospedagem"
import { ORIGEM_LABEL } from "@/lib/pedidos"
import { calcularDivisao, type PlanoDivisao } from "@/lib/gestao/divisao"
import { Imprimir } from "./imprimir"

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const dataHora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d)

// Cupom NÃO fiscal para impressora térmica de 80mm (impressão do navegador) e
// conferência da comanda (?tipo=conferencia) antes de receber, com a divisão
// entre as pessoas quando houver. NFC-e fica no roadmap fiscal.
export default async function CupomPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ imprimir?: string; tipo?: string }>
}) {
  const [{ id }, sp, base] = await Promise.all([params, searchParams, getPainelBase()])
  if (!base || !temPermissao(base.permissoes, "vendas:registrar")) notFound()

  const p = await prisma.pedido.findFirst({
    where: { id, comercioId: base.comercio.id },
    include: {
      itens: { orderBy: { createdAt: "asc" } },
      pagamentos: { where: { estornadoEm: null }, orderBy: { createdAt: "asc" } },
      comercio: { select: { nome: true, endereco: true, numero: true, bairro: true, cidade: true, estado: true, telefone: true, whatsapp: true } },
    },
  })
  if (!p || p.origem === "ONLINE") notFound()

  const conferencia = sp.tipo === "conferencia" || p.status === "ABERTA"
  const c = p.comercio
  const totalC = paraCentavos(p.total)
  const pagoC = p.pagamentos.reduce((a, x) => a + paraCentavos(x.valor), 0)
  const trocoC = p.pagamentos.reduce((a, x) => a + (x.recebido ? paraCentavos(x.recebido) - paraCentavos(x.valor) : 0), 0)
  const plano = (p.divisao as PlanoDivisao | null) ?? null
  const divisao =
    conferencia && plano && plano.pessoas.length > 1
      ? calcularDivisao(plano, {
          totalC,
          linhas: p.itens.map((i) => ({ chave: i.id, valorC: paraCentavos(i.precoUnit) * i.quantidade - paraCentavos(i.desconto), quantidade: i.quantidade })),
        })
      : null

  const sep = <div className="my-2 border-t border-dashed border-black" />

  return (
    <div className="min-h-dvh bg-stone-200 py-4 print:bg-white print:py-0">
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print { .no-print { display: none !important; } html, body { background: #fff !important; } }
      `}</style>
      <div className="mx-auto w-[76mm] bg-white p-[3mm] font-mono text-[11px] leading-snug text-black shadow print:shadow-none">
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase">{c.nome}</p>
          {c.endereco && <p>{c.endereco}{c.numero ? `, ${c.numero}` : ""}{c.bairro ? ` - ${c.bairro}` : ""}</p>}
          {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ""}</p>}
          {(c.telefone || c.whatsapp) && <p>{c.telefone || c.whatsapp}</p>}
        </div>
        {sep}
        <p className="text-center font-bold">{conferencia ? "CONFERÊNCIA DE CONTA" : "CUPOM NÃO FISCAL"}</p>
        <p className="text-center">
          {ORIGEM_LABEL[p.origem]} #{p.numero}
          {p.mesa ? ` · Mesa ${p.mesa}` : ""}
        </p>
        <p className="text-center">{dataHora(p.fechadaEm ?? p.createdAt)}</p>
        {p.clienteNome && p.clienteNome !== `Mesa ${p.mesa}` && p.clienteNome !== "Cliente balcão" && <p className="text-center">Cliente: {p.clienteNome}</p>}
        {p.criadoPorNome && <p className="text-center">Atendente: {p.criadoPorNome}</p>}
        {sep}
        <table className="w-full">
          <tbody>
            {p.itens.map((i) => {
              const bruto = paraCentavos(i.precoUnit) * i.quantidade
              const desc = paraCentavos(i.desconto)
              return (
                <tr key={i.id} className="align-top">
                  <td className="pr-1">
                    {i.quantidade}x {i.titulo}
                    {i.variacaoNome ? ` (${i.variacaoNome})` : ""}
                    <br />
                    <span className="text-[10px]">
                      {brl(paraCentavos(i.precoUnit))} un{desc > 0 ? ` · desc. -${brl(desc)}` : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right">{brl(bruto - desc)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sep}
        <Linha label="Subtotal" valor={brl(paraCentavos(p.subtotal))} />
        {paraCentavos(p.desconto) > 0 && <Linha label={`Desconto${p.descontoPercentual ? ` (${String(p.descontoPercentual).replace(".", ",")}%)` : ""}`} valor={`-${brl(paraCentavos(p.desconto))}`} />}
        {paraCentavos(p.taxaServico) > 0 && <Linha label={`Serviço (${String(p.servicoPercentual ?? "").replace(".", ",")}%)`} valor={brl(paraCentavos(p.taxaServico))} />}
        {paraCentavos(p.taxaEntrega) > 0 && <Linha label="Entrega" valor={brl(paraCentavos(p.taxaEntrega))} />}
        <div className="mt-1 flex justify-between text-[14px] font-bold">
          <span>TOTAL</span>
          <span>{brl(totalC)}</span>
        </div>

        {p.pagamentos.length > 0 && (
          <>
            {sep}
            {p.pagamentos.map((x) => (
              <div key={x.id}>
                <Linha label={`${formaPagamentoLabel(x.forma)}${x.pagante ? ` · ${x.pagante}` : ""}`} valor={brl(paraCentavos(x.valor))} />
                {x.recebido && paraCentavos(x.recebido) > paraCentavos(x.valor) && (
                  <p className="pl-2 text-[10px]">recebido {brl(paraCentavos(x.recebido))}</p>
                )}
              </div>
            ))}
            {trocoC > 0 && <Linha label="Troco" valor={brl(trocoC)} bold />}
            {conferencia && totalC - pagoC > 0 && <Linha label="Falta pagar" valor={brl(totalC - pagoC)} bold />}
          </>
        )}

        {divisao && (
          <>
            {sep}
            <p className="font-bold">Divisão ({plano!.modo === "igual" ? "igual" : plano!.modo === "itens" ? "por itens" : "por valor"})</p>
            {plano!.pessoas.map((pessoa) => (
              <Linha key={pessoa.id} label={pessoa.nome} valor={brl(divisao.porPessoa[pessoa.id] ?? 0)} />
            ))}
          </>
        )}

        {sep}
        <p className="text-center text-[10px]">{conferencia ? "Confira os itens antes de pagar." : "Obrigado pela preferência!"}</p>
        <p className="text-center text-[10px] font-bold">NÃO É DOCUMENTO FISCAL</p>
        {p.status === "CANCELADO" && <p className="mt-1 text-center font-bold">*** VENDA CANCELADA ***</p>}
      </div>
      <Imprimir automatico={sp.imprimir === "1"} />
    </div>
  )
}

function Linha({ label, valor, bold }: { label: string; valor: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{valor}</span>
    </div>
  )
}
