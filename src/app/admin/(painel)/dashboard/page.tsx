import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Store, Star, Clock } from "lucide-react"

async function getStats() {
  const [totalUsuarios, totalComercios, comerciosPremium, comerciosPendentes] =
    await Promise.all([
      prisma.user.count(),
      prisma.comercio.count(),
      prisma.comercio.count({ where: { plan: { slug: "premium" } } }),
      prisma.comercio.count({ where: { status: "PENDENTE" } }),
    ])

  return { totalUsuarios, totalComercios, comerciosPremium, comerciosPendentes }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    {
      title: "Usuários",
      value: stats.totalUsuarios,
      icon: Users,
      description: "cadastrados",
    },
    {
      title: "Comércios",
      value: stats.totalComercios,
      icon: Store,
      description: "cadastrados",
    },
    {
      title: "Premium",
      value: stats.comerciosPremium,
      icon: Star,
      description: "planos ativos",
    },
    {
      title: "Pendentes",
      value: stats.comerciosPendentes,
      icon: Clock,
      description: "aguardando aprovação",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do Guia SBS</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ title, value, icon: Icon, description }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
