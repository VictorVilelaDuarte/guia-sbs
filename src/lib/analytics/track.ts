"use client"

import type { TipoEvento, Origem } from "./types"

// Coleta client-side de analytics. Anônima por design (LGPD): o visitorId é
// um UUID gerado por sessão de navegação (sessionStorage), sem cookie e sem
// qualquer PII. sendBeacon garante entrega mesmo quando o usuário navega para
// fora (ex.: clique no WhatsApp abre outro app).

const VISITOR_KEY = "airotas_vid"
const VIEW_DEDUPE_PREFIX = "airotas_seen_"

function getVisitorId(): string | undefined {
  try {
    let id = sessionStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return undefined // sessionStorage indisponível (modo privado antigo etc.)
  }
}

export function track(
  comercioId: string,
  tipo: TipoEvento,
  opts?: { origem?: Origem; meta?: Record<string, string | number> },
) {
  try {
    const payload = JSON.stringify({
      comercioId,
      tipo,
      origem: opts?.origem,
      meta: opts?.meta,
      visitorId: getVisitorId(),
    })
    if (navigator.sendBeacon?.("/api/track", payload)) return
    fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {})
  } catch {
    // telemetria nunca quebra a página
  }
}

// Pageviews são deduplicados por comércio dentro da mesma sessão — recarregar
// a vitrine ou ir ao cardápio e voltar não conta visita nova.
export function trackViewOnce(
  comercioId: string,
  tipo: TipoEvento,
  opts?: { origem?: Origem; meta?: Record<string, string | number> },
) {
  try {
    const key = `${VIEW_DEDUPE_PREFIX}${tipo}_${comercioId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
  } catch {
    // sem sessionStorage, conta sem dedupe mesmo
  }
  track(comercioId, tipo, opts)
}

// Contexto de módulo: o VitrineTracker (montado nas páginas públicas do
// comércio) registra o comercioId corrente; componentes compartilhados
// (bottom sheet, galeria) trackeiam via trackCtx sem prop drilling. Fora de
// uma página de comércio (ex.: galeria nos pontos turísticos), o contexto é
// null e trackCtx vira no-op.
let comercioCtx: string | null = null

export function setComercioContext(id: string | null) {
  comercioCtx = id
}

export function trackCtx(
  tipo: TipoEvento,
  opts?: { origem?: Origem; meta?: Record<string, string | number> },
) {
  if (!comercioCtx) return
  track(comercioCtx, tipo, opts)
}

// Resolve a origem da visita: ?src= dos links internos vence; sem ele, o
// referrer decide entre Google e direto/link.
export function resolveOrigem(searchSrc: string | null): Origem {
  const validas: Origem[] = [
    "home_destaque", "home_abertos", "home_eventos", "eventos",
    "listagem", "mapa", "busca", "qr",
  ]
  if (searchSrc && (validas as string[]).includes(searchSrc)) return searchSrc as Origem
  try {
    if (document.referrer && new URL(document.referrer).hostname.includes("google")) {
      return "google"
    }
  } catch {
    // referrer ilegível
  }
  return "direto"
}
