import Image from "next/image"
import Link from "next/link"
import { HeroBottomCurve } from "@/components/public/home/waves"

interface Props {
  titulo: string
  subtitulo: string
  imageSrc: string
}

export function Hero({ titulo, subtitulo, imageSrc }: Props) {
  return (
    <div style={{ position: "relative", padding: "48px 24px 64px", background: "var(--sand-1)" }}>
      <Image src={imageSrc} alt="" fill className="object-cover" sizes="100vw" priority />
      <div style={{ position: "absolute", inset: 0, background: "rgba(30,16,6,.62)" }} />
      <div className="grain" />

      <div className="max-w-5xl mx-auto relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-4"
          style={{ color: "rgba(245,240,232,.6)", letterSpacing: ".04em" }}
        >
          ← Início
        </Link>
        <h1 className="serif" style={{
          fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
          fontWeight: 600,
          color: "#F8F2E6",
          letterSpacing: "-0.02em",
          margin: 0,
          textShadow: "0 2px 16px rgba(20,12,5,.45)",
        }}>
          {titulo}
        </h1>
        <p style={{
          color: "#EDE0C8",
          marginTop: 8,
          fontSize: 14,
          lineHeight: 1.5,
          textShadow: "0 1px 6px rgba(20,12,5,.5)",
        }}>
          {subtitulo}
        </p>
      </div>

      <HeroBottomCurve color="var(--sand-1)" />
    </div>
  )
}
