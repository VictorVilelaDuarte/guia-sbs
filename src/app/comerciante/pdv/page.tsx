import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"
import { paraNumero } from "@/lib/dinheiro"
import { precoEfetivo } from "@/lib/pedidos"
import { listarComandasAbertas } from "@/lib/gestao/comandas"
import { PdvCliente } from "@/components/comerciante/pdv/pdv-cliente"
import type { ItemCatalogoPdv } from "@/components/comerciante/pdv/tipos"

export default async function PdvPage() {
  const base = await getPainelBase()
  if (!base) redirect("/comerciante")
  const { comercio, permissoes, ctx } = base
  // O layout já mostrou a tela de bloqueio; aqui só não carrega nada.
  if (!temPermissao(permissoes, "vendas:registrar") || !temFeature(comercio.plan.features, "gestao_relatorios")) return null

  const [produtos, zonas, config, comandas, usuario] = await Promise.all([
    prisma.produto.findMany({
      where: { comercioId: comercio.id },
      orderBy: [{ ordem: "asc" }, { titulo: "asc" }],
      select: {
        id: true, titulo: true, preco: true, precoPromo: true, promoFim: true, tipo: true, disponivel: true,
        categoriaCardapio: { select: { nome: true, ordem: true } },
        categoriaCatalogo: { select: { nome: true, ordem: true } },
        variacoes: { orderBy: { ordem: "asc" }, select: { id: true, nome: true, preco: true } },
      },
    }),
    prisma.zonaEntrega.findMany({
      where: { comercioId: comercio.id, ativo: true },
      orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, taxa: true },
    }),
    prisma.pedidoConfig.findUnique({ where: { comercioId: comercio.id }, select: { taxaServicoPct: true } }),
    listarComandasAbertas(comercio.id),
    prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }),
  ])

  // Grupos na ordem do painel: categorias do cardápio, depois as do catálogo,
  // depois o que não tem categoria. Só itens vendáveis (com preço ou variações).
  const itens: ItemCatalogoPdv[] = produtos
    .map((p) => {
      const grupo = p.categoriaCardapio
        ? { nome: p.categoriaCardapio.nome, ordem: p.categoriaCardapio.ordem }
        : p.categoriaCatalogo
          ? { nome: p.categoriaCatalogo.nome, ordem: 1000 + p.categoriaCatalogo.ordem }
          : { nome: p.tipo === "SERVICO" ? "Serviços" : "Produtos", ordem: p.tipo === "SERVICO" ? 3000 : 2000 }
      return {
        id: p.id,
        titulo: p.titulo,
        grupo: grupo.nome,
        grupoOrdem: grupo.ordem,
        disponivel: p.disponivel,
        preco: p.variacoes.length > 0 ? null : precoEfetivo(p),
        variacoes: p.variacoes,
      }
    })
    .filter((i) => i.variacoes.length > 0 || i.preco != null)

  return (
    <PdvCliente
      lojaId={comercio.id}
      lojaNome={comercio.nome}
      operador={usuario?.name ?? ""}
      isAdmin={ctx.isAdmin}
      itens={itens}
      zonas={zonas.map((z) => ({ ...z, taxa: paraNumero(z.taxa) }))}
      servicoPct={config?.taxaServicoPct != null ? paraNumero(config.taxaServicoPct) : null}
      comandasIniciais={comandas}
      temPedidoOnline={temFeature(comercio.plan.features, "pedido_online")}
      buscaClientes={temFeature(comercio.plan.features, "gestao_clientes") && temPermissao(permissoes, "clientes:ver")}
      podeDesconto={temPermissao(permissoes, "vendas:desconto")}
      podeCancelar={temPermissao(permissoes, "vendas:cancelar")}
      podeConfigurar={temPermissao(permissoes, "pedidos:configurar")}
    />
  )
}
