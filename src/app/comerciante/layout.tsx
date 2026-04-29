import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"

export default async function ComercianteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/admin/login")

  const role = session.user.role
  if (role !== "COMERCIANTE") {
    redirect("/")
  }

  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  )
}
