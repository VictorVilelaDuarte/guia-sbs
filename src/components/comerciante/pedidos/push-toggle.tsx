"use client"

import { useEffect, useState } from "react"
import { Bell, BellRing, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Ativa/desativa Web Push neste aparelho. Registra o service worker mínimo
// (/sw-push.js) e inscreve no PushManager com a chave VAPID pública. A
// inscrição é guardada no servidor via /api/comerciante/push.
// No iPhone, o push só existe se o site for instalado como PWA — por isso
// o componente trata o caso "não suportado" com uma orientação honesta.

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(normalized)
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

type Estado = "loading" | "unsupported" | "on" | "off" | "denied"

export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function detectar() {
      const suportado =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        !!VAPID
      if (!suportado) {
        if (!cancelado) setEstado("unsupported")
        return
      }
      if (Notification.permission === "denied") {
        if (!cancelado) setEstado("denied")
        return
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager.getSubscription()
        if (!cancelado) setEstado(sub ? "on" : "off")
      } catch {
        if (!cancelado) setEstado("off")
      }
    }
    detectar()
    return () => {
      cancelado = true
    }
  }, [])

  async function ativar() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        setEstado(perm === "denied" ? "denied" : "off")
        if (perm === "denied") {
          toast.error("Permissão negada. Reative nas configurações do navegador.")
        }
        return
      }
      const reg = await navigator.serviceWorker.register("/sw-push.js")
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      })
      const res = await fetch("/api/comerciante/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error()
      setEstado("on")
      toast.success("Notificações ativadas neste aparelho.")
    } catch {
      toast.error("Não foi possível ativar as notificações.")
      setEstado("off")
    } finally {
      setBusy(false)
    }
  }

  async function desativar() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/comerciante/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEstado("off")
      toast.success("Notificações desativadas neste aparelho.")
    } catch {
      toast.error("Não foi possível desativar.")
    } finally {
      setBusy(false)
    }
  }

  if (estado === "loading") return null

  if (estado === "unsupported") {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
        Este navegador não suporta notificações com a aba fechada. Mantenha esta
        página aberta para ouvir o alerta sonoro de novos pedidos.
      </div>
    )
  }

  if (estado === "denied") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
        Notificações bloqueadas. Reative nas configurações do navegador para ser
        avisado de novos pedidos.
      </div>
    )
  }

  const ativo = estado === "on"

  return (
    <button
      type="button"
      onClick={ativo ? desativar : ativar}
      disabled={busy}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60",
        ativo
          ? "border-green-200 bg-green-50 hover:bg-green-100/60"
          : "border-border bg-background hover:border-foreground/30",
      )}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
      ) : ativo ? (
        <BellRing className="h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1">
        <span className="block text-sm font-medium">
          {ativo ? "Notificações ativas neste aparelho" : "Ativar notificações de pedidos"}
        </span>
        <span className="block text-xs text-muted-foreground">
          {ativo
            ? "Você é avisado mesmo com o navegador fechado. Toque para desativar."
            : "Receba um alerta a cada novo pedido, mesmo fora desta aba."}
        </span>
      </span>
    </button>
  )
}
