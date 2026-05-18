"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditarComercioForm } from "@/components/comerciante/editar-comercio-form"
import { LogoUploader } from "@/components/comerciante/logo-uploader"
import { FotosUploader } from "@/components/comerciante/fotos-uploader"
import { ProdutosManager } from "@/components/comerciante/produtos-manager"
import { TagsEditor } from "@/components/comerciante/tags-editor"
import { EventosManager, type Evento } from "@/components/comerciante/eventos-manager"
import { cn } from "@/lib/utils"

const ABAS = [
  { id: "informacoes", label: "Informações" },
  { id: "fotos",       label: "Fotos" },
  { id: "produtos",    label: "Produtos e serviços" },
  { id: "eventos",     label: "Eventos" },
  { id: "tags",        label: "Palavras-chave" },
] as const

type AbaId = (typeof ABAS)[number]["id"]

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
  fotos: Foto[]
  tags: Tag[]
  produtos: Produto[]
  eventos:  Evento[]
}

export function DashboardTabs({ comercio }: { comercio: ComercioParaDashboard }) {
  const [aba, setAba] = useState<AbaId>("informacoes")

  return (
    <div>
      {/* Navegação das abas */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none -mx-6 px-6">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={cn(
              "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              aba === a.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
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
            </CardHeader>
            <CardContent>
              <FotosUploader fotosIniciais={comercio.fotos} />
            </CardContent>
          </Card>
        )}

        {aba === "produtos" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produtos e serviços</CardTitle>
              <p className="text-sm text-muted-foreground">
                Exibidos no perfil público e usados na busca do guia.
              </p>
            </CardHeader>
            <CardContent>
              <ProdutosManager produtosIniciais={comercio.produtos} />
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
                Ajudam clientes a encontrar seu comércio na busca. Ex: bolo, delivery, almoço, conserto.
              </p>
            </CardHeader>
            <CardContent>
              <TagsEditor tagsIniciais={comercio.tags} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
