import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ShareButton } from "@/components/public/share-button"

interface Props {
  nome: string
  isPublicado: boolean
  status: string
}

export function Topbar({ nome, isPublicado, status }: Props) {
  return (
    <>
      {!isPublicado && (
        <div className="bg-amber-500 text-white text-xs font-medium text-center py-2 px-4">
          Pré-visualização — este comércio ainda não está publicado ({status})
        </div>
      )}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <p className="text-lg leading-relaxed whitespace-pre-line text-foreground">
              {nome}
            </p>
          </Link>
          <span data-track="click_share">
            <ShareButton title={nome} />
          </span>
        </div>
      </div>
    </>
  )
}
