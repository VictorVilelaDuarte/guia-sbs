import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ShareButton } from "@/components/public/share-button"

interface Props {
  nome: string
}

export function Topbar({ nome }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/pontos-turisticos"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-base font-medium text-foreground line-clamp-1">{nome}</span>
        </Link>
        <ShareButton title={nome} />
      </div>
    </div>
  )
}
