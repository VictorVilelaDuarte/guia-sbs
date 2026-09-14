// Formatação compartilhada pelas telas de clientes (servidor e client).

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatAniversario(a: { dia: number; mes: number } | null) {
  return a ? `${a.dia} de ${MESES[a.mes - 1]}` : null
}

// "(12) 99999-0000" a partir do número normalizado.
export function formatWhatsapp(w: string | null) {
  if (!w) return null
  if (w.length === 11) return `(${w.slice(0, 2)}) ${w.slice(2, 7)}-${w.slice(7)}`
  if (w.length === 10) return `(${w.slice(0, 2)}) ${w.slice(2, 6)}-${w.slice(6)}`
  return w
}

export function linkWhatsapp(w: string | null) {
  return w ? `https://wa.me/55${w}` : null
}

export function formatData(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(d)
}

export function haQuanto(d: Date | null, agora = new Date()) {
  if (!d) return null
  const dias = Math.floor((agora.getTime() - d.getTime()) / 86_400_000)
  if (dias <= 0) return "hoje"
  if (dias === 1) return "ontem"
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? "há 1 mês" : meses < 12 ? `há ${meses} meses` : `há mais de 1 ano`
}
