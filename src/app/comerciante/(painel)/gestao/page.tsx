import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { getPainelBase, getResumoData } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import { temPermissao } from "@/lib/gestao/permissoes"
import { AbrirPdvLink } from "@/components/comerciante/pdv/abrir-pdv"
import {
  AlertTriangle,
  BarChart3,
  BedDouble,
  Contact,
  Users,
  BookOpen,
  ChefHat,
  ChevronRight,
  Lock,
  MonitorSmartphone,
  Package,
  QrCode,
  Receipt,
  ReceiptText,
} from "lucide-react"

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function dataHoje() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
}

function Numero({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", destaque && "text-amber-600")}>
        {valor}
      </p>
    </div>
  )
}

function Atalho({
  href,
  icon: Icon,
  titulo,
  detalhe,
  bloqueado,
}: {
  href: string
  icon: typeof Package
  titulo: string
  detalhe: string
  bloqueado?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {titulo}
          {bloqueado && <Lock className="h-3 w-3 text-muted-foreground" />}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  )
}

// Resumo do dia da área Gestão. Números de pedidos só com a feature
// pedido_online e para quem opera pedidos; faturamento e ticket só com
// vendas:ver; atalhos conforme as permissões do papel.
export default async function GestaoResumoPage() {
  const base = await getPainelBase()
  if (!base) return null

  const { features } = base.comercio.plan
  const { permissoes } = base
  const pedidoOnline = temFeature(features, "pedido_online")
  const operaPedidos = pedidoOnline && temPermissao(permissoes, "pedidos:operar")
  const verVendas = temPermissao(permissoes, "vendas:ver")
  const temCardapio = temFeature(features, "cardapio")
  const hospedagem = base.comercio.categorias.includes("HOSPEDAGEM")
  const atalhoCardapio = temPermissao(permissoes, "cardapio:editar", "itens:disponibilidade")
  const atalhoProdutos = temPermissao(permissoes, "catalogo:editar", "itens:disponibilidade")
  const atalhoQuartos = hospedagem && temPermissao(permissoes, "quartos:editar")
  // Equipe fica fora da barra inferior do mobile — o atalho é o caminho no celular.
  const atalhoEquipe = temPermissao(permissoes, "equipe:gerenciar")
  const atalhoClientes = temPermissao(permissoes, "clientes:ver")
  const temClientes = temFeature(features, "gestao_clientes")
  const temEquipe = temFeature(features, "gestao_equipe")
  // Venda manual/relatórios independem de pedido online (decisão 4 da Fase 3).
  const registraVendas = temFeature(features, "gestao_relatorios") && temPermissao(permissoes, "vendas:registrar")
  const atalhoProducao = temFeature(features, "gestao_relatorios") && temPermissao(permissoes, "pedidos:operar")
  const atalhoMesas = temFeature(features, "gestao_relatorios") && temPermissao(permissoes, "pedidos:configurar")
  const r = await getResumoData(base.comercio.id, { pedidos: operaPedidos, vendas: registraVendas })

  const ticketMedio = r.hoje && r.hoje.concluidos > 0 ? r.hoje.faturamento / r.hoje.concluidos : 0

  return (
    <div className="space-y-6">
      {(operaPedidos || registraVendas) && r.hoje ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Hoje</h2>
                <span className="text-xs capitalize text-muted-foreground">{dataHoje()}</span>
              </div>
              {registraVendas && (
                <AbrirPdvLink className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                  <MonitorSmartphone className="h-4 w-4" /> Abrir PDV
                </AbrirPdvLink>
              )}
            </div>

            {operaPedidos && !r.aceitaPedidos && temPermissao(permissoes, "pedidos:configurar") && (
              <Link
                href="/comerciante/gestao/pedidos"
                className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Sua loja <strong>não está aceitando pedidos</strong>. Ligue em
                  Pedidos → Configuração.
                </span>
              </Link>
            )}

            <div className={cn("grid grid-cols-2 gap-3", operaPedidos && verVendas ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
              {operaPedidos && <Numero label="Aguardando" valor={String(r.aguardando)} destaque={r.aguardando > 0} />}
              {operaPedidos && <Numero label="Em andamento" valor={String(r.andamento)} />}
              <Numero label={operaPedidos ? "Pedidos hoje" : "Vendas hoje"} valor={String(r.hoje.pedidos)} />
              {registraVendas && !operaPedidos && <Numero label="Comandas abertas" valor={String(r.comandasAbertas)} />}
              {verVendas && <Numero label="Ticket médio" valor={formatBRL(ticketMedio)} />}
            </div>

            {verVendas && (
              <div className="rounded-lg bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">Faturamento de hoje</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{formatBRL(r.hoje.faturamento)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Soma das {r.hoje.concluidos} venda(s) concluída(s) hoje
                  {registraVendas ? " — online, balcão, telefone e comandas." : " pelo cardápio online."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !pedidoOnline && !registraVendas && verVendas ? (
        // Chamada para o recurso só para quem decide o plano (dono, gerente).
        <Card>
          <CardContent className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Receba pedidos pelo seu cardápio</p>
              <p className="text-sm text-muted-foreground">
                Com o pedido online, este resumo mostra os pedidos e o faturamento do
                dia. Disponível no plano Premium.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Atalhos</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {operaPedidos && (
            <Atalho
              href="/comerciante/gestao/pedidos"
              icon={ReceiptText}
              titulo="Pedidos"
              detalhe={r.aguardando > 0 ? `${r.aguardando} aguardando ação` : "Nenhum aguardando"}
            />
          )}
          {atalhoClientes && (
            <Atalho
              href="/comerciante/gestao/clientes"
              icon={Contact}
              titulo="Clientes"
              bloqueado={!temClientes}
              detalhe={
                temClientes
                  ? `${r.clientes.total} cliente(s) · ${r.clientes.novosMes} novo(s) no mês`
                  : "Disponível no plano Premium"
              }
            />
          )}
          {atalhoCardapio && (
            <Atalho
              href="/comerciante/gestao/cardapio"
              icon={BookOpen}
              titulo="Cardápio"
              bloqueado={!temCardapio}
              detalhe={
                !temCardapio
                  ? "Disponível no plano Premium"
                  : r.indisponiveis > 0
                    ? `${r.itensCardapio} itens · ${r.indisponiveis} indisponível(is)`
                    : `${r.itensCardapio} itens`
              }
            />
          )}
          {atalhoProdutos && (
            <Atalho
              href="/comerciante/gestao/produtos"
              icon={Package}
              titulo="Produtos e serviços"
              detalhe={`${r.produtos} produto(s) · ${r.servicos} serviço(s)`}
            />
          )}
          {atalhoQuartos && (
            <Atalho
              href="/comerciante/gestao/acomodacoes"
              icon={BedDouble}
              titulo="Acomodações"
              detalhe={`${r.quartos} tipo(s) de quarto ativo(s)`}
            />
          )}
          {registraVendas && (
            <Atalho
              href="/comerciante/gestao/vendas"
              icon={Receipt}
              titulo="Vendas"
              detalhe={r.comandasAbertas > 0 ? `Vendas do dia · ${r.comandasAbertas} comanda(s) aberta(s)` : "Vendas do dia, balcão, telefone e comandas"}
            />
          )}
          {verVendas && (
            <Atalho
              href="/comerciante/gestao/relatorios"
              icon={BarChart3}
              titulo="Relatórios"
              bloqueado={!temFeature(features, "gestao_relatorios")}
              detalhe={temFeature(features, "gestao_relatorios") ? "Faturamento, formas de pagamento, itens e equipe" : "Disponível no plano Premium"}
            />
          )}
          {atalhoProducao && (
            <Atalho href="/comerciante/gestao/producao" icon={ChefHat} titulo="Produção" detalhe="Rodadas das comandas para preparar" />
          )}
          {atalhoMesas && (
            <Atalho href="/comerciante/gestao/mesas" icon={QrCode} titulo="Mesas e QR Code" detalhe="O cliente vê a conta e chama o atendente pelo celular" />
          )}
          {atalhoEquipe && (
            <Atalho
              href="/comerciante/gestao/equipe"
              icon={Users}
              titulo="Equipe"
              bloqueado={!temEquipe}
              detalhe={
                temEquipe
                  ? `${r.membrosAtivos} pessoa(s) com acesso`
                  : "Disponível no plano Premium"
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
