import { prisma } from "@/lib/prisma";
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios";
import { HomeClient } from "./home-client";

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

  const comerciosComHorario = await prisma.comercio.findMany({
    where: { status: "ATIVO", horarios: { not: null } },
    select: { slug: true, nome: true, logo: true, categorias: true, horarios: true },
    orderBy: { nome: "asc" },
  });

  const dia = getDiaAtual();
  const comerciosAbertos = comerciosComHorario.flatMap((c) => {
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

  return <HomeClient categoryCounts={categoryCounts} comerciosAbertos={comerciosAbertos} />;
}
