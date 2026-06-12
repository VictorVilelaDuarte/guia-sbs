import type { Categoria } from "@prisma/client"

// Rotas públicas top-level por categoria (Fase 3 do plano de SEO).
// Slugs "guarda-chuva" (decisão de 2026-06-11): termos corretos para toda a
// categoria, sem citar um tipo específico de estabelecimento — e sem a cidade
// no slug (o domínio/subdomínio carrega a cidade; pensando no multitenant).
// COMERCIO → "lojas" evita a colisão /comercio vs /comercios.
export const CATEGORIA_SLUG: Record<Categoria, string> = {
  ALIMENTACAO: "gastronomia",
  HOSPEDAGEM: "hospedagem",
  TURISMO: "turismo",
  SERVICO: "servicos",
  COMERCIO: "lojas",
  ENTRETENIMENTO: "entretenimento",
}

export const SLUG_CATEGORIA: Record<string, Categoria> = Object.fromEntries(
  Object.entries(CATEGORIA_SLUG).map(([cat, slug]) => [slug, cat as Categoria]),
)

export function categoriaPath(c: Categoria): string {
  return `/${CATEGORIA_SLUG[c]}`
}

// Copy centralizada das páginas de categoria (regra do multitenant: textos
// que citam a cidade ficam num único módulo). O intro é o parágrafo visível
// entre o hero e a listagem — é o que transforma uma "listagem filtrada"
// numa página sobre o assunto aos olhos do Google.
export interface CategoriaCopy {
  h1: string
  subtitulo: string
  title: string
  description: string
  intro: string
}

export const CATEGORIA_COPY: Record<Categoria, CategoriaCopy> = {
  ALIMENTACAO: {
    h1: "Gastronomia em São Bento do Sapucaí",
    subtitulo: "Restaurantes, cafés, bares e sabores da serra",
    title: "Gastronomia em São Bento do Sapucaí — restaurantes, cafés e bares",
    description:
      "Onde comer em São Bento do Sapucaí: restaurantes, cafés, bares, padarias e empórios da Serra da Mantiqueira. Veja cardápios, horários e quem está aberto agora.",
    intro:
      "Da truta da serra ao café passado na hora, a cozinha de São Bento do Sapucaí mistura tradição caipira com clima de montanha. Aqui estão os lugares para comer e beber na cidade — com cardápio, horários e contato direto.",
  },
  HOSPEDAGEM: {
    h1: "Hospedagem em São Bento do Sapucaí",
    subtitulo: "Pousadas, chalés e hotéis na Serra da Mantiqueira",
    title: "Hospedagem em São Bento do Sapucaí — pousadas, chalés e hotéis",
    description:
      "Onde ficar em São Bento do Sapucaí: pousadas, chalés e hotéis na Serra da Mantiqueira, muitos com vista para a Pedra do Baú. Compare opções e fale direto com o anfitrião.",
    intro:
      "Pousadas aconchegantes, chalés com lareira e hospedagens com vista para a Pedra do Baú. Encontre o lugar certo para a sua estadia na serra e fale direto com o anfitrião, sem intermediários.",
  },
  TURISMO: {
    h1: "Turismo em São Bento do Sapucaí",
    subtitulo: "Agências, guias e experiências na montanha",
    title: "Turismo em São Bento do Sapucaí — agências, guias e passeios",
    description:
      "Agências de turismo, guias e operadoras de São Bento do Sapucaí: trilhas, escalada na Pedra do Baú, voo livre, cavalgadas e passeios pela Serra da Mantiqueira.",
    intro:
      "Trilhas, escalada, voo livre e passeios rurais: São Bento do Sapucaí é a capital paulista dos esportes de montanha. Estes são os guias, agências e operadoras que levam você com segurança aos cenários da Serra da Mantiqueira.",
  },
  SERVICO: {
    h1: "Serviços em São Bento do Sapucaí",
    subtitulo: "Profissionais e empresas a serviço da cidade",
    title: "Serviços em São Bento do Sapucaí — profissionais e empresas locais",
    description:
      "Serviços em São Bento do Sapucaí: profissionais e empresas locais para o dia a dia de moradores e visitantes da cidade.",
    intro:
      "Do conserto urgente ao cuidado de todo dia: os profissionais e empresas de serviços que atendem moradores e visitantes de São Bento do Sapucaí.",
  },
  COMERCIO: {
    h1: "Lojas em São Bento do Sapucaí",
    subtitulo: "Artesanato, produtos da serra e comércio local",
    title: "Lojas em São Bento do Sapucaí — artesanato e comércio local",
    description:
      "Lojas e comércio local de São Bento do Sapucaí: artesanato, produtos da roça, moda, presentes e lembranças da Serra da Mantiqueira.",
    intro:
      "Artesanato em madeira, doces da roça, malhas de montanha e lembranças da viagem: o comércio de São Bento do Sapucaí tem alma de interior. Conheça as lojas da cidade.",
  },
  ENTRETENIMENTO: {
    h1: "Entretenimento em São Bento do Sapucaí",
    subtitulo: "Cultura, música e lazer na serra",
    title: "Entretenimento em São Bento do Sapucaí — cultura, música e lazer",
    description:
      "Entretenimento em São Bento do Sapucaí: espaços culturais, música ao vivo e opções de lazer para todas as idades na Serra da Mantiqueira.",
    intro:
      "Música ao vivo, espaços culturais e programas para fechar bem o dia na serra. Veja onde se divertir em São Bento do Sapucaí.",
  },
}
