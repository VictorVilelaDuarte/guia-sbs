"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Eye, MessageCircle, Navigation, TrendingUp, TrendingDown, Minus,
  Lock, Clock3, Lightbulb, CheckCircle2, Circle, Sparkles,
} from "lucide-react";
import {
  ORIGEM_LABEL,
  type AnalyticsResumo,
  type TotaisPeriodo,
  type Origem,
} from "@/lib/analytics/types";

export interface PerfilCompletude {
  fotos: number;
  temDescricao: boolean;
  produtos: number;
  tags: number;
  temHorarios: boolean;
  temLogo: boolean;
}

interface Props {
  data: AnalyticsResumo;
  premium: boolean;
  perfil: PerfilCompletude;
}

const CORES_DONUT = ["#C4873A", "#5a8a50", "#4a70a0", "#a07040", "#8B4513", "#999"];

function Delta({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0 && atual === 0)
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />—</span>;
  if (anterior === 0)
    return <span className="text-xs font-medium text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />novo</span>;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0)
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0%</span>;
  const positivo = pct > 0;
  return (
    <span className={cn("text-xs font-medium flex items-center gap-1", positivo ? "text-green-600" : "text-red-500")}>
      {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positivo ? "+" : ""}{pct}%
    </span>
  );
}

function StatCard({
  icon: Icon, label, valor, anterior,
}: {
  icon: typeof Eye; label: string; valor: number; anterior: number;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-bold leading-none">{valor}</span>
          <Delta atual={valor} anterior={anterior} />
        </div>
      </CardContent>
    </Card>
  );
}

// Gráfico de área em SVG puro — sem dependência de chart lib.
function GraficoDiario({ serie }: { serie: { dia: string; views: number; cliques: number }[] }) {
  const W = 100;
  const H = 32;
  const max = Math.max(1, ...serie.map((p) => p.views), ...serie.map((p) => p.cliques));
  const x = (i: number) => (serie.length > 1 ? (i / (serie.length - 1)) * W : 0);
  const y = (v: number) => H - (v / max) * (H - 2);

  const viewsPts = serie.map((p, i) => `${x(i)},${y(p.views)}`).join(" ");
  const cliquesPts = serie.map((p, i) => `${x(i)},${y(p.cliques)}`).join(" ");
  const area = `0,${H} ${viewsPts} ${W},${H}`;

  const fmt = (dia: string) => {
    const [, m, d] = dia.split("-");
    return `${d}/${m}`;
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-28">
        <polygon points={area} fill="rgba(196,135,58,.16)" />
        <polyline points={viewsPts} fill="none" stroke="#C4873A" strokeWidth="0.7" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <polyline points={cliquesPts} fill="none" stroke="#5a8a50" strokeWidth="0.7" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeDasharray="2 1.5" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{fmt(serie[0].dia)}</span>
        <span>{fmt(serie[serie.length - 1].dia)}</span>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded bg-[#C4873A]" /> Visitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded bg-[#5a8a50]" /> Cliques
        </span>
      </div>
    </div>
  );
}

function DonutOrigens({ origens }: { origens: AnalyticsResumo["origens"] }) {
  const total = origens.reduce((s, o) => s + o.total, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Sem visitas no período.</p>;
  }
  const R = 15.9155; // raio que dá circunferência 100 (facilita o dasharray em %)
  // offset acumulado de cada fatia, pré-computado (sem mutação no render)
  const segmentos = origens.map((o, i) => ({
    ...o,
    frac: (o.total / total) * 100,
    offset: origens.slice(0, i).reduce((s, p) => s + (p.total / total) * 100, 0),
  }));

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 42 42" className="w-24 h-24 shrink-0 -rotate-90">
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="6" />
        {segmentos.map((o, i) => (
          <circle
            key={o.origem}
            cx="21" cy="21" r={R} fill="none"
            stroke={CORES_DONUT[i % CORES_DONUT.length]}
            strokeWidth="6"
            strokeDasharray={`${o.frac} ${100 - o.frac}`}
            strokeDashoffset={-o.offset}
          />
        ))}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {origens.slice(0, 6).map((o, i) => (
          <div key={o.origem} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CORES_DONUT[i % CORES_DONUT.length] }} />
            <span className="text-muted-foreground truncate">
              {o.origem === "desconhecida" ? "Outras" : ORIGEM_LABEL[o.origem as Origem]}
            </span>
            <span className="font-semibold ml-auto">{Math.round((o.total / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Funil({ funil }: { funil: AnalyticsResumo["funil"] }) {
  const passos = [
    { label: "Viram o perfil", valor: funil.views },
    { label: "Abriram o cardápio", valor: funil.cardapio },
    { label: "Chamaram no WhatsApp", valor: funil.whatsapp },
  ];
  const max = Math.max(1, funil.views);
  return (
    <div className="space-y-3">
      {passos.map((p, i) => {
        const anterior = i === 0 ? null : passos[i - 1].valor;
        const conv = anterior ? Math.round((p.valor / Math.max(1, anterior)) * 100) : null;
        return (
          <div key={p.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-semibold">
                {p.valor}
                {conv !== null && <span className="text-muted-foreground font-normal"> · {conv}%</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-black/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C4873A] transition-all"
                style={{ width: `${Math.max(2, (p.valor / max) * 100)}%`, opacity: 1 - i * 0.25 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Completude({ perfil }: { perfil: PerfilCompletude }) {
  const dicas = [
    { ok: perfil.temLogo, texto: "Adicione uma logo" },
    { ok: perfil.fotos >= 3, texto: `Tenha pelo menos 3 fotos (você tem ${perfil.fotos})` },
    { ok: perfil.temDescricao, texto: "Escreva uma descrição do seu negócio" },
    { ok: perfil.temHorarios, texto: "Cadastre seus horários de funcionamento" },
    { ok: perfil.tags >= 3, texto: `Cadastre 3+ palavras-chave (você tem ${perfil.tags})` },
    { ok: perfil.produtos >= 1, texto: "Cadastre produtos, serviços ou cardápio" },
  ];
  const feitas = dicas.filter((d) => d.ok).length;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Perfis completos aparecem mais e recebem mais contatos — {feitas} de {dicas.length} passos concluídos.
      </p>
      <div className="space-y-2">
        {dicas.map((d) => (
          <div key={d.texto} className="flex items-center gap-2 text-sm">
            {d.ok ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={cn(d.ok ? "text-muted-foreground line-through" : "text-foreground")}>
              {d.texto}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPanel({ data, premium, perfil }: Props) {
  const [periodo, setPeriodo] = useState<7 | 30>(7);
  const totais: TotaisPeriodo = periodo === 7 ? data.d7 : data.d30;
  const serie = periodo === 7 ? data.serieDiaria.slice(-7) : data.serieDiaria;
  const semDados = data.d30.views === 0 && data.d30.prevViews === 0;

  const conteudoPremium = (
    <div className="space-y-6">
      {/* Gráfico */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Visitas por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoDiario serie={serie} />
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">De onde vêm as visitas</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutOrigens origens={data.origens} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens mais vistos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topItens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Quando visitantes abrirem itens do seu cardápio ou catálogo, os mais populares aparecem aqui.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.topItens.map((t, i) => {
                  const max = data.topItens[0].total;
                  return (
                    <div key={t.titulo} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="truncate text-muted-foreground">{i + 1}. {t.titulo}</span>
                        <span className="font-semibold shrink-0 ml-2">{t.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#C4873A]" style={{ width: `${(t.total / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Do perfil ao contato</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardHeader>
          <CardContent>
            <Funil funil={data.funil} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              Horário de ouro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pico ? (
              <p className="text-sm">
                Seu perfil é mais visto{" "}
                {["domingo", "sábado"].includes(data.pico.diaSemana) ? "no" : "na"}{" "}
                <strong className="capitalize">{data.pico.diaSemana}</strong>, das{" "}
                <strong>{data.pico.faixa}</strong>. Aproveite esse horário para postar e atualizar promoções.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda coletando dados para identificar seu horário de pico.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {semDados && (
        <Card className="border-dashed">
          <CardContent className="py-4 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Seus números aparecem aqui assim que o perfil começar a receber visitas. Compartilhe o link da sua vitrine!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Toggle de período */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Desempenho do seu perfil</h2>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([7, 30] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                periodo === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      {/* Cards de resumo — visitas é visível para todos (teaser) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Eye} label="Visitas no perfil" valor={totais.views} anterior={totais.prevViews} />
        {premium ? (
          <>
            <StatCard icon={MessageCircle} label="Cliques no WhatsApp" valor={totais.whatsapp} anterior={totais.prevWhatsapp} />
            <StatCard icon={Navigation} label="Rotas traçadas" valor={totais.rotas} anterior={totais.prevRotas} />
          </>
        ) : (
          <>
            <StatTeaser icon={MessageCircle} label="Cliques no WhatsApp" />
            <StatTeaser icon={Navigation} label="Rotas traçadas" />
          </>
        )}
      </div>

      {premium ? (
        conteudoPremium
      ) : (
        <div className="relative">
          <div className="blur-[6px] opacity-60 pointer-events-none select-none" aria-hidden>
            {conteudoPremium}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background border border-border rounded-xl shadow-lg px-6 py-5 text-center max-w-xs">
              <Lock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-semibold mb-1">Disponível no plano Premium</p>
              <p className="text-xs text-muted-foreground">
                Origem das visitas, itens mais vistos, funil de contato e horário de ouro do seu negócio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completude — visível para todos: incentiva preencher o perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            Melhore seus números
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Completude perfil={perfil} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatTeaser({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-bold leading-none blur-sm select-none" aria-hidden>42</span>
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
