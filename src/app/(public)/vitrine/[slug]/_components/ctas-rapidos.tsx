import { MapPin, Phone, MessageCircle, Globe } from "lucide-react"
import { IconInstagram } from "./icon-instagram"

interface Props {
  whatsapp: string | null
  instagram: string | null
  lat: number | null
  lng: number | null
  website: string | null
  telefone: string | null
}

export function CtasRapidos({ whatsapp, instagram, lat, lng, website, telefone }: Props) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
      {whatsapp && (
        <a
          href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 shrink-0 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      )}
      {instagram && (
        <a
          href={`https://instagram.com/${instagram.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <IconInstagram className="h-4 w-4" />
          Instagram
        </a>
      )}
      {lat && lng && (
        <a
          href={`https://maps.google.com/?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Como chegar
        </a>
      )}
      {website && (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <Globe className="h-4 w-4" />
          Site
        </a>
      )}
      {telefone && (
        <a
          href={`tel:${telefone.replace(/\D/g, "")}`}
          className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <Phone className="h-4 w-4" />
          Ligar
        </a>
      )}
    </div>
  )
}
