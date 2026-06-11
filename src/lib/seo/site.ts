// URL canônica do site — usada por metadataBase, sitemap, robots e JSON-LD.
// Definir NEXT_PUBLIC_SITE_URL na Vercel quando o domínio de produção for
// decidido (decisão em aberto — ver docs/seo.md e docs/multitenant.md).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const SITE_NAME = "Guia SBS"
export const CIDADE = "São Bento do Sapucaí"
