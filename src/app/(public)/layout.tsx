import { Footer } from "@/components/public/home/footer"
import { BottomNav } from "@/components/public/home/bottom-nav"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div>{children}</div>
      <Footer />
      <BottomNav />
    </>
  )
}
