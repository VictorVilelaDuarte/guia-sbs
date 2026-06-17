"use client"

import { PerfilForm } from "./hospedagem/perfil-form"
import { QuartosManager } from "./hospedagem/quartos-manager"
import type { HospedagemPerfilData, TipoQuartoData } from "./hospedagem/types"

// Orquestrador da aba Hospedagem: perfil (comodidades + políticas) e quartos.
export function HospedagemManager({
  perfilInicial,
  quartosIniciais,
  quartoLimite,
}: {
  perfilInicial: HospedagemPerfilData | null
  quartosIniciais: TipoQuartoData[]
  quartoLimite?: number
}) {
  return (
    <div className="space-y-8">
      <QuartosManager quartosIniciais={quartosIniciais} limite={quartoLimite} />
      <div className="border-t border-border pt-6">
        <PerfilForm perfilInicial={perfilInicial} />
      </div>
    </div>
  )
}
