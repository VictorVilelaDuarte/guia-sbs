import type { PapelMembro } from "@prisma/client"

// Permissões do painel do comércio por papel (decisão 3 do docs/modulo-gestao.md:
// papéis fixos, matriz em código). Módulo sem dependências de runtime — usado
// pelas rotas de API (barreira real) e pela interface (esconder o que não pode).

export type Permissao =
  | "vitrine:editar" // informações, logo, fotos, eventos, palavras-chave, comodidades
  | "analytics:ver"
  | "cardapio:editar"
  | "catalogo:editar"
  | "quartos:editar"
  | "itens:disponibilidade" // só ligar/desligar `disponivel` de itens do cardápio e do catálogo
  | "pedidos:operar" // ver pedidos, mudar status, receber alertas
  | "pedidos:configurar" // config de pedidos e zonas de entrega
  | "vendas:ver" // faturamento e ticket médio (relatórios na Fase 3)
  | "vendas:registrar" // venda manual (balcão e telefone)
  | "vendas:cancelar" // cancelar venda manual já concluída
  | "clientes:ver" // lista e detalhe de clientes
  | "clientes:editar" // cadastrar e editar clientes
  | "equipe:gerenciar"

const TODAS: readonly Permissao[] = [
  "vitrine:editar",
  "analytics:ver",
  "cardapio:editar",
  "catalogo:editar",
  "quartos:editar",
  "itens:disponibilidade",
  "pedidos:operar",
  "pedidos:configurar",
  "vendas:ver",
  "vendas:registrar",
  "vendas:cancelar",
  "clientes:ver",
  "clientes:editar",
  "equipe:gerenciar",
]

export const PERMISSOES_POR_PAPEL: Record<PapelMembro, readonly Permissao[]> = {
  DONO: TODAS,
  GERENTE: TODAS.filter((p) => p !== "equipe:gerenciar"),
  // Atendente vê clientes (já vê nome/WhatsApp nos pedidos), mas não edita.
  ATENDENTE: ["itens:disponibilidade", "pedidos:operar", "clientes:ver", "vendas:registrar"],
  PRODUCAO: ["pedidos:operar"],
}

// `null` = admin da plataforma gerenciando o comércio: pode tudo.
export function permissoesDo(papel: PapelMembro | null): readonly Permissao[] {
  return papel === null ? TODAS : PERMISSOES_POR_PAPEL[papel]
}

// Verdadeiro se a lista contém ALGUMA das permissões pedidas.
export function temPermissao(lista: readonly Permissao[], ...alguma: Permissao[]): boolean {
  return alguma.some((p) => lista.includes(p))
}

// Rótulos e descrições dos papéis para a interface (tela de equipe).
export const PAPEIS: readonly { papel: PapelMembro; label: string; descricao: string }[] = [
  { papel: "DONO", label: "Dono", descricao: "Acesso total, inclusive à equipe" },
  { papel: "GERENTE", label: "Gerente", descricao: "Tudo da operação e da vitrine, sem mexer na equipe" },
  { papel: "ATENDENTE", label: "Atendente", descricao: "Pedidos, vendas no balcão, disponibilidade dos itens e consulta de clientes" },
  { papel: "PRODUCAO", label: "Produção", descricao: "Só a fila de pedidos" },
]

export function papelLabel(papel: PapelMembro): string {
  return PAPEIS.find((p) => p.papel === papel)?.label ?? papel
}
