import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Phone,
  BookUser,
  MessageCircle,
  Globe,
  Mail,
  Clock,
  ChevronLeft,
  Store,
  Calendar,
  ExternalLink,
  Ticket,
  Camera,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { MapaView } from "@/components/public/mapa-view-dynamic";
import { ShareButton } from "@/components/public/share-button";
import { GaleriaFotos } from "@/components/public/galeria-fotos";
import { temFeature } from "@/lib/plan-features";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  });
  const diaSemana = formatter.format(new Date());
  return (
    dias.find((d) => diaSemana.toLowerCase().startsWith(d.toLowerCase())) ??
    dias[new Date().getDay()]
  );
}

const ORDEM_DIAS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function proximoDiaAberto(horarios: HorarioDia[], diaAtual: string) {
  const idx = ORDEM_DIAS.indexOf(diaAtual);
  if (idx < 0) return null;
  for (let i = 1; i <= 7; i++) {
    const prox = horarios.find((h) => h.dia === ORDEM_DIAS[(idx + i) % 7]);
    if (prox?.aberto) {
      return {
        dia: i === 1 ? "amanhã" : prox.dia.toLowerCase(),
        inicio: prox.inicio,
      };
    }
  }
  return null;
}

function estaAbertoAgora(
  h: HorarioDia,
  horarios: HorarioDia[],
): { aberto: boolean; label: string } {
  const labelFechado = () => {
    const prox = proximoDiaAberto(horarios, h.dia);
    return prox ? `Volta ${prox.dia} às ${prox.inicio}` : "Fechado";
  };

  if (!h.aberto) return { aberto: false, label: labelFechado() };

  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  const agoraMin = hora * 60 + minuto;

  const inicioMin = horaParaMinutos(h.inicio);
  const fimMin = horaParaMinutos(h.fim);

  if (agoraMin < inicioMin)
    return { aberto: false, label: `Abre às ${h.inicio}` };
  if (agoraMin >= fimMin) return { aberto: false, label: labelFechado() };

  if (h.temPausa && h.pausaInicio && h.pausaFim) {
    const pausaInicioMin = horaParaMinutos(h.pausaInicio);
    const pausaFimMin = horaParaMinutos(h.pausaFim);
    if (agoraMin >= pausaInicioMin && agoraMin < pausaFimMin) {
      return { aberto: false, label: `Em pausa · volta às ${h.pausaFim}` };
    }
  }

  return { aberto: true, label: `Aberto · fecha às ${h.fim}` };
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function formatPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function formatDataEvento(inicio: Date, fim: Date | null): string {
  const mesInicio = format(inicio, "d 'de' MMM", { locale: ptBR });
  if (!fim || format(inicio, "yyyy-MM-dd") === format(fim, "yyyy-MM-dd")) {
    return `${mesInicio} às ${format(inicio, "HH:mm")}`;
  }
  const mesFim = format(fim, "d 'de' MMM", { locale: ptBR });
  return `${mesInicio} – ${mesFim}`;
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export default async function PaginaComercio({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    include: {
      fotos: { orderBy: { ordem: "asc" } },
      tags: { orderBy: { nome: "asc" } },
      produtos: { where: { disponivel: true }, orderBy: { ordem: "asc" } },
      eventos: { orderBy: { dataInicio: "asc" } },
      plan: true,
      cardapioCategorias: {
        orderBy: { ordem: "asc" },
        include: {
          itens: {
              where: { disponivel: true },
              orderBy: { ordem: "asc" },
              include: { variacoes: { orderBy: { ordem: "asc" } } },
            },
        },
      },
    },
  });

  if (!comercio) notFound();

  const isPublicado = comercio.status === "ATIVO";
  const temEventos = temFeature(comercio.plan.features, "eventos")
  const temCardapio = temFeature(comercio.plan.features, "cardapio");

  const horarios = parseHorarios(comercio.horarios);
  const diaAtual = getDiaAtual();
  const horarioHoje = horarios?.find((h) => h.dia === diaAtual);
  const statusAgora =
    horarios && horarioHoje ? estaAbertoAgora(horarioHoje, horarios) : null;

  const enderecoCompleto = [
    comercio.endereco,
    comercio.numero,
    comercio.bairro,
    comercio.cidade,
    comercio.estado,
  ]
    .filter(Boolean)
    .join(", ");

  const fotosGaleria = comercio.fotos;

  // Separa eventos passados dos futuros/em andamento
  const agora = new Date();
  const eventosAtivos = comercio.eventos.filter(
    (e) => !e.dataFim || e.dataFim >= agora,
  );
  const eventosPassados = comercio.eventos.filter(
    (e) => e.dataFim && e.dataFim < agora,
  );
  const eventosOrdenados = [...eventosAtivos, ...eventosPassados.reverse()];

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
            <p className="text-lg leading-relaxed whitespace-pre-line text-foreground">
              {comercio.nome}
            </p>
          </Link>
          <ShareButton title={comercio.nome} />
        </div>
      </div>

      {/* Hero foto */}
      {/* {fotoCapa ? (
        <div className="relative h-52 sm:h-72 w-full overflow-hidden">
          <Image src={fotoCapa} alt={comercio.nome} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-primary/15 to-primary/5" />
      )} */}

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4">
        {/* Identidade */}
        <div className="flex gap-4 mt-10 mb-4">
          <div className="relative h-40 w-40 shrink-0 rounded-2xl shadow-lg overflow-hidden">
            {comercio.logo ? (
              <Image
                src={comercio.logo}
                alt="Logo"
                fill
                className="object-contain"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap flex-col">
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
              {comercio.descricao}
            </p>
          </div>
        </div>

        {/* Status aberto/fechado */}
        {statusAgora && (
          <div className="flex items-center gap-2 mb-5">
            <span
              className={`flex items-center gap-1.5 text-sm font-medium ${
                statusAgora.aberto ? "text-green-600" : "text-rose-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  statusAgora.aberto
                    ? "bg-green-500 animate-pulse"
                    : "bg-rose-400"
                }`}
              />
              {statusAgora.label}
            </span>
          </div>
        )}

        {/* CTAs rápidos */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
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
          {comercio.instagram && (
            <a
              href={`https://instagram.com/${comercio.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <IconInstagram className="h-4 w-4" />
              Instagram
            </a>
          )}
          {comercio.lat && comercio.lng && (
            <a
              href={`https://maps.google.com/?q=${comercio.lat},${comercio.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
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
              className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Globe className="h-4 w-4" />
              Site
            </a>
          )}
          {comercio.telefone && (
            <a
              href={`tel:${comercio.telefone.replace(/\D/g, "")}`}
              className="flex items-center gap-2 shrink-0 border border-muted-foreground hover:bg-muted/70 text-foreground text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Phone className="h-4 w-4" />
              Ligar
            </a>
          )}
        </div>

        {/* Tags / palavras-chave
        {comercio.tags.length > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {comercio.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {tag.nome}
                </span>
              ))}
            </div>
          </>
        )} */}

        {/* Galeria de fotos */}
        {fotosGaleria.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Fotos
              </h2>
              <GaleriaFotos fotos={fotosGaleria} nomeComercio={comercio.nome} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Cardápio (apenas planos com a feature) */}
        {temCardapio && comercio.cardapioCategorias.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Cardápio
              </h2>
              <div className="space-y-6">
                {comercio.cardapioCategorias.map((cat) => (
                  cat.itens.length > 0 && (
                    <div key={cat.id}>
                      <h3 className="text-sm font-semibold mb-3 pb-1 border-b border-border">{cat.nome}</h3>
                      <div className="space-y-3">
                        {cat.itens.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            {item.imagem && (
                              <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                                <Image src={item.imagem} alt={item.titulo} fill className="object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-snug">{item.titulo}</p>
                                  {item.descricao && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.descricao}</p>
                                  )}
                                </div>
                                {item.variacoes.length > 0 ? (
                                  <div className="flex gap-4 shrink-0 text-right">
                                    {item.variacoes.map((v) => (
                                      <div key={v.id}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{v.nome}</p>
                                        <p className="text-sm font-semibold text-primary">
                                          {v.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : item.preco != null && item.preco > 0 ? (
                                  <span className="text-sm font-semibold text-primary shrink-0">
                                    {item.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Eventos (apenas planos com a feature) */}
        {temEventos && eventosOrdenados.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Eventos
              </h2>
              <div className="space-y-3">
                {eventosOrdenados.map((evento) => {
                  const encerrado = !!evento.dataFim && isPast(evento.dataFim);
                  const hoje = isToday(evento.dataInicio);
                  return (
                    <div
                      key={evento.id}
                      className={`rounded-xl border border-border overflow-hidden ${encerrado ? "opacity-60" : ""}`}
                    >
                      {evento.imagem && (
                        <div className="relative h-36 w-full">
                          <Image
                            src={evento.imagem}
                            alt={evento.titulo}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDataEvento(
                              evento.dataInicio,
                              evento.dataFim,
                            )}
                          </span>
                          {encerrado && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Encerrado
                            </span>
                          )}
                          {hoje && !encerrado && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              Hoje
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold">{evento.titulo}</p>
                        {evento.local && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {evento.local}
                          </p>
                        )}
                        {evento.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
                            {evento.descricao}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          {evento.preco != null && evento.preco > 0 ? (
                            <span className="text-xs font-medium flex items-center gap-1 text-primary">
                              <Ticket className="h-3 w-3" />
                              {formatPreco(evento.preco)}
                            </span>
                          ) : evento.preco === 0 ? (
                            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                              <Ticket className="h-3 w-3" />
                              Gratuito
                            </span>
                          ) : (
                            <span />
                          )}
                          {evento.linkExterno && (
                            <a
                              href={
                                evento.linkExterno.startsWith("http")
                                  ? evento.linkExterno
                                  : `https://${evento.linkExterno}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                            >
                              Ver mais
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                      className={`flex items-center justify-between px-3 py-2 text-sm ${isHoje ? "bg-primary/5 font-semibold" : "bg-background"}`}
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
                  logo={comercio.logo}
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
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <BookUser className="h-3.5 w-3.5" />
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
                  <IconInstagram className="h-4 w-4 text-muted-foreground shrink-0" />
                  {comercio.instagram}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Produtos e serviços */}
        {comercio.produtos.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                Produtos e serviços
              </h2>
              <div className="space-y-3">
                {comercio.produtos.map((produto) => (
                  <div key={produto.id} className="flex items-start gap-3">
                    {produto.imagem && (
                      <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={produto.imagem}
                          alt={produto.titulo}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">
                          {produto.titulo}
                        </p>
                        {produto.preco != null && produto.preco > 0 && (
                          <span className="text-sm font-semibold text-primary shrink-0">
                            {formatPreco(produto.preco)}
                          </span>
                        )}
                        {(produto.preco == null || produto.preco === 0) && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            Consulte
                          </span>
                        )}
                      </div>
                      {produto.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {produto.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Guia SBS</span> · São
        Bento do Sapucaí
      </div>
    </div>
  );
}
