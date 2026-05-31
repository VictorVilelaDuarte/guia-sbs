import { prisma } from "@/lib/prisma";
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

  return <HomeClient categoryCounts={categoryCounts} />;
}
