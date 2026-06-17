import { prisma } from "@/lib/prisma";
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios";
import { temFeature } from "@/lib/plan-features";
import { HomeClient } from "./home-client";

// ISR de 3 min: a home depende de dados que mudam fora do build (contagem
// por categoria, comércios recém-aprovados e a seção "Abertos agora"). Sem
// revalidate ela seria estática e congelaria tudo no momento do build.
// Trade-off aceito: "Abertos agora" pode ficar até ~3 min defasado.
export const revalidate = 180;

function formatEventDate(date: Date): string {
  const opts = { timeZone: "America/Sao_Paulo" } as const;
  const weekday = new Intl.DateTimeFormat("pt-BR", { ...opts, weekday: "short" })
    .format(date).replace(".", "").replace(/^./, (c) => c.toUpperCase());
  const day = new Intl.DateTimeFormat("pt-BR", { ...opts, day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("pt-BR", { ...opts, month: "short" })
    .format(date).replace(".", "").replace(/^./, (c) => c.toUpperCase());
  return `${weekday} ${day} ${month}`;
}

export default async function HomePage() {
  const rows = await prisma.$queryRaw<{ cat: string; count: bigint }[]>`
    SELECT unnest(categorias) AS cat, COUNT(*)::int AS count
    FROM comercios
    WHERE status = 'ATIVO'
    GROUP BY cat
  `;

  const categoryCounts = Object.fromEntries(
    rows.map((r) => [r.cat, Number(r.count)]),
  ) as Record<string, number>;

  const dia = getDiaAtual();

  const comerciosAtivos = await prisma.comercio.findMany({
    where: { status: "ATIVO" },
    select: {
      slug: true,
      nome: true,
      logo: true,
      categorias: true,
      bairro: true,
      horarios: true,
      plan: { select: { features: true } },
      fotos: { select: { url: true }, orderBy: { ordem: "asc" }, take: 1 },
    },
    orderBy: { nome: "asc" },
  });

  const comerciosAbertos = comerciosAtivos.flatMap((c) => {
    if (!c.horarios) return [];
    const horarios = parseHorarios(c.horarios);
    if (!horarios) return [];
    const hoje = horarios.find((h) => h.dia === dia);
    if (!hoje) return [];
    const status = estaAbertoAgora(hoje, horarios);
    if (!status.aberto) return [];
    return [{
      slug: c.slug,
      nome: c.nome,
      logo: c.logo,
      categorias: c.categorias,
      fechaLabel: status.label,
    }];
  });

  const comerciosDestaque = comerciosAtivos
    .filter((c) => temFeature(c.plan.features, "destaque_busca"))
    .map((c) => {
      const horarios = parseHorarios(c.horarios);
      const hoje = horarios?.find((h) => h.dia === dia);
      const status = hoje ? estaAbertoAgora(hoje, horarios!) : { aberto: false, label: "Fechado" };
      return {
        slug: c.slug,
        nome: c.nome,
        categorias: c.categorias as string[],
        logo: c.logo,
        foto: c.fotos[0]?.url ?? null,
        bairro: c.bairro,
        aberto: status.aberto,
        statusLabel: status.label,
      };
    });

  const agora = new Date();
  const eventosRaw = await prisma.evento.findMany({
    where: {
      dataInicio: { gte: agora },
      comercio: { status: "ATIVO" },
    },
    select: {
      id: true,
      titulo: true,
      dataInicio: true,
      local: true,
      imagem: true,
      preco: true,
      comercio: { select: { slug: true } },
    },
    orderBy: { dataInicio: "asc" },
    take: 6,
  });

  const eventos = eventosRaw.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    dataStr: formatEventDate(e.dataInicio),
    local: e.local,
    imagem: e.imagem,
    preco: e.preco,
    comercioSlug: e.comercio.slug,
  }));

  const pontosRaw = await prisma.pontoTuristico.findMany({
    where: { ativo: true },
    select: {
      slug: true,
      nome: true,
      categoria: true,
      fotos: true,
      dificuldade: true,
      distanciaKm: true,
      altitudeM: true,
    },
    take: 6,
    orderBy: { nome: "asc" },
  });

  const pontos = pontosRaw.map((p) => ({
    slug: p.slug,
    nome: p.nome,
    categoria: p.categoria as string,
    foto: p.fotos[0] ?? null,
    dificuldade: p.dificuldade as string | null,
    distanciaKm: p.distanciaKm,
    altitudeM: p.altitudeM,
  }));

  // A última seção determina a cor de entrada do footer
  const footerFrom =
    pontos.length > 0
      ? "var(--sand-1)"
      : eventos.length > 0
        ? "var(--sand-2)"
        : "var(--sand-1)";

  return (
    <>
      <style>{`:root { --footer-curve-from: ${footerFrom}; }`}</style>
      <HomeClient
        categoryCounts={categoryCounts}
        comerciosAbertos={comerciosAbertos}
        comerciosDestaque={comerciosDestaque}
        eventos={eventos}
        pontos={pontos}
      />
    </>
  );
}
