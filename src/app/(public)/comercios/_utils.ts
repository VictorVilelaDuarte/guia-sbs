import type { Categoria } from "@prisma/client";
import { categoriaPath } from "@/lib/seo/categorias";

export const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "HOSPEDAGEM", label: "Hospedagem" },
  { value: "TURISMO", label: "Turismo" },
  { value: "SERVICO", label: "Serviço" },
  { value: "COMERCIO", label: "Comércio" },
  { value: "ENTRETENIMENTO", label: "Entretenimento" },
];

export const CATEGORIA_LABEL: Record<Categoria, string> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.value, c.label]),
) as Record<Categoria, string>;

export const CATEGORIAS_VALIDAS = new Set(CATEGORIAS.map((c) => c.value));

// Coloque as imagens em /public/assets/categorias/ com os nomes abaixo.
// Formato livre: .jpg, .webp ou .png — ajuste a extensão se necessário.
export const CATEGORIA_IMAGE: Record<Categoria, string> = {
  ALIMENTACAO: "/assets/categorias/alimentacao.jpg",
  HOSPEDAGEM: "/assets/categorias/hospedagem.jpg",
  TURISMO: "/assets/categorias/turismo.jpg",
  SERVICO: "/assets/categorias/servico.jpg",
  COMERCIO: "/assets/categorias/comercio.jpg",
  ENTRETENIMENTO: "/assets/categorias/entretenimento.jpg",
};

export const DEFAULT_IMAGE = "/assets/home/sbs1.jpg";

const PALETTES: [string, string, string][] = [
  ["#a06440", "#3d2616", "#6b3a1d"],
  ["#c4873a", "#5b3a1a", "#8b5a2a"],
  ["#8a7c5a", "#3a2c14", "#6b5634"],
  ["#9c5a30", "#3a200e", "#7a4220"],
  ["#6b8550", "#2a3818", "#4d6038"],
  ["#5a7a8a", "#1a2c3a", "#3a5a68"],
];

export function palette(slug: string): [string, string, string] {
  const hash = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

// Com categoria, a base é a rota dedicada (/gastronomia, /hospedagem, …);
// subcategoria e página seguem como query params em cima dela.
export function pageUrl(p: number, cat: Categoria | null, sub: string | null) {
  const params = new URLSearchParams();
  if (sub) params.set("subcategoria", sub);
  if (p > 1) params.set("page", String(p));
  const qs = params.toString();
  return `${cat ? categoriaPath(cat) : "/comercios"}${qs ? `?${qs}` : ""}`;
}
