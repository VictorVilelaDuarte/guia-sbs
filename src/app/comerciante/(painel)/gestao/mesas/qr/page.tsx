import Link from "next/link"
import { notFound } from "next/navigation"
import QRCode from "qrcode"
import { ChevronLeft } from "lucide-react"
import { getPainelBase } from "@/lib/painel/queries"
import { listarMesas } from "@/lib/gestao/mesas"
import { linkDaMesa, rotuloMesa } from "@/lib/gestao/mesas-link"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"
import { SITE_URL } from "@/lib/seo/site"
import { Imprimir } from "@/components/comerciante/mesas/imprimir"

// Folha para imprimir e recortar: um cartaz por mesa com o QR. O QR é gerado no
// servidor (svg), então imprime igual em qualquer navegador e sem depender de rede.
export default async function QrMesasPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "pedidos:configurar")) notFound()
  if (!temFeature(base.comercio.plan.features, "gestao_relatorios")) notFound()

  const mesas = (await listarMesas(base.comercio.id)).filter((m) => m.ativa)
  const cartazes = await Promise.all(
    mesas.map(async (m) => ({
      ...m,
      svg: await QRCode.toString(linkDaMesa(m.token, SITE_URL), { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
    })),
  )

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href="/comerciante/gestao/mesas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Mesas
        </Link>
        <Imprimir />
      </div>
      <style>{`@media print { .no-print { display: none !important; } .cartaz { break-inside: avoid; page-break-inside: avoid; } }`}</style>

      {cartazes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cadastre mesas ativas para gerar os QR Codes.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cartazes.map((m) => (
            <div key={m.id} className="cartaz flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-5 text-center text-stone-900">
              <p className="text-sm font-medium">{base.comercio.nome}</p>
              <p className="text-3xl font-bold leading-none">{rotuloMesa(m.nome)}</p>
              {m.area && <p className="text-xs text-stone-500">{m.area}</p>}
              <div className="w-40" dangerouslySetInnerHTML={{ __html: m.svg }} />
              <p className="text-sm font-semibold">Aponte a câmera</p>
              <p className="text-xs text-stone-600">Veja sua conta, chame o atendente e peça a conta pelo celular.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
