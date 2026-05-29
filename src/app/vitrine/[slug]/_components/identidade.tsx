import Image from "next/image"
import { Store } from "lucide-react"

interface Props {
  logo: string | null
  descricao: string | null
}

export function Identidade({ logo, descricao }: Props) {
  return (
    <div className="flex gap-4 mt-10 mb-4">
      <div className="relative h-40 w-40 shrink-0 rounded-2xl shadow-lg overflow-hidden">
        {logo ? (
          <Image src={logo} alt="Logo" fill className="object-contain" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap flex-col">
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
          {descricao}
        </p>
      </div>
    </div>
  )
}
