import { randomInt } from "crypto"
import bcrypt from "bcryptjs"
import type { PapelMembro } from "@prisma/client"
import { prisma } from "@/lib/prisma"

// Regras da tela de equipe (Fase 1 / PR 3 do docs/modulo-gestao.md). Toda escrita
// de vínculo passa por aqui — as rotas só autenticam, autorizam e traduzem erros.

export interface MembroEquipe {
  id: string // ComercioMembro.id
  userId: string
  nome: string
  email: string
  papel: PapelMembro
  ativo: boolean
  voce: boolean // o próprio usuário logado
  titular: boolean // Comercio.ownerId — só o admin altera
  podeResetarSenha: boolean
  createdAt: string
}

// Sem caracteres ambíguos (0/O, 1/l/I) — a senha é ditada ou copiada no WhatsApp.
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function gerarSenhaTemporaria(tamanho = 10): string {
  let s = ""
  for (let i = 0; i < tamanho; i++) s += ALFABETO[randomInt(ALFABETO.length)]
  return s
}

// Gerar nova senha só para quem pertence APENAS a este comércio e não é titular
// de nenhum. Sem essa regra, o dono da loja A adicionaria o dono da loja B como
// membro, resetaria a senha dele e tomaria a conta da loja B.
async function usuarioSoDesteComercio(userId: string, comercioId: string): Promise<boolean> {
  const [outrosVinculos, titularidades, user] = await Promise.all([
    prisma.comercioMembro.count({ where: { userId, comercioId: { not: comercioId } } }),
    prisma.comercio.count({ where: { ownerId: userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ])
  return outrosVinculos === 0 && titularidades === 0 && user?.role === "COMERCIANTE"
}

export async function listarEquipe(comercioId: string, userIdAtual: string): Promise<MembroEquipe[]> {
  const [comercio, membros] = await Promise.all([
    prisma.comercio.findUnique({ where: { id: comercioId }, select: { ownerId: true } }),
    prisma.comercioMembro.findMany({
      where: { comercioId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        papel: true,
        ativo: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ])

  // Quem tem vínculo em outro comércio ou é titular de algum não pode ter a
  // senha resetada por aqui — consulta única em vez de uma por membro.
  const userIds = membros.map((m) => m.userId)
  const [comOutrosVinculos, titulares] = await Promise.all([
    prisma.comercioMembro.findMany({
      where: { userId: { in: userIds }, comercioId: { not: comercioId } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.comercio.findMany({
      where: { ownerId: { in: userIds } },
      select: { ownerId: true },
      distinct: ["ownerId"],
    }),
  ])
  const bloqueados = new Set([
    ...comOutrosVinculos.map((m) => m.userId),
    ...titulares.map((c) => c.ownerId),
  ])

  return membros.map((m) => {
    const voce = m.userId === userIdAtual
    const titular = m.userId === comercio?.ownerId
    return {
      id: m.id,
      userId: m.userId,
      nome: m.user.name,
      email: m.user.email,
      papel: m.papel,
      ativo: m.ativo,
      voce,
      titular,
      podeResetarSenha: !voce && !titular && !bloqueados.has(m.userId),
      createdAt: m.createdAt.toISOString(),
    }
  })
}

export class ErroEquipe extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message)
  }
}

async function carregarMembro(membroId: string, comercioId: string, userIdAtual: string) {
  const membro = await prisma.comercioMembro.findUnique({
    where: { id: membroId },
    select: {
      id: true,
      userId: true,
      papel: true,
      ativo: true,
      comercioId: true,
      comercio: { select: { ownerId: true } },
    },
  })
  if (!membro || membro.comercioId !== comercioId) throw new ErroEquipe("Membro não encontrado.", 404)
  if (membro.userId === userIdAtual) {
    throw new ErroEquipe("Você não pode alterar o próprio acesso.")
  }
  if (membro.userId === membro.comercio.ownerId) {
    throw new ErroEquipe("O titular do comércio só pode ser alterado pelo administrador do guia.")
  }
  return membro
}

// Garante que continua existindo ao menos um DONO ativo depois da mudança.
async function garantirOutroDono(membro: { id: string; papel: PapelMembro; ativo: boolean }, comercioId: string) {
  if (membro.papel !== "DONO" || !membro.ativo) return
  const outros = await prisma.comercioMembro.count({
    where: { comercioId, papel: "DONO", ativo: true, id: { not: membro.id } },
  })
  if (outros === 0) throw new ErroEquipe("O comércio precisa ter pelo menos um dono ativo.")
}

export async function adicionarMembro(args: {
  comercioId: string
  nome: string
  email: string
  papel: PapelMembro
}): Promise<{ membroId: string; senhaTemporaria: string | null }> {
  const email = args.email.trim().toLowerCase()
  const existente = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, role: true },
  })

  if (existente) {
    if (existente.role !== "COMERCIANTE") {
      throw new ErroEquipe("Este e-mail pertence a um administrador do guia e não pode entrar na equipe.")
    }
    const jaMembro = await prisma.comercioMembro.findUnique({
      where: { comercioId_userId: { comercioId: args.comercioId, userId: existente.id } },
      select: { id: true },
    })
    if (jaMembro) throw new ErroEquipe("Esta pessoa já faz parte da equipe.")
    // Conta existente: só o vínculo. A senha continua sendo a da pessoa.
    const membro = await prisma.comercioMembro.create({
      data: { comercioId: args.comercioId, userId: existente.id, papel: args.papel },
      select: { id: true },
    })
    return { membroId: membro.id, senhaTemporaria: null }
  }

  const senhaTemporaria = gerarSenhaTemporaria()
  const user = await prisma.user.create({
    data: {
      name: args.nome.trim(),
      email,
      password: await bcrypt.hash(senhaTemporaria, 10),
      role: "COMERCIANTE",
      trocarSenha: true,
      membros: { create: { comercioId: args.comercioId, papel: args.papel } },
    },
    select: { membros: { select: { id: true } } },
  })
  return { membroId: user.membros[0].id, senhaTemporaria }
}

export async function alterarMembro(args: {
  membroId: string
  comercioId: string
  userIdAtual: string
  papel?: PapelMembro
  ativo?: boolean
}) {
  const membro = await carregarMembro(args.membroId, args.comercioId, args.userIdAtual)
  const deixaDeSerDonoAtivo =
    (args.papel !== undefined && args.papel !== "DONO") || args.ativo === false
  if (deixaDeSerDonoAtivo) await garantirOutroDono(membro, args.comercioId)

  return prisma.comercioMembro.update({
    where: { id: membro.id },
    data: {
      ...(args.papel !== undefined ? { papel: args.papel } : {}),
      ...(args.ativo !== undefined ? { ativo: args.ativo } : {}),
    },
    select: { id: true, papel: true, ativo: true },
  })
}

// Remove o vínculo. Se a pessoa não tiver vínculo em nenhum outro comércio nem
// for titular de algum, a conta é apagada junto (decisão de 2026-09-12) — senão
// sobraria um login que só vê "Nenhum comércio vinculado".
export async function removerMembro(args: { membroId: string; comercioId: string; userIdAtual: string }) {
  const membro = await carregarMembro(args.membroId, args.comercioId, args.userIdAtual)
  await garantirOutroDono(membro, args.comercioId)
  const apagarConta = await usuarioSoDesteComercio(membro.userId, args.comercioId)

  await prisma.$transaction(async (tx) => {
    await tx.comercioMembro.delete({ where: { id: membro.id } })
    if (apagarConta) await tx.user.delete({ where: { id: membro.userId } })
  })
  return { contaApagada: apagarConta }
}

export async function resetarSenhaMembro(args: { membroId: string; comercioId: string; userIdAtual: string }) {
  const membro = await carregarMembro(args.membroId, args.comercioId, args.userIdAtual)
  if (!(await usuarioSoDesteComercio(membro.userId, args.comercioId))) {
    throw new ErroEquipe(
      "Esta pessoa também tem acesso a outro comércio — a senha só pode ser trocada por ela mesma.",
    )
  }
  const senhaTemporaria = gerarSenhaTemporaria()
  await prisma.user.update({
    where: { id: membro.userId },
    data: { password: await bcrypt.hash(senhaTemporaria, 10), trocarSenha: true },
  })
  return { senhaTemporaria }
}
