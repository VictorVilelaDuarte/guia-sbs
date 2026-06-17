import { agruparComodidades } from "@/lib/hospedagem";
import { ComodidadeIcon } from "@/components/comerciante/hospedagem/comodidade-icons";

// Grade de comodidades do estabelecimento, agrupada. Server Component
// (ComodidadeIcon não usa hooks). Não renderiza nada se vazio.
export function ComodidadesPublicas({ comodidades }: { comodidades: string[] }) {
  const grupos = agruparComodidades(comodidades);
  if (grupos.length === 0) return null;

  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <div key={g.grupo}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">{g.label}</p>
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
            {g.itens.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-2 text-sm text-foreground">
                <ComodidadeIcon keyName={c.key} className="h-4 w-4 text-muted-foreground shrink-0" />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
