import { Footer } from "@/components/public/home/footer"
import { BottomNav } from "@/components/public/home/bottom-nav"
import { websiteJsonLd } from "@/lib/seo/jsonld"
import { JsonLd } from "@/components/seo/json-ld"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <div>{children}</div>
      <Footer />
      <BottomNav />
    </>
  )
}
