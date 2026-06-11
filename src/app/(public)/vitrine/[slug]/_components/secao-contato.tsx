import { Phone, MessageCircle, Globe, Mail, BookUser } from "lucide-react"
import { IconInstagram } from "./icon-instagram"
import { formatPhone } from "../_utils"

interface Props {
  telefone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  instagram: string | null
}

export function SecaoContato({ telefone, whatsapp, email, website, instagram }: Props) {
  const temContato = telefone || whatsapp || email || website || instagram
  if (!temContato) return null

  return (
    <section className="mb-12">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <BookUser className="h-3.5 w-3.5" />
        Contato
      </h2>
      <div className="space-y-3">
        {telefone && (
          <a
            href={`tel:${telefone.replace(/\D/g, "")}`}
            data-track="click_ligar"
            className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            {formatPhone(telefone)}
          </a>
        )}
        {whatsapp && (
          <a
            href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
            data-track="click_whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            {formatPhone(whatsapp)}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            {email}
          </a>
        )}
        {website && (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            data-track="click_site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
          >
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            {website}
          </a>
        )}
        {instagram && (
          <a
            href={`https://instagram.com/${instagram.replace("@", "")}`}
            data-track="click_instagram"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
          >
            <IconInstagram className="h-4 w-4 text-muted-foreground shrink-0" />
            {instagram}
          </a>
        )}
      </div>
    </section>
  )
}
