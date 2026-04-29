import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) redirect("/admin/login")

  const role = session.user.role
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    redirect("/admin/login")
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
