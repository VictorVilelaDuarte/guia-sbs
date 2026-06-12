import type { MetadataRoute } from "next"
import { Categoria } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/seo/site"
import { categoriaPath } from "@/lib/seo/categorias"

// Sitemap dinâmico (suporte nativo do App Router — servido em /sitemap.xml).
// Inclui só conteúdo público indexável: vitrines ATIVO e pontos ativos.
// Revalida a cada hora — sem isso seria estático e comércios novos só
// entrariam no próximo deploy.
export const revalidate = 3600
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [comercios, pontos] = await Promise.all([
    prisma.comercio.findMany({
      where: { status: "ATIVO" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.pontoTuristico.findMany({
      where: { ativo: true },
      select: { slug: true, updatedAt: true },
    }),
  ])

  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/comercios`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/eventos`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/sao-bento-do-sapucai`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/pontos-turisticos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/mapa`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/para-comerciantes`, changeFrequency: "monthly", priority: 0.5 },
  ]

  // Rotas dedicadas de categoria (/gastronomia, /hospedagem, …) — Fase 3
  // do plano de SEO. As URLs antigas com query param redirecionam (308).
  const categorias: MetadataRoute.Sitemap = Object.values(Categoria).map((c) => ({
    url: `${SITE_URL}${categoriaPath(c)}`,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  const vitrines: MetadataRoute.Sitemap = comercios.map((c) => ({
    url: `${SITE_URL}/vitrine/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const pontosTuristicos: MetadataRoute.Sitemap = pontos.map((p) => ({
    url: `${SITE_URL}/pontos-turisticos/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  return [...estaticas, ...categorias, ...vitrines, ...pontosTuristicos]
}
