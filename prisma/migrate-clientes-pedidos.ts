/**
 * Migração: cria os Clientes a partir dos pedidos existentes
 *
 * Fase 2 do módulo de gestão (docs/modulo-gestao.md §12.1). Pedidos anteriores ao
 * cadastro de clientes só têm o snapshot clienteNome/clienteWhats. Este script cria
 * um Cliente por loja + WhatsApp normalizado e liga `Pedido.clienteId`.
 *
 * - nome: o do pedido mais recente daquele WhatsApp na loja
 * - createdAt: data do primeiro pedido ("cliente desde")
 * - idempotente: cliente existente não é recriado nem renomeado; só pedidos com
 *   clienteId null são ligados
 *
 * Rodar: npx tsx prisma/migrate-clientes-pedidos.ts
 */

import { PrismaClient } from "@prisma/client"
import { normalizarWhatsapp } from "../src/lib/gestao/clientes"

const prisma = new PrismaClient()

async function main() {
  const pedidos = await prisma.pedido.findMany({
    select: { id: true, comercioId: true, clienteNome: true, clienteWhats: true, clienteId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  console.log(`🔍 ${pedidos.length} pedido(s)`)

  // Agrupa por loja + WhatsApp normalizado (pedidos em ordem cronológica).
  const grupos = new Map<string, { comercioId: string; whatsapp: string; nome: string; desde: Date; ids: string[] }>()
  let semWhats = 0
  for (const p of pedidos) {
    const whatsapp = normalizarWhatsapp(p.clienteWhats)
    if (!whatsapp) {
      semWhats++
      continue
    }
    const chave = `${p.comercioId}|${whatsapp}`
    const g = grupos.get(chave)
    if (g) {
      g.nome = p.clienteNome // o mais recente vence
      g.ids.push(p.id)
    } else {
      grupos.set(chave, { comercioId: p.comercioId, whatsapp, nome: p.clienteNome, desde: p.createdAt, ids: [p.id] })
    }
  }

  const { count: criados } = await prisma.cliente.createMany({
    data: [...grupos.values()].map((g) => ({
      comercioId: g.comercioId,
      whatsapp: g.whatsapp,
      nome: g.nome.trim() || "Cliente",
      createdAt: g.desde,
    })),
    skipDuplicates: true,
  })

  let ligados = 0
  for (const g of grupos.values()) {
    const cliente = await prisma.cliente.findUnique({
      where: { comercioId_whatsapp: { comercioId: g.comercioId, whatsapp: g.whatsapp } },
      select: { id: true },
    })
    if (!cliente) continue
    const { count } = await prisma.pedido.updateMany({
      where: { id: { in: g.ids }, clienteId: null },
      data: { clienteId: cliente.id },
    })
    ligados += count
  }

  console.log(`✅ ${grupos.size} cliente(s) identificados · ${criados} criado(s) agora · ${grupos.size - criados} já existiam`)
  console.log(`✅ ${ligados} pedido(s) ligados ao cliente${semWhats ? ` · ${semWhats} sem WhatsApp (ignorados)` : ""}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
