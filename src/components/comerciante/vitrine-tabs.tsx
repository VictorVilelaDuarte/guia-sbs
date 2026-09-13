"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarComercioForm } from "@/components/comerciante/editar-comercio-form";
import { LogoUploader } from "@/components/comerciante/logo-uploader";
import { FotosUploader } from "@/components/comerciante/fotos-uploader";
import { PerfilForm } from "@/components/comerciante/hospedagem/perfil-form";
import type { HospedagemPerfilData } from "@/components/comerciante/hospedagem/types";
import { TagsEditor } from "@/components/comerciante/tags-editor";
import {
  EventosManager,
  type Evento,
} from "@/components/comerciante/eventos-manager";
import { AnalyticsPanel } from "@/components/comerciante/analytics-panel";
import type { AnalyticsResumo } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { temFeature, LIMITES_FREE, type FeatureKey } from "@/lib/plan-features";
import { temPermissao, type Permissao } from "@/lib/gestao/permissoes";
import { Lock } from "lucide-react";
import { toast } from "sonner";

// Área "Minha vitrine" do painel: tudo que existe para o comércio ser
// encontrado no guia. Cardápio, catálogo, pedidos e quartos ficam na área
// Gestão (/comerciante/gestao/*) — ver docs/modulo-gestao.md.

interface Foto {
  id: string;
  url: string;
  alt: string | null;
  ordem: number;
}
interface Tag {
  id: string;
  nome: string;
}
export interface SubcategoriaBasica {
  id: string;
  nome: string;
  categoria: string;
}

export interface ComercioParaVitrine {
  id: string;
  nome: string;
  descricao: string | null;
  categorias: string[];
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  lat: number | null;
  lng: number | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  horarios: string | null;
  logo: string | null;
  plan: { slug: string; features: unknown };
  fotos: Foto[];
  tags: Tag[];
  subcategorias: SubcategoriaBasica[];
  eventos: Evento[];
  hospedagemPerfil: HospedagemPerfilData | null;
}

interface AbaConfig {
  id: string;
  label: string;
  feature?: FeatureKey;
  // Quando definido, a aba só aparece se o comércio tiver essa categoria.
  categoria?: string;
  permissao: Permissao;
}

const ABAS: AbaConfig[] = [
  { id: "informacoes", label: "Informações", permissao: "vitrine:editar" },
  // sem `feature`: a aba abre para todos — o plano FREE vê o teaser
  { id: "analytics", label: "Analytics", permissao: "analytics:ver" },
  { id: "fotos", label: "Fotos", permissao: "vitrine:editar" },
  {
    id: "hospedagem",
    label: "Comodidades e políticas",
    categoria: "HOSPEDAGEM",
    permissao: "vitrine:editar",
  },
  { id: "eventos", label: "Eventos", feature: "eventos", permissao: "vitrine:editar" },
  { id: "tags", label: "Palavras-chave", permissao: "vitrine:editar" },
];

export function VitrineTabs({
  comercio,
  subcategoriasDisponiveis,
  analytics,
  produtosCount,
  permissoes,
  abaInicial,
}: {
  comercio: ComercioParaVitrine;
  subcategoriasDisponiveis: SubcategoriaBasica[];
  analytics: AnalyticsResumo;
  produtosCount: number;
  permissoes: readonly Permissao[];
  abaInicial?: string;
}) {
  const features = comercio.plan.features;

  // Abas com `categoria` só aparecem para comércios daquela categoria; abas
  // sem permissão do papel não aparecem.
  const abasVisiveis = ABAS.filter(
    (a) =>
      (!a.categoria || comercio.categorias.includes(a.categoria)) &&
      temPermissao(permissoes, a.permissao),
  );
  const abaPadrao = abasVisiveis[0]?.id ?? "informacoes";

  // Deep-link via ?tab=. Valida que a aba está visível e não está bloqueada por
  // plano — determinístico (mesmo no SSR e client).
  const [aba, setAba] = useState(() => {
    const cfg = abasVisiveis.find((a) => a.id === abaInicial);
    if (!cfg) return abaPadrao;
    if (cfg.feature && !temFeature(features, cfg.feature)) return abaPadrao;
    return cfg.id;
  });

  const ilimitado = temFeature(features, "fotos_ilimitadas");
  const fotoLimite = ilimitado ? undefined : LIMITES_FREE.fotos;
  const tagLimite = ilimitado ? undefined : LIMITES_FREE.tags;

  function handleTabClick(tabConfig: AbaConfig) {
    if (tabConfig.feature && !temFeature(features, tabConfig.feature)) {
      toast.info("Este recurso está disponível no plano Premium.", {
        duration: 3000,
      });
      return;
    }
    setAba(tabConfig.id);
  }

  return (
    <div>
      <div className="flex border-b border-border overflow-x-auto scrollbar-none -mx-6 px-6">
        {abasVisiveis.map((a) => {
          const bloqueada = !!a.feature && !temFeature(features, a.feature);
          const ativa = aba === a.id && !bloqueada;

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => handleTabClick(a)}
              className={cn(
                "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer",
                ativa
                  ? "border-primary text-primary"
                  : bloqueada
                    ? "border-transparent text-muted-foreground/50 cursor-not-allowed"
                    : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {a.label}
              {bloqueada && <Lock className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-6">
        {aba === "analytics" && (
          <AnalyticsPanel
            data={analytics}
            premium={temFeature(features, "analytics")}
            perfil={{
              fotos: comercio.fotos.length,
              temDescricao: !!comercio.descricao,
              produtos: produtosCount,
              tags: comercio.tags.length,
              temHorarios: !!comercio.horarios,
              temLogo: !!comercio.logo,
            }}
          />
        )}

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
                <EditarComercioForm
                  comercio={comercio}
                  subcategoriasDisponiveis={subcategoriasDisponiveis}
                />
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
              <FotosUploader
                fotosIniciais={comercio.fotos}
                limite={fotoLimite}
              />
            </CardContent>
          </Card>
        )}

        {aba === "hospedagem" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comodidades e políticas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Exibidas na sua vitrine. Os tipos de quarto ficam em Gestão → Acomodações.
              </p>
            </CardHeader>
            <CardContent>
              <PerfilForm perfilInicial={comercio.hospedagemPerfil} />
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
                {tagLimite
                  ? `Plano Gratuito: até ${tagLimite} palavras-chave.`
                  : ""}
              </p>
            </CardHeader>
            <CardContent>
              <TagsEditor tagsIniciais={comercio.tags} limite={tagLimite} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
