import { MapPin } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { MapaView } from "@/components/public/mapa-view-dynamic"

interface Props {
  enderecoCompleto: string
  lat: number | null
  lng: number | null
  nome: string
  logo: string | null
}

export function SecaoLocalizacao({ enderecoCompleto, lat, lng, nome, logo }: Props) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          Localização
        </h2>
        <p className="text-sm text-muted-foreground mb-3">{enderecoCompleto}</p>
        {lat && lng && <MapaView lat={lat} lng={lng} nome={nome} logo={logo} />}
      </section>
      <Separator className="mb-6" />
    </>
  )
}
