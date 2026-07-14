// Envio de Web Push para os dispositivos do comerciante. Usado pelo
// POST /api/pedidos ao criar um pedido. As chaves VAPID vêm do .env
// (ver NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).
// Inscrições expiradas (404/410) são removidas do banco. Ver docs/pedido-online.md.

import "server-only"
import webpush from "web-push"
import { prisma } from "@/lib/prisma"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || "mailto:contato@guiasbs.com.br"

let configurado = false
function configurar(): boolean {
  if (configurado) return true
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configurado = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
}

// Dispara a notificação para todas as inscrições do comércio. Nunca lança:
// o envio é best-effort e não pode derrubar a criação do pedido.
export async function enviarPush(comercioId: string, payload: PushPayload): Promise<void> {
  if (!configurar()) return

  const subs = await prisma.pushSubscription.findMany({ where: { comercioId } })
  if (subs.length === 0) return

  const data = JSON.stringify(payload)
  const expiradas: string[] = []

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        )
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // 404/410 = inscrição morta (app removido, permissão revogada): limpa.
        if (status === 404 || status === 410) expiradas.push(s.id)
      }
    }),
  )

  if (expiradas.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiradas } } })
  }
}

// Texto padrão da notificação de novo pedido.
export function payloadNovoPedido(args: {
  numero: number
  total: number
  tipoEntrega: "ENTREGA" | "RETIRADA"
}): PushPayload {
  const totalBRL = args.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const tipo = args.tipoEntrega === "ENTREGA" ? "Entrega" : "Retirada"
  return {
    title: `🔔 Novo pedido #${args.numero}`,
    body: `${tipo} · ${totalBRL}`,
    url: "/comerciante/dashboard?tab=pedidos",
    tag: `pedido-${args.numero}`,
  }
}
