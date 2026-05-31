import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PontoTuristicoForm } from "@/components/admin/ponto-turistico-form"
import { PontoTuristicoFotos } from "@/components/admin/ponto-turistico-fotos"
import { CATEGORIA_LABELS } from "@/components/admin/pontos-turisticos-manager"

export default async function EditarPontoTuristicoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ponto = await prisma.pontoTuristico.findUnique({ where: { id } })
  if (!ponto) notFound()

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/pontos-turisticos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Pontos Turísticos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{ponto.nome}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {CATEGORIA_LABELS[ponto.categoria]}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <PontoTuristicoFotos pontoId={ponto.id} fotosIniciais={ponto.fotos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <PontoTuristicoForm
            id={ponto.id}
            categoria={ponto.categoria}
            inicial={{
              nome: ponto.nome,
              descricao: ponto.descricao,
              ativo: ponto.ativo,
              cep: ponto.cep,
              endereco: ponto.endereco,
              numero: ponto.numero,
              bairro: ponto.bairro,
              cidade: ponto.cidade,
              estado: ponto.estado,
              lat: ponto.lat,
              lng: ponto.lng,
              dicas: ponto.dicas,
              dificuldade: ponto.dificuldade,
              distanciaKm: ponto.distanciaKm,
              duracaoMin: ponto.duracaoMin,
              altitudeM: ponto.altitudeM,
              temPiscinaNatural: ponto.temPiscinaNatural,
              precisaGuia: ponto.precisaGuia,
              periodo: ponto.periodo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
