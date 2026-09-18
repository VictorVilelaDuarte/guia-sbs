// Link do QR da mesa. Módulo sem runtime (nem Prisma): usado no servidor e na
// tela de cadastro, que roda no navegador.
export function linkDaMesa(token: string, base: string) {
  return `${base.replace(/\/$/, "")}/mesa/${token}`
}

// "4" → "Mesa 4"; "Varanda 2" → "Varanda 2" (o nome já diz onde é).
export function rotuloMesa(nome: string) {
  return /^\d+$/.test(nome.trim()) ? `Mesa ${nome}` : nome
}
