import Link from "next/link"
import { ChevronLeft } from "lucide-react"

// Página institucional de texto corrido (Sobre, Termos, Privacidade): coluna
// estreita para leitura, mesma paleta do guia. Server Component.
export function PaginaTexto({
  titulo,
  subtitulo,
  atualizadoEm,
  children,
}: {
  titulo: string
  subtitulo?: string
  atualizadoEm?: string
  children: React.ReactNode
}) {
  return (
    <main style={{ background: "var(--sand-1)" }} className="flex-1">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-800">
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar ao guia
        </Link>
        <h1 className="serif mt-6 text-4xl font-semibold leading-tight" style={{ color: "var(--ink)" }}>
          {titulo}
        </h1>
        {subtitulo && <p className="mt-2 text-base text-stone-600">{subtitulo}</p>}
        {atualizadoEm && <p className="mt-2 text-xs text-stone-500">Última atualização: {atualizadoEm}</p>}
        <div className="texto-corrido mt-8 space-y-4 text-[15px] leading-relaxed text-stone-700 [&_a]:font-medium [&_a]:text-amber-800 [&_a]:underline [&_h2]:font-serif [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </div>
    </main>
  )
}
