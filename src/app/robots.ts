import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /busca é provisória e orientada a query — sem valor de indexação
        disallow: ["/admin", "/comerciante", "/api", "/busca"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
