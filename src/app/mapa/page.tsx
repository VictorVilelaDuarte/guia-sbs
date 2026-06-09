import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDiaAtual, estaAbertoAgora, parseHorarios } from "@/lib/horarios";
import { MapaClient } from "./_components/mapa-client";
import type { ComercioMapa, PontoMapa } from "./_types";

export const metadata: Metadata = {
  title: "Mapa | Guia SBS",
  description:
    "Explore comércios e pontos turísticos de São Bento do Sapucaí no mapa interativo.",
};

export default async function MapaPage() {
  const [comercios, pontos] = await Promise.all([
    prisma.comercio.findMany({
      where: { status: "ATIVO", lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        nome: true,
        slug: true,
        logo: true,
        categorias: true,
        horarios: true,
        lat: true,
        lng: true,
        fotos: { select: { url: true }, orderBy: { ordem: "asc" as const }, take: 6 },
        whatsapp: true,
      },
    }),
    prisma.pontoTuristico.findMany({
      where: { ativo: true, lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        nome: true,
        slug: true,
        descricao: true,
        fotos: true,
        categoria: true,
        dificuldade: true,
        distanciaKm: true,
        duracaoMin: true,
        altitudeM: true,
        temPiscinaNatural: true,
        precisaGuia: true,
        periodo: true,
        lat: true,
        lng: true,
      },
    }),
  ]);

  const diaAtual = getDiaAtual();

  const comerciosMapa: ComercioMapa[] = comercios.map((c) => {
    const horarios = parseHorarios(c.horarios);
    const diaHoje = horarios?.find((h) => h.dia === diaAtual);
    const status =
      diaHoje && horarios
        ? estaAbertoAgora(diaHoje, horarios)
        : { aberto: false, label: "Sem horário" };
    return {
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      logo: c.logo,
      fotos: c.fotos.map((f) => f.url),
      categorias: c.categorias,
      lat: c.lat!,
      lng: c.lng!,
      aberto: status.aberto,
      statusLabel: status.label,
      horarios: horarios,
      whatsapp: c.whatsapp,
    };
  });

  const pontosMapa: PontoMapa[] = pontos.map((p) => ({
    id: p.id,
    nome: p.nome,
    slug: p.slug,
    descricao: p.descricao,
    fotos: p.fotos,
    categoria: p.categoria,
    dificuldade: p.dificuldade,
    distanciaKm: p.distanciaKm,
    duracaoMin: p.duracaoMin,
    altitudeM: p.altitudeM,
    temPiscinaNatural: p.temPiscinaNatural,
    precisaGuia: p.precisaGuia,
    periodo: p.periodo,
    lat: p.lat!,
    lng: p.lng!,
  }));

  return <MapaClient comercios={comerciosMapa} pontos={pontosMapa} />;
}
