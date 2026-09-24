import { z } from "zod"
import { UnidadeProduto } from "@prisma/client"
import { normalizarCodigo } from "@/lib/produtos-codigos"

// Campos de cadastro compartilhados por POST /api/comerciante/produtos e
// PATCH .../[id]. Códigos chegam normalizados (sem espaços, maiúsculos, "" → null).

const codigo = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : normalizarCodigo(v)))

const custo = z.number().nonnegative().max(999999).nullable().optional()

export const variacaoSchema = z.object({
  nome: z.string().min(1).max(80),
  preco: z.number().nonnegative(),
  codigoBarras: codigo(40),
  codigoInterno: codigo(30),
  precoCusto: custo,
})

export const camposCadastroSchema = {
  codigoBarras: codigo(40),
  codigoInterno: codigo(30),
  marca: z
    .string()
    .max(60)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v?.trim() || null)),
  precoCusto: custo,
  unidade: z.enum(UnidadeProduto).optional(),
  noCatalogo: z.boolean().optional(),
  arquivado: z.boolean().optional(),
}
