"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Globe, Camera, Clock, UtensilsCrossed, ShoppingBag,
  Calendar, MapPin, Phone, Tag, BarChart2, QrCode, ArrowRight,
} from "lucide-react";

// Os recursos vivem aqui (e não no page.tsx) porque ícones são componentes e
// não podem ser serializados de Server → Client Component via props.
// `thumb` (foto única) e `stack` (pilha de mini-fotos) são opcionais — só os
// recursos com apelo visual natural ganham imagem.
const FEATURES: {
  icon: typeof Globe;
  title: string;
  desc: string;
  impact: string;
  thumb?: { src: string; alt: string };
  stack?: { src: string; alt: string }[];
  pulse?: boolean;
}[] = [
  {
    icon: Globe,
    title: "Página própria na internet",
    desc: "Seu perfil completo em airotas.com.br/vitrine/seu-negocio, com visual profissional e link fácil de compartilhar no seu Instagram, WhatsApp e onde mais você divulgar.",
    impact: "É como ter um site próprio — sem pagar desenvolvedor nem mensalidade de hospedagem.",
    thumb: { src: "/assets/home/sbs.jpg", alt: "São Bento do Sapucaí" },
  },
  {
    icon: Camera,
    title: "Galeria de fotos",
    desc: "Ambiente, pratos, produtos, a vista da serra. O turista escolhe com os olhos — a galeria é sua primeira impressão.",
    impact: "Perfis com boas fotos recebem muito mais contatos.",
    stack: [
      { src: "/assets/categorias/hospedagem.jpg",   alt: "Hospedagem na serra" },
      { src: "/assets/categorias/turismo.jpg",      alt: "Pedra do Baú" },
      { src: "/assets/categorias/alimentacao.jpg",  alt: "Gastronomia local" },
    ],
  },
  {
    icon: Clock,
    title: "“Aberto agora” em tempo real",
    desc: "Cadastre seus horários uma vez e o guia mostra sozinho se você está aberto e quando volta a abrir.",
    impact: "Você aparece na seção “Abertos agora” da página inicial — exatamente na hora em que o cliente decide aonde ir.",
    pulse: true,
  },
  {
    icon: UtensilsCrossed,
    title: "Cardápio digital",
    desc: "Categorias, fotos, variações de preço e itens em destaque, em formato de app, direto no celular do cliente.",
    impact: "Mudou o preço? Atualiza na hora, sem reimprimir nada. Prato com foto vende sozinho.",
    thumb: { src: "/assets/categorias/alimentacao.jpg", alt: "Prato da gastronomia local" },
  },
  {
    icon: ShoppingBag,
    title: "Catálogo de produtos e serviços",
    desc: "Sua prateleira visível antes mesmo de o cliente entrar na loja — com foto, descrição e preço.",
    impact: "Quem procura “artesanato” ou “passeio a cavalo” encontra exatamente o que você oferece.",
    thumb: { src: "/assets/categorias/comercio.jpg", alt: "Comércio local" },
  },
  {
    icon: Calendar,
    title: "Eventos",
    desc: "Música ao vivo, festival gastronômico, promoção: seus eventos divulgados na página inicial do guia, para todos os visitantes.",
    impact: "Encha a casa nas noites especiais — a divulgação trabalha por você.",
    thumb: { src: "/assets/categorias/entretenimento.jpg", alt: "Evento com música ao vivo" },
  },
  {
    icon: MapPin,
    title: "Pin no mapa da cidade",
    desc: "Seu negócio no mapa interativo, com filtros por categoria, “perto de mim” e botão de rota.",
    impact: "Um toque e o GPS do cliente guia até a sua porta.",
    thumb: { src: "/assets/categorias/turismo.jpg", alt: "Região de São Bento do Sapucaí" },
  },
  {
    icon: Phone,
    title: "Contato em um toque",
    desc: "WhatsApp, Instagram, telefone e site em botões diretos na sua vitrine.",
    impact: "Do interesse à conversa em segundos — sem intermediário e sem comissão sobre a venda.",
  },
  {
    icon: Tag,
    title: "Palavras-chave inteligentes",
    desc: "Cadastre os termos que descrevem seu negócio — “fondue”, “pet friendly”, “lareira” — e a busca usa tudo isso para te encontrar.",
    impact: "Cada palavra-chave é mais uma porta de entrada para o seu perfil.",
  },
  {
    icon: BarChart2,
    title: "Analytics do seu perfil",
    desc: "Quantas pessoas viram seu perfil, quantas clicaram no WhatsApp, o que mais chamou atenção.",
    impact: "Decida com dados, não no achismo.",
  },
  {
    icon: QrCode,
    title: "QR Code personalizado",
    desc: "QR do seu perfil para imprimir e colocar na mesa, no balcão ou na vitrine física.",
    impact: "Da mesa do restaurante direto para o cardápio digital.",
  },
];

// Lista completa, sempre visível. A interatividade é só de entrada: cada card
// faz reveal (fade + slide) quando entra na viewport, o ícone dá um "pop" e a
// seta da linha de impacto pulsa — nada fica escondido atrás de toque/rotação
// (decisão de design registrada no CLAUDE.md).
export function FeaturesList() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [seen, setSeen] = useState<boolean[]>(() => FEATURES.map(() => false));

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = Number((e.target as HTMLElement).dataset.idx);
          setSeen((s) => (s[i] ? s : s.map((v, j) => (j === i ? true : v))));
          io.unobserve(e.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -36px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FEATURES.map(({ icon: Icon, title, desc, impact, thumb, stack, pulse }, i) => (
        <div
          key={title}
          ref={(el) => { refs.current[i] = el; }}
          data-idx={i}
          className={`press shadow-soft reveal${seen[i] ? " reveal-in" : ""}`}
          style={{
            background: "var(--sand-1)",
            borderRadius: 18, padding: "18px 18px",
            border: "1px solid rgba(212,201,176,.55)",
            display: "flex", gap: 14, alignItems: "flex-start",
            transitionDelay: `${(i % 2) * 70}ms`,
          }}
        >
          <div
            className="icon-pop"
            style={{
              width: 40, height: 40, borderRadius: 11,
              background: "rgba(196,135,58,.12)",
              display: "grid", placeItems: "center",
              color: "var(--terra)", flexShrink: 0,
            }}
          >
            <Icon size={19} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 14.5, fontWeight: 700, color: "var(--ink)",
              marginBottom: 5, lineHeight: 1.25,
            }}>
              {title}
              {pulse && (
                <span className="pulse-wrap" style={{ width: 8, height: 8, flexShrink: 0 }}>
                  <span className="pulse-ring" />
                  <span className="pulse-dot" />
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {desc}
            </div>
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 9 }}>
              <ArrowRight
                size={12}
                className="arrow-nudge"
                style={{ color: "var(--terra)", marginTop: 3, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "var(--terra)", fontWeight: 600, lineHeight: 1.5, fontStyle: "italic" }}>
                {impact}
              </span>
            </div>
          </div>

          {/* Visual à direita: foto única ou pilha de mini-fotos */}
          {thumb && (
            <div
              className="shadow-soft"
              style={{
                position: "relative", width: 58, height: 58,
                borderRadius: 13, overflow: "hidden", flexShrink: 0,
                border: "2px solid #fff",
                transform: "rotate(2.5deg)",
              }}
            >
              <Image src={thumb.src} alt={thumb.alt} fill sizes="58px" style={{ objectFit: "cover" }} />
            </div>
          )}
          {stack && (
            <div style={{ position: "relative", width: 66, height: 62, flexShrink: 0 }}>
              {stack.map(({ src, alt }, j) => (
                <div
                  key={src}
                  className="shadow-soft"
                  style={{
                    position: "absolute",
                    top: j * 5, right: j * 7,
                    width: 46, height: 46,
                    borderRadius: 11, overflow: "hidden",
                    border: "2px solid #fff",
                    transform: `rotate(${(j - 1) * 7}deg)`,
                    zIndex: stack.length - j,
                  }}
                >
                  <Image src={src} alt={alt} fill sizes="46px" style={{ objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
