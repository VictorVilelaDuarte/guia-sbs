"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { beep } from "@/components/comerciante/pedidos/beep"

// Alerta de pedidos novos do painel inteiro. Vive no layout (e não na página de
// pedidos) para que som, título piscando e badge funcionem em qualquer tela —
// com rotas separadas, sair de Pedidos desmontaria um polling local.
// A lista completa continua sendo do PedidosManager; aqui só a contagem leve.

const POLL_MS = 15000

interface PedidosAlerta {
  aguardando: number
  refresh: () => void
}

const Ctx = createContext<PedidosAlerta | null>(null)

export function usePedidosAlerta() {
  return useContext(Ctx)
}

interface Resumo {
  aguardando: number
  novos: number
  agora: string
}

export function PedidosAlertaProvider({
  ativo,
  children,
}: {
  ativo: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const [aguardando, setAguardando] = useState(0)
  const [naoVistos, setNaoVistos] = useState(0)
  // `agora` do servidor na última consulta; null até a primeira (linha de base).
  const desdeRef = useRef<string | null>(null)

  const consultar = useCallback(async () => {
    try {
      const qs = desdeRef.current ? `?desde=${encodeURIComponent(desdeRef.current)}` : ""
      const res = await fetch(`/api/comerciante/pedidos/resumo${qs}`, { cache: "no-store" })
      if (!res.ok) return
      const data: Resumo = await res.json()
      const primeira = desdeRef.current === null
      desdeRef.current = data.agora
      setAguardando(data.aguardando)
      if (!primeira && data.novos > 0) {
        beep()
        setNaoVistos((n) => n + data.novos)
      }
    } catch {
      // mantém o estado; tenta de novo no próximo tick
    }
  }, [])

  useEffect(() => {
    if (!ativo) return
    const primeira = setTimeout(consultar, 0)
    const id = setInterval(consultar, POLL_MS)
    return () => {
      clearTimeout(primeira)
      clearInterval(id)
    }
  }, [ativo, consultar])

  // Pisca o título da janela enquanto houver pedidos novos não vistos.
  useEffect(() => {
    if (naoVistos <= 0) return
    const original = document.title
    let on = false
    const id = setInterval(() => {
      on = !on
      document.title = on ? `🔔 ${naoVistos} novo(s) pedido(s)` : original
    }, 1000)
    const limpar = () => setNaoVistos(0)
    window.addEventListener("focus", limpar)
    return () => {
      clearInterval(id)
      document.title = original
      window.removeEventListener("focus", limpar)
    }
  }, [naoVistos])

  // Clique na notificação de push com o painel já aberto: o service worker foca
  // a aba e pede a navegação por mensagem (client.navigate() só funciona em
  // abas controladas pelo SW, e o SW de push não assume o controle das páginas).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (e: MessageEvent) => {
      const url = e.data?.type === "navegar" ? e.data.url : null
      if (typeof url === "string" && url.startsWith("/comerciante")) router.push(url)
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [router])

  return (
    <Ctx.Provider value={{ aguardando: ativo ? aguardando : 0, refresh: consultar }}>
      {children}
    </Ctx.Provider>
  )
}
