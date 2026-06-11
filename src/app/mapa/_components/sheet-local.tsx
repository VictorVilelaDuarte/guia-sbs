"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
import {
  X, Navigation, Route, Clock, Mountain, Droplets, Eye, Landmark, Share2, Check, MessageCircle,
} from "lucide-react"
import type { SelectedItem, ComercioMapa, PontoMapa, HorarioItem } from "../_types"
import type { Categoria, CategoriaPonto, Dificuldade } from "@prisma/client"

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORIA_LABEL: Record<Categoria, string> = {
  ALIMENTACAO: "Alimentação",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviço",
  COMERCIO: "Comércio",
  ENTRETENIMENTO: "Entretenimento",
}

const CATEGORIA_COR: Record<Categoria, string> = {
  ALIMENTACAO: "#F97316",
  HOSPEDAGEM: "#3B82F6",
  TURISMO: "#22C55E",
  SERVICO: "#A855F7",
  COMERCIO: "#F43F5E",
  ENTRETENIMENTO: "#EAB308",
}

const PT_LABEL: Record<CategoriaPonto, string> = {
  MIRANTE: "Mirante",
  TRILHA: "Trilha",
  HISTORICO: "Histórico",
  CACHOEIRA: "Cachoeira",
}

const PT_COR: Record<CategoriaPonto, string> = {
  MIRANTE: "#0EA5E9",
  TRILHA: "#16A34A",
  HISTORICO: "#D97706",
  CACHOEIRA: "#06B6D4",
}

const DIFICULDADE_LABEL: Record<Dificuldade, string> = {
  FACIL: "Fácil",
  MODERADA: "Moderada",
  DIFICIL: "Difícil",
}

const DIFICULDADE_COR: Record<Dificuldade, string> = {
  FACIL: "#16A34A",
  MODERADA: "#D97706",
  DIFICIL: "#DC2626",
}

const PALETTE = ["#F97316", "#3B82F6", "#22C55E", "#A855F7", "#F43F5E", "#EAB308"]
function palette(slug: string): string {
  let hash = 0
  for (const c of slug) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffffff
  return PALETTE[hash % PALETTE.length]
}

function formatDuracao(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function getDiaAtualNome(): string {
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
  const nome = formatter.format(new Date())
  return dias.find((d) => nome.toLowerCase().startsWith(d.toLowerCase())) ?? dias[new Date().getDay()]
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function MetaChip({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: color ? `${color}18` : "var(--sand-2)", color: color ?? "var(--ink-2)" }}>
      <Icon size={11} />
      {label}
    </span>
  )
}

function BtnAction({ href, variant, children, external }: { href: string; variant: "primary" | "ghost"; children: React.ReactNode; external?: boolean }) {
  const base: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: "12px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "inherit", cursor: "pointer" }
  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: "#2C2416", color: "#F5F0E8" },
    ghost: { ...base, background: "var(--sand-2)", color: "var(--ink)", border: "1.5px solid var(--sand-3)" },
  }
  return <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} style={styles[variant]}>{children}</Link>
}

function ShareButton({ nome, url }: { nome: string; url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const fullUrl = `${window.location.origin}${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: nome, text: `Confira ${nome} no Guia SBS!`, url: fullUrl })
      } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: "12px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "var(--sand-2)", color: "var(--ink)", border: "1.5px solid var(--sand-3)", whiteSpace: "nowrap" }}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? "Copiado!" : "Compartilhar"}
    </button>
  )
}

function GaleriaFotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  if (!fotos.length) return null
  return (
    <div style={{ margin: "0 -20px 14px", overflowX: "auto", display: "flex", gap: 8, padding: "0 20px", scrollbarWidth: "none" }}>
      {fotos.map((url, i) => (
        <div key={i} style={{ flexShrink: 0, width: 100, height: 80, borderRadius: 10, overflow: "hidden", position: "relative" }}>
          <Image src={url} alt={`${nome} foto ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="100px" />
        </div>
      ))}
    </div>
  )
}

function HorarioHoje({ horarios }: { horarios: HorarioItem[] }) {
  const diaAtual = getDiaAtualNome()
  const hoje = horarios.find((h) => h.dia === diaAtual)
  if (!hoje) return null

  const horarioStr = hoje.aberto
    ? hoje.temPausa && hoje.pausaInicio && hoje.pausaFim
      ? `${hoje.inicio}–${hoje.pausaInicio} · ${hoje.pausaFim}–${hoje.fim}`
      : `${hoje.inicio} – ${hoje.fim}`
    : "Fechado hoje"

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 10px", borderRadius: 10, background: hoje.aberto ? "rgba(34,197,94,.08)" : "rgba(44,36,22,.05)" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: hoje.aberto ? "#16A34A" : "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        Hoje
      </span>
      <span style={{ fontSize: 12, color: hoje.aberto ? "#16A34A" : "var(--muted)", fontWeight: 600 }}>
        {horarioStr}
      </span>
    </div>
  )
}

// ─── Sheet principal ──────────────────────────────────────────────────────────

function formatDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m de você` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km de você`
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function SheetLocal({ item, onClose, userLocation }: { item: SelectedItem; onClose: () => void; userLocation: { lat: number; lng: number } | null }) {
  const savedScrollY = useRef(0)

  useEffect(() => {
    savedScrollY.current = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.top = `-${savedScrollY.current}px`
    document.body.style.width = "100%"
    return () => {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      window.scrollTo(0, savedScrollY.current)
    }
  }, [])

  const root = typeof document !== "undefined" ? (document.getElementById("portal-root") ?? document.body) : null
  if (!root) return null

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,12,5,.35)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#FDFAF5", borderRadius: "20px 20px 0 0", paddingBottom: "env(safe-area-inset-bottom, 0px)", boxShadow: "0 -8px 40px rgba(20,12,5,.18)", maxHeight: "78vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(44,36,22,.15)" }} />
        </div>
        {/* Fechar */}
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 16, background: "rgba(44,36,22,.08)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color="#2C2416" />
        </button>
        {/* Conteúdo */}
        <div style={{ overflowY: "auto", padding: "4px 20px 32px", flex: 1 }}>
          {item.tipo === "comercio"
            ? <ComercioContent data={item.data} userLocation={userLocation} />
            : <PontoContent data={item.data} userLocation={userLocation} />}
        </div>
      </div>
    </div>,
    root
  )
}

// ─── Conteúdo do comércio ─────────────────────────────────────────────────────

function ComercioContent({ data, userLocation }: { data: ComercioMapa; userLocation: { lat: number; lng: number } | null }) {
  const cor = CATEGORIA_COR[data.categorias[0]] ?? "#888"
  const label = CATEGORIA_LABEL[data.categorias[0]] ?? ""
  const distancia = userLocation ? haversineKm(userLocation.lat, userLocation.lng, data.lat, data.lng) : null

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, overflow: "hidden", flexShrink: 0, background: data.logo ? "#fff" : `${palette(data.slug)}18`, border: "1.5px solid rgba(44,36,22,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {data.logo ? (
            <Image src={data.logo} alt={data.nome} width={60} height={60} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 700, color: palette(data.slug), fontFamily: "var(--font-serif)" }}>{data.nome[0]}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--ink)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.nome}
          </p>
          <span style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${cor}18`, color: cor }}>
            {label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: data.aberto ? "#22C55E" : "#9CA3AF", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: data.aberto ? "#16A34A" : "var(--muted)" }}>{data.statusLabel}</span>
          </div>
          {distancia !== null && (
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Navigation size={10} />
              {formatDistancia(distancia)}
            </p>
          )}
        </div>
      </div>

      {/* Galeria de fotos */}
      <GaleriaFotos fotos={data.fotos} nome={data.nome} />

      {/* Horário de hoje */}
      {data.horarios && <HorarioHoje horarios={data.horarios} />}

      {/* Botões */}
      <div style={{ display: "flex", gap: 8 }}>
        <BtnAction href={`/vitrine/${data.slug}?src=mapa`} variant="primary">Ver mais</BtnAction>
        <BtnAction href={mapsUrl(data.lat, data.lng)} variant="ghost" external>
          <Navigation size={14} />
          Chegar
        </BtnAction>
        {data.whatsapp && (
          <Link
            href={`https://wa.me/55${data.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 14px", borderRadius: 12, background: "#22C55E", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
          >
            <MessageCircle size={15} />
            WhatsApp
          </Link>
        )}
      </div>
    </>
  )
}

// ─── Conteúdo do ponto turístico ──────────────────────────────────────────────

function PontoContent({ data, userLocation }: { data: PontoMapa; userLocation: { lat: number; lng: number } | null }) {
  const cor = PT_COR[data.categoria]
  const label = PT_LABEL[data.categoria]
  const distancia = userLocation ? haversineKm(userLocation.lat, userLocation.lng, data.lat, data.lng) : null

  const PT_ICON: Record<CategoriaPonto, React.ElementType> = {
    MIRANTE: Eye,
    TRILHA: Route,
    HISTORICO: Landmark,
    CACHOEIRA: Droplets,
  }
  const Icon = PT_ICON[data.categoria]

  return (
    <>
      {/* Nome */}
      <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "var(--ink)", lineHeight: 1.2 }}>{data.nome}</p>

      {/* Galeria de fotos */}
      {data.fotos.length > 0 ? (
        <div style={{ margin: "0 -20px 14px", overflowX: "auto", display: "flex", gap: 8, padding: "0 20px", scrollbarWidth: "none" }}>
          {data.fotos.map((url, i) => (
            <div key={i} style={{ flexShrink: 0, width: data.fotos.length === 1 ? "calc(100vw - 40px)" : 160, height: 130, borderRadius: 12, overflow: "hidden", position: "relative" }}>
              <Image src={url} alt={`${data.nome} foto ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="160px" />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ width: "100%", height: 100, borderRadius: 14, marginBottom: 14, background: `${cor}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mountain size={36} style={{ color: cor, opacity: 0.35 }} />
        </div>
      )}

      {/* Descrição */}
      {data.descricao && (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {data.descricao}
        </p>
      )}

      {/* Badge + distância */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${cor}18`, color: cor }}>
          <Icon size={11} />
          {label}
        </span>
        {distancia !== null && (
          <span style={{ fontSize: 11, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Navigation size={10} />
            {formatDistancia(distancia)}
          </span>
        )}
      </div>

      {/* Metadados */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {data.categoria === "TRILHA" && (
          <>
            {data.dificuldade && <MetaChip icon={Route} label={DIFICULDADE_LABEL[data.dificuldade]} color={DIFICULDADE_COR[data.dificuldade]} />}
            {data.distanciaKm && <MetaChip icon={Route} label={`${data.distanciaKm} km`} />}
            {data.duracaoMin && <MetaChip icon={Clock} label={formatDuracao(data.duracaoMin)} />}
          </>
        )}
        {data.categoria === "MIRANTE" && data.altitudeM && (
          <MetaChip icon={Mountain} label={`${data.altitudeM} m`} color="#0EA5E9" />
        )}
        {data.categoria === "CACHOEIRA" && (
          <>
            {data.temPiscinaNatural && <MetaChip icon={Droplets} label="Piscina natural" color="#06B6D4" />}
            {data.precisaGuia && <MetaChip icon={Navigation} label="Requer guia" color="#D97706" />}
          </>
        )}
        {data.categoria === "HISTORICO" && data.periodo && (
          <MetaChip icon={Landmark} label={data.periodo} color="#D97706" />
        )}
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 8 }}>
        <BtnAction href={`/pontos-turisticos/${data.slug}`} variant="primary">Ver detalhes</BtnAction>
        <BtnAction href={mapsUrl(data.lat, data.lng)} variant="ghost" external>
          <Navigation size={14} />
          Chegar
        </BtnAction>
        <ShareButton nome={data.nome} url={`/pontos-turisticos/${data.slug}`} />
      </div>
    </>
  )
}
