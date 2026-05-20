import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Mail,
  Clock,
  ChevronLeft,
  Star,
  Store,
  Share2,
} from "lucide-react";
import { MapaView } from "@/components/public/mapa-view-dynamic";

const categoriaLabels: Record<string, string> = {
  RESTAURANTE: "Restaurante",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviço",
  COMERCIO: "Comércio",
  ENTRETENIMENTO: "Entretenimento",
};

const categoriaColors: Record<string, string> = {
  RESTAURANTE:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  HOSPEDAGEM:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TURISMO:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  SERVICO:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  COMERCIO:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ENTRETENIMENTO:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

interface HorarioDia {
  dia: string;
  aberto: boolean;
  inicio: string;
  fim: string;
  temPausa?: boolean;
  pausaInicio?: string;
  pausaFim?: string;
}

function formatHorario(h: HorarioDia): string {
  if (!h.aberto) return "Fechado";
  if (h.temPausa && h.pausaInicio && h.pausaFim)
    return `${h.inicio} – ${h.pausaInicio} · ${h.pausaFim} – ${h.fim}`;
  return `${h.inicio} – ${h.fim}`;
}

function parseHorarios(value: string | null): HorarioDia[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length === 7) return parsed;
  } catch {}
  return null;
}

function getDiaAtual(): string {
  const dias = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return dias[new Date().getDay()];
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

export default async function PaginaComercio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const comercio = await prisma.comercio.findUnique({
    where: { id },
    include: {
      fotos: { orderBy: { ordem: "asc" } },
      plan: true,
    },
  });

  if (!comercio) notFound();

  const isPublicado = comercio.status === "ATIVO";
  const horarios = parseHorarios(comercio.horarios);
  const diaAtual = getDiaAtual();
  const horarioHoje = horarios?.find((h) => h.dia === diaAtual);

  const enderecoCompleto = [
    comercio.endereco,
    comercio.numero,
    comercio.bairro,
    comercio.cidade,
    comercio.estado,
  ]
    .filter(Boolean)
    .join(", ");

  const fotoCapa = comercio.fotos[0]?.url ?? null;
  const categoriaColor =
    categoriaColors[comercio.categoria] ?? "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      {/* Banner de rascunho */}
      {!isPublicado && (
        <div className="bg-amber-500 text-white text-xs font-medium text-center py-2 px-4">
          Pré-visualização — este comércio ainda não está publicado (
          {comercio.status})
        </div>
      )}

      {/* Topbar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Guia SBS
          </Link>
          <button
            type="button"
            aria-label="Compartilhar"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero foto */}
      {fotoCapa ? (
        <div className="relative h-52 sm:h-72 w-full overflow-hidden">
          <Image
            src={fotoCapa}
            alt={comercio.nome}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div
          className={`h-28 bg-gradient-to-br from-primary/15 to-primary/5`}
        />
      )}

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4">
        {/* Identidade */}
        <div className="flex items-end gap-4 -mt-10 mb-4">
          <div className="relative h-20 w-20 shrink-0 rounded-2xl border-4 border-background bg-muted shadow-md overflow-hidden">
            {comercio.logo ? (
              <Image
                src={comercio.logo}
                alt="Logo"
                fill
                className="object-contain p-1"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="pb-1 min-w-0 flex-1">
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${categoriaColor}`}
            >
              {categoriaLabels[comercio.categoria] ?? comercio.categoria}
            </span>
            {comercio.plan.slug === "premium" && (
              <span className="inline-flex items-center gap-1 ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Star className="h-3 w-3 fill-current" /> Premium
              </span>
            )}
            <h1 className="text-xl font-bold leading-tight">{comercio.nome}</h1>
          </div>
        </div>

        {/* Status aberto/fechado */}
        {horarioHoje && (
          <div className="flex items-center gap-2 mb-5">
            <span
              className={`flex items-center gap-1.5 text-sm font-medium ${
                horarioHoje.aberto ? "text-green-600" : "text-rose-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  horarioHoje.aberto
                    ? "bg-green-500 animate-pulse"
                    : "bg-rose-400"
                }`}
              />
              {horarioHoje.aberto
                ? `Aberto hoje · ${formatHorario(horarioHoje)}`
                : "Fechado hoje"}
            </span>
          </div>
        )}

        {/* CTAs rápidos */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4">
          {comercio.whatsapp && (
            <a
              href={`https://wa.me/55${comercio.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {comercio.telefone && (
            <a
              href={`tel:${comercio.telefone.replace(/\D/g, "")}`}
              className="flex items-center gap-2 shrink-0 bg-muted hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Phone className="h-4 w-4" />
              Ligar
            </a>
          )}
          {comercio.lat && comercio.lng && (
            <a
              href={`https://maps.google.com/?q=${comercio.lat},${comercio.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 bg-muted hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Como chegar
            </a>
          )}
          {comercio.website && (
            <a
              href={
                comercio.website.startsWith("http")
                  ? comercio.website
                  : `https://${comercio.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 bg-muted hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Globe className="h-4 w-4" />
              Site
            </a>
          )}
          {comercio.instagram && (
            <a
              href={`https://instagram.com/${comercio.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 bg-muted hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              {/* <Instagram className="h-4 w-4" /> */}
              Instagram
            </a>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Descrição */}
        {comercio.descricao && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Sobre
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                {comercio.descricao}
              </p>
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Galeria de fotos */}
        {comercio.fotos.length > 1 && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Fotos
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
                {comercio.fotos.map((foto) => (
                  <div
                    key={foto.id}
                    className="relative h-44 w-64 shrink-0 rounded-xl overflow-hidden snap-start bg-muted"
                  >
                    <Image
                      src={foto.url}
                      alt={foto.alt ?? comercio.nome}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Horários */}
        {horarios && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Horários de funcionamento
              </h2>
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {horarios.map((h) => {
                  const isHoje = h.dia === diaAtual;
                  return (
                    <div
                      key={h.dia}
                      className={`flex items-center justify-between px-3 py-2 text-sm ${
                        isHoje ? "bg-primary/5 font-semibold" : "bg-background"
                      }`}
                    >
                      <span
                        className={`flex items-center gap-2 ${!h.aberto ? "text-muted-foreground" : ""}`}
                      >
                        {isHoje && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        {!isHoje && <span className="h-1.5 w-1.5 shrink-0" />}
                        {h.dia}
                      </span>
                      <span
                        className={
                          h.aberto ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        {formatHorario(h)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Localização */}
        {enderecoCompleto && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Localização
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                {enderecoCompleto}
              </p>
              {comercio.lat && comercio.lng && (
                <MapaView
                  lat={comercio.lat}
                  lng={comercio.lng}
                  nome={comercio.nome}
                />
              )}
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Contatos */}
        {(comercio.telefone ||
          comercio.whatsapp ||
          comercio.email ||
          comercio.website ||
          comercio.instagram) && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Contato
            </h2>
            <div className="space-y-3">
              {comercio.telefone && (
                <a
                  href={`tel:${comercio.telefone.replace(/\D/g, "")}`}
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  {formatPhone(comercio.telefone)}
                </a>
              )}
              {comercio.whatsapp && (
                <a
                  href={`https://wa.me/55${comercio.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  {formatPhone(comercio.whatsapp)}
                </a>
              )}
              {comercio.email && (
                <a
                  href={`mailto:${comercio.email}`}
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  {comercio.email}
                </a>
              )}
              {comercio.website && (
                <a
                  href={
                    comercio.website.startsWith("http")
                      ? comercio.website
                      : `https://${comercio.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  {comercio.website}
                </a>
              )}
              {comercio.instagram && (
                <a
                  href={`https://instagram.com/${comercio.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  {/* <Instagram className="h-4 w-4 text-muted-foreground shrink-0" /> */}
                  {comercio.instagram}
                </a>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Guia SBS</span> · São
        Bento do Sul
      </div>
    </div>
  );
}
