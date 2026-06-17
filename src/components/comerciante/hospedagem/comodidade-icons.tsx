import {
  Wifi, Car, Coffee, Waves, Bell, PawPrint, Wind, Thermometer, Tv,
  Refrigerator, Bath, BedDouble, Flame, Gamepad2, Droplets, Mountain,
  Trees, Accessibility, type LucideIcon,
} from "lucide-react"

// Mapa key→ícone das comodidades. Vive aqui (Client) porque ícones lucide não
// são serializáveis de Server para Client Component — o catálogo de keys/labels
// fica em src/lib/hospedagem.ts. Reutilizado pelo painel e pela vitrine pública.
export const COMODIDADE_ICON: Record<string, LucideIcon> = {
  wifi: Wifi,
  estacionamento: Car,
  cafe_da_manha: Coffee,
  piscina: Waves,
  recepcao_24h: Bell,
  aceita_pets: PawPrint,
  ar_condicionado: Wind,
  aquecimento: Thermometer,
  tv: Tv,
  frigobar: Refrigerator,
  banheiro_privativo: Bath,
  roupa_de_cama: BedDouble,
  churrasqueira: Flame,
  lareira: Flame,
  area_de_jogos: Gamepad2,
  hidromassagem: Droplets,
  vista_montanha: Mountain,
  vista_vale: Trees,
  acessivel: Accessibility,
}

export function ComodidadeIcon({ keyName, className }: { keyName: string; className?: string }) {
  const Icon = COMODIDADE_ICON[keyName] ?? BedDouble
  return <Icon className={className} />
}
