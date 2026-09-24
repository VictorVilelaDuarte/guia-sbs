// "Complete seu perfil" — passos que fazem a vitrine aparecer mais e receber
// mais contatos. Fonte única para o Início e o box de Visitas da vitrine.
// Sem runtime (importado por Client e Server Components).

export interface PerfilCompletude {
  fotos: number
  temDescricao: boolean
  produtos: number
  tags: number
  temHorarios: boolean
  temLogo: boolean
  temMapa: boolean // lat/lng: sem isso a loja não aparece no mapa
  temWhatsapp: boolean
}

export interface PassoCompletude {
  id: string
  ok: boolean
  texto: string
  href: string
}

export function passosCompletude(p: PerfilCompletude): PassoCompletude[] {
  return [
    { id: "logo", ok: p.temLogo, texto: "Adicione uma logo", href: "/comerciante/vitrine/perfil" },
    { id: "fotos", ok: p.fotos >= 3, texto: `Tenha pelo menos 3 fotos (você tem ${p.fotos})`, href: "/comerciante/vitrine/fotos" },
    { id: "descricao", ok: p.temDescricao, texto: "Escreva uma descrição do seu negócio", href: "/comerciante/vitrine/perfil" },
    { id: "horarios", ok: p.temHorarios, texto: "Cadastre seus horários de funcionamento", href: "/comerciante/vitrine/perfil" },
    { id: "mapa", ok: p.temMapa, texto: "Marque o endereço no mapa", href: "/comerciante/vitrine/perfil" },
    { id: "whatsapp", ok: p.temWhatsapp, texto: "Informe o WhatsApp para contato", href: "/comerciante/vitrine/perfil" },
    { id: "tags", ok: p.tags >= 3, texto: `Cadastre 3+ palavras-chave (você tem ${p.tags})`, href: "/comerciante/vitrine/palavras-chave" },
    { id: "produtos", ok: p.produtos >= 1, texto: "Cadastre produtos, serviços ou cardápio", href: "/comerciante/gestao/produtos" },
  ]
}
