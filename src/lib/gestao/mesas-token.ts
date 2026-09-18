import { randomBytes } from "node:crypto"

// Segredo do QR da mesa: 12 caracteres seguros para URL (e curtos no QR).
// Em módulo próprio para o seed usar sem carregar o Prisma.
export function novoToken() {
  return randomBytes(9).toString("base64url")
}
