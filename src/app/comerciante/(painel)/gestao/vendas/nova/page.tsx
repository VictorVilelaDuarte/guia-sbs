import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { NovaVendaForm, type ItemCatalogoVenda } from "@/components/comerciante/vendas/nova-venda-form"
import { getPainelBase } from "@/lib/painel/queries"
import { prisma } from "@/lib/prisma"
import { temPermissao } from "@/lib/gestao/permissoes"
import { paraNumero } from "@/lib/dinheiro"
import { precoEfetivo } from "@/lib/pedidos"
import { temFeature } from "@/lib/plan-features"

export default async function NovaVendaPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "vendas:registrar")) notFound()
  const { features } = base.comercio.plan
  if (!temFeature(features, "gestao_relatorios")) {
    return (
      <RecursoBloqueado
        titulo="Venda manual"
        descricao="Registre vendas do balcão e do telefone para ver o faturamento completo da loja, não só os pedidos online."
      />
    )
  }

  const [produtos, zonas] = await Promise.all([
    prisma.produto.findMany({
      where: { comercioId: base.comercio.id },
      orderBy: [{ titulo: "asc" }],
      select: {
        id: true, titulo: true, preco: true, precoPromo: true, promoFim: true, tipo: true,
        categoriaCardapio: { select: { nome: true } },
        categoriaCatalogo: { select: { nome: true } },
        variacoes: { orderBy: { ordem: "asc" }, select: { id: true, nome: true, preco: true } },
      },
    }),
    prisma.zonaEntrega.findMany({
      where: { comercioId: base.comercio.id, ativo: true },
      orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, taxa: true },
    }),
  ])

  // Só itens vendáveis: com preço ou com variações. Preço vigente considera promoção.
  const itens: ItemCatalogoVenda[] = produtos
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      grupo: p.categoriaCardapio?.nome ?? p.categoriaCatalogo?.nome ?? (p.tipo === "SERVICO" ? "Serviços" : "Produtos"),
      preco: p.variacoes.length > 0 ? null : precoEfetivo(p),
      variacoes: p.variacoes,
    }))
    .filter((i) => i.variacoes.length > 0 || i.preco != null)

  return (
    <div className="space-y-4">
      <Link href="/comerciante/gestao/vendas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Vendas
      </Link>
      <h2 className="text-lg font-semibold">Nova venda</h2>
      <NovaVendaForm
        itens={itens}
        zonas={zonas.map((z) => ({ ...z, taxa: paraNumero(z.taxa) }))}
        temPedidoOnline={temFeature(features, "pedido_online")}
        buscaClientes={temFeature(features, "gestao_clientes") && temPermissao(base.permissoes, "clientes:ver")}
      />
    </div>
  )
}
