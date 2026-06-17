import { Camera, BedDouble, ConciergeBell, ScrollText, Clock, PawPrint, Baby, CreditCard } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { GaleriaFotos } from "@/components/public/galeria-fotos"
import type { HorarioDia } from "@/lib/horarios"
import { formaPagamentoLabel } from "@/lib/hospedagem"
import { Topbar } from "./topbar"
import { Identidade } from "./identidade"
import { CtasRapidos } from "./ctas-rapidos"
import { SecaoHorarios } from "./secao-horarios"
import { SecaoLocalizacao } from "./secao-localizacao"
import { SecaoContato } from "./secao-contato"
import { ComodidadesPublicas } from "./comodidades-publicas"
import { QuartosVitrine } from "./quartos-vitrine"
import type { QuartoSheetData } from "./quarto-bottom-sheet"

interface PerfilData {
  comodidades: string[]
  checkIn: string | null
  checkOut: string | null
  politicaCancelamento: string | null
  aceitaPets: boolean
  aceitaCriancas: boolean
  formasPagamento: string[]
  observacoes: string | null
}

interface Props {
  comercio: {
    nome: string
    logo: string | null
    descricao: string | null
    status: string
    whatsapp: string | null
    instagram: string | null
    telefone: string | null
    website: string | null
    email: string | null
    lat: number | null
    lng: number | null
    fotos: { id: string; url: string; alt: string | null }[]
  }
  perfil: PerfilData | null
  quartos: (QuartoSheetData & { ordem: number; ativo: boolean })[]
  horarios: HorarioDia[] | null
  diaAtual: string
  enderecoCompleto: string
  isPublicado: boolean
}

const headingClass =
  "text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5"

export function VitrineHospedagem({
  comercio, perfil, quartos, horarios, diaAtual, enderecoCompleto, isPublicado,
}: Props) {
  const temComodidades = (perfil?.comodidades.length ?? 0) > 0
  const temPoliticas =
    !!perfil &&
    (!!perfil.checkIn || !!perfil.checkOut || !!perfil.politicaCancelamento ||
      perfil.formasPagamento.length > 0 || !!perfil.observacoes)

  const quartosSheet: QuartoSheetData[] = quartos.map((q) => ({
    id: q.id,
    nome: q.nome,
    descricao: q.descricao,
    precoNoite: q.precoNoite,
    capacidade: q.capacidade,
    camas: q.camas,
    tamanhoM2: q.tamanhoM2,
    comodidades: q.comodidades,
    fotos: q.fotos,
  }))

  return (
    <>
      <Topbar nome={comercio.nome} isPublicado={isPublicado} status={comercio.status} />

      <div className="max-w-2xl mx-auto px-4">
        <Identidade logo={comercio.logo} descricao={comercio.descricao} />

        <CtasRapidos
          whatsapp={comercio.whatsapp}
          instagram={comercio.instagram}
          lat={comercio.lat}
          lng={comercio.lng}
          website={comercio.website}
          telefone={comercio.telefone}
        />

        {/* Galeria */}
        {comercio.fotos.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className={headingClass}>
                <Camera className="h-3.5 w-3.5" />
                Fotos
              </h2>
              <GaleriaFotos fotos={comercio.fotos} nomeComercio={comercio.nome} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Comodidades */}
        {temComodidades && (
          <>
            <section className="mb-6">
              <h2 className={headingClass}>
                <ConciergeBell className="h-3.5 w-3.5" />
                O que oferecemos
              </h2>
              <ComodidadesPublicas comodidades={perfil!.comodidades} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Tipos de quarto */}
        {quartosSheet.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className={headingClass}>
                <BedDouble className="h-3.5 w-3.5" />
                Acomodações
              </h2>
              <QuartosVitrine quartos={quartosSheet} whatsapp={comercio.whatsapp} comercioNome={comercio.nome} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Políticas */}
        {temPoliticas && (
          <>
            <section className="mb-6">
              <h2 className={headingClass}>
                <ScrollText className="h-3.5 w-3.5" />
                Políticas e regras
              </h2>
              <div className="space-y-3 text-sm text-foreground">
                {(perfil!.checkIn || perfil!.checkOut) && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {perfil!.checkIn && <>Check-in a partir das <strong>{perfil!.checkIn}</strong></>}
                      {perfil!.checkIn && perfil!.checkOut && " · "}
                      {perfil!.checkOut && <>Check-out até <strong>{perfil!.checkOut}</strong></>}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-muted-foreground shrink-0" />
                    {perfil!.aceitaPets ? "Aceita pets" : "Não aceita pets"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-muted-foreground shrink-0" />
                    {perfil!.aceitaCriancas ? "Aceita crianças" : "Não aceita crianças"}
                  </span>
                </div>
                {perfil!.formasPagamento.length > 0 && (
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{perfil!.formasPagamento.map(formaPagamentoLabel).join(" · ")}</span>
                  </div>
                )}
                {perfil!.politicaCancelamento && (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    <strong className="text-foreground">Cancelamento:</strong> {perfil!.politicaCancelamento}
                  </p>
                )}
                {perfil!.observacoes && (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{perfil!.observacoes}</p>
                )}
              </div>
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Horários (recepção) — opcional */}
        {horarios && <SecaoHorarios horarios={horarios} diaAtual={diaAtual} />}

        {/* Localização */}
        {enderecoCompleto && (
          <SecaoLocalizacao
            enderecoCompleto={enderecoCompleto}
            lat={comercio.lat}
            lng={comercio.lng}
            nome={comercio.nome}
            logo={comercio.logo}
          />
        )}

        <SecaoContato
          telefone={comercio.telefone}
          whatsapp={comercio.whatsapp}
          email={comercio.email}
          website={comercio.website}
          instagram={comercio.instagram}
        />
      </div>
    </>
  )
}
