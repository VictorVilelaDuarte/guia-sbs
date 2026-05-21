"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditarComercioForm } from "@/components/comerciante/editar-comercio-form"
import { LogoUploader } from "@/components/comerciante/logo-uploader"
import { FotosUploader } from "@/components/comerciante/fotos-uploader"
import { ProdutosManager } from "@/components/comerciante/produtos-manager"
import { CardapioManager } from "@/components/comerciante/cardapio-manager"
import { TagsEditor } from "@/components/comerciante/tags-editor"
import { EventosManager, type Evento } from "@/components/comerciante/eventos-manager"
import { cn } from "@/lib/utils"
import { temFeature, LIMITES_FREE, type FeatureKey } from "@/lib/plan-features"
import { Lock } from "lucide-react"
import { toast } from "sonner"

interface Foto     { id: string; url: string; alt: string | null; ordem: number }
interface Tag      { id: string; nome: string }
interface Produto {
  id: string; titulo: string; descricao: string | null
  preco: number | null; imagem: string | null
  disponivel: boolean; ordem: number
}

export interface ComercioParaDashboard {
  id: string
  nome: string
  descricao: string | null
  categoria: string
  cep: string | null
  endereco: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  lat: number | null
  lng: number | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  instagram: string | null
  horarios: string | null
  logo: string | null
  plan: { slug: string; features: unknown }
  fotos: Foto[]
  tags: Tag[]
  produtos: Produto[]
  eventos: Evento[]
  cardapioCategorias: CardapioCategoria[]
}

interface CardapioItem {
  id: string; titulo: string; descricao: string | null
  preco: number | null; imagem: string | null
  disponivel: boolean; ordem: number; categoriaId: string
}

interface CardapioCategoria {
  id: string; nome: string; ordem: number; itens: CardapioItem[]
}

interface AbaConfig {
  id: string
  label: string
  feature?: FeatureKey
}

const ABAS: AbaConfig[] = [
  { id: "informacoes", label: "Informações" },
  { id: "fotos",       label: "Fotos" },
  { id: "produtos",    label: "Produtos e serviços" },
  { id: "cardapio",    label: "Cardápio", feature: "cardapio" },
  { id: "eventos",     label: "Eventos", feature: "eventos" },
  { id: "tags",        label: "Palavras-chave" },
]

export function DashboardTabs({ comercio }: { comercio: ComercioParaDashboard }) {
  const [aba, setAba] = useState("informacoes")
  const features = comercio.plan.features

  const ilimitado    = temFeature(features, "fotos_ilimitadas")
  const fotoLimite   = ilimitado ? undefined : LIMITES_FREE.fotos
  const tagLimite    = ilimitado ? undefined : LIMITES_FREE.tags
  const produtoLimite = ilimitado ? undefined : LIMITES_FREE.produtos

  function handleTabClick(tabConfig: AbaConfig) {
    if (tabConfig.feature && !temFeature(features, tabConfig.feature)) {
      toast.info("Este recurso está disponível no plano Premium.", { duration: 3000 })
      return
    }
    setAba(tabConfig.id)
  }

  return (
    <div>
      <div className="flex border-b border-border overflow-x-auto scrollbar-none -mx-6 px-6">
        {ABAS.map((a) => {
          const bloqueada = !!a.feature && !temFeature(features, a.feature)
          const ativa = aba === a.id && !bloqueada

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => handleTabClick(a)}
              className={cn(
                "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5",
                ativa
                  ? "border-primary text-primary"
                  : bloqueada
                  ? "border-transparent text-muted-foreground/50 cursor-not-allowed"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {a.label}
              {bloqueada && <Lock className="h-3 w-3" />}
            </button>
          )
        })}
      </div>

      <div className="mt-6 space-y-6">
        {aba === "informacoes" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <LogoUploader logoAtual={comercio.logo} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <EditarComercioForm comercio={comercio} />
              </CardContent>
            </Card>
          </>
        )}

        {aba === "fotos" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fotos do comércio</CardTitle>
              {fotoLimite && (
                <p className="text-sm text-muted-foreground">
                  Plano Gratuito: até {fotoLimite} fotos.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <FotosUploader fotosIniciais={comercio.fotos} limite={fotoLimite} />
            </CardContent>
          </Card>
        )}

        {aba === "produtos" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produtos e serviços</CardTitle>
              <p className="text-sm text-muted-foreground">
                Exibidos no perfil público e usados na busca do guia.
                {produtoLimite ? ` Plano Gratuito: até ${produtoLimite} produtos.` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <ProdutosManager produtosIniciais={comercio.produtos} limite={produtoLimite} />
            </CardContent>
          </Card>
        )}

        {aba === "cardapio" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cardápio</CardTitle>
              <p className="text-sm text-muted-foreground">
                Organize itens por categoria e defina a ordem de exibição no perfil.
              </p>
            </CardHeader>
            <CardContent>
              <CardapioManager categoriasIniciais={comercio.cardapioCategorias} />
            </CardContent>
          </Card>
        )}

        {aba === "eventos" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eventos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Divulgue eventos, promoções e datas especiais do seu comércio.
              </p>
            </CardHeader>
            <CardContent>
              <EventosManager eventosIniciais={comercio.eventos} />
            </CardContent>
          </Card>
        )}

        {aba === "tags" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Palavras-chave</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ajudam clientes a encontrar seu comércio na busca.{" "}
                {tagLimite ? `Plano Gratuito: até ${tagLimite} palavras-chave.` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <TagsEditor tagsIniciais={comercio.tags} limite={tagLimite} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
