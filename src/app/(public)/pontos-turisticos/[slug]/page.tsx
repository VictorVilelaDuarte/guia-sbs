import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CategoriaPonto, Dificuldade } from "@prisma/client";
import {
  MapPin,
  Route,
  Clock,
  Mountain,
  Lightbulb,
  Navigation,
} from "lucide-react";
import { GaleriaFotos } from "@/components/public/galeria-fotos";
import { MapaView } from "@/components/public/mapa-view-dynamic";
import { Topbar } from "./_components/topbar";

// ─── labels e cores ────────────────────────────────────────────

const CATEGORIA_LABEL: Record<CategoriaPonto, string> = {
  MIRANTE: "Mirante",
  TRILHA: "Trilha",
  HISTORICO: "Histórico/Cultural",
  CACHOEIRA: "Cachoeira",
};

const CATEGORIA_COR: Record<CategoriaPonto, string> = {
  MIRANTE: "bg-sky-100 text-sky-700",
  TRILHA: "bg-green-100 text-green-700",
  HISTORICO: "bg-amber-100 text-amber-700",
  CACHOEIRA: "bg-cyan-100 text-cyan-700",
};

const DIFICULDADE_LABEL: Record<Dificuldade, string> = {
  FACIL: "Fácil",
  MODERADA: "Moderada",
  DIFICIL: "Difícil",
};

const DIFICULDADE_COR: Record<Dificuldade, string> = {
  FACIL: "bg-green-100 text-green-700",
  MODERADA: "bg-yellow-100 text-yellow-700",
  DIFICIL: "bg-red-100 text-red-700",
};

// ─── helpers ───────────────────────────────────────────────────

function formatDuracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function buildEndereco(p: {
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}): string | null {
  const partes: string[] = [];
  if (p.endereco) {
    partes.push(p.numero ? `${p.endereco}, ${p.numero}` : p.endereco);
  }
  if (p.bairro) partes.push(p.bairro);
  if (p.cidade) partes.push(p.estado ? `${p.cidade}/${p.estado}` : p.cidade);
  if (p.cep) partes.push(`CEP ${p.cep}`);
  return partes.length > 0 ? partes.join(" — ") : null;
}

// ─── metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.pontoTuristico.findUnique({
    where: { slug },
    select: { nome: true, descricao: true, fotos: true },
  });
  if (!p) return {};
  return {
    title: `${p.nome} | Guia SBS`,
    description: p.descricao ?? `Conheça ${p.nome}, em São Bento do Sapucaí.`,
    openGraph: p.fotos[0] ? { images: [{ url: p.fotos[0] }] } : undefined,
  };
}

// ─── página ────────────────────────────────────────────────────

export default async function PontoTuristicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const ponto = await prisma.pontoTuristico.findUnique({ where: { slug } });
  if (!ponto || !ponto.ativo) notFound();

  const enderecoCompleto = buildEndereco(ponto);

  // mapeia fotos (String[]) para o formato que GaleriaFotos espera
  const fotosParaGaleria = ponto.fotos.map((url, i) => ({
    id: String(i),
    url,
    alt: `${ponto.nome} — foto ${i + 1}`,
  }));

  const temMetadados =
    (ponto.categoria === "TRILHA" &&
      (ponto.dificuldade || ponto.distanciaKm || ponto.duracaoMin)) ||
    (ponto.categoria === "MIRANTE" && ponto.altitudeM) ||
    (ponto.categoria === "CACHOEIRA" &&
      (ponto.temPiscinaNatural != null || ponto.precisaGuia != null)) ||
    (ponto.categoria === "HISTORICO" && ponto.periodo);

  const googleMapsUrl =
    ponto.lat && ponto.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${ponto.lat},${ponto.lng}`
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Topbar nome={ponto.nome} />

      {/* Galeria de fotos */}
      {fotosParaGaleria.length > 0 && (
        <GaleriaFotos fotos={fotosParaGaleria} nomeComercio={ponto.nome} />
      )}

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Identidade */}
        <div>
          <span
            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${CATEGORIA_COR[ponto.categoria]}`}
          >
            {CATEGORIA_LABEL[ponto.categoria]}
          </span>
          <h1 className="text-2xl font-bold leading-tight">{ponto.nome}</h1>
          {ponto.descricao && (
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {ponto.descricao}
            </p>
          )}
        </div>

        {/* Metadados específicos por categoria */}
        {temMetadados && (
          <div className="flex flex-wrap gap-2">
            {ponto.categoria === "TRILHA" && (
              <>
                {ponto.dificuldade && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${DIFICULDADE_COR[ponto.dificuldade]}`}
                  >
                    {DIFICULDADE_LABEL[ponto.dificuldade]}
                  </span>
                )}
                {ponto.distanciaKm && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                    <Route className="h-4 w-4" />
                    {ponto.distanciaKm} km
                  </span>
                )}
                {ponto.duracaoMin && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDuracao(ponto.duracaoMin)}
                  </span>
                )}
              </>
            )}

            {ponto.categoria === "MIRANTE" && ponto.altitudeM && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-sky-50 text-sky-700">
                <Mountain className="h-4 w-4" />
                {ponto.altitudeM} m de altitude
              </span>
            )}

            {ponto.categoria === "CACHOEIRA" && (
              <>
                {ponto.temPiscinaNatural && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700">
                    Piscina natural
                  </span>
                )}
                {ponto.precisaGuia && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">
                    Guia recomendado
                  </span>
                )}
              </>
            )}

            {ponto.categoria === "HISTORICO" && ponto.periodo && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">
                {ponto.periodo}
              </span>
            )}
          </div>
        )}

        {/* Dicas */}
        {ponto.dicas && (
          <div className="rounded-xl border bg-amber-50/60 border-amber-200/60 px-4 py-4">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Dicas
            </h2>
            <p className="text-sm text-amber-900/80 leading-relaxed whitespace-pre-line">
              {ponto.dicas}
            </p>
          </div>
        )}

        {/* Localização */}
        {(enderecoCompleto || ponto.lat) && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Localização
            </h2>
            {enderecoCompleto && (
              <p className="text-sm text-muted-foreground mb-3">
                {enderecoCompleto}
              </p>
            )}
            {ponto.lat && ponto.lng && (
              <MapaView
                lat={ponto.lat}
                lng={ponto.lng}
                nome={ponto.nome}
                logo={null}
              />
            )}
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Navigation className="h-4 w-4" />
                Como chegar
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
