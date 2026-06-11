import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles, Star, Check, ArrowRight,
  Zap, ScanText, BrainCircuit, Search, Compass,
} from "lucide-react";
import { Wave } from "@/components/public/home/waves";
import { AiDemo } from "./_components/ai-demo";
import { RotatingQuery } from "./_components/rotating-query";
import { FeaturesList } from "./_components/features-list";

export const metadata: Metadata = {
  title: "Para Comerciantes | Guia SBS",
  description: "Vitrine completa, cardápio digital, eventos, mapa interativo e busca por IA — apareça no Google e seja encontrado pelos turistas de São Bento do Sapucaí.",
};

const DOT_GRID = "radial-gradient(rgba(245,240,232,.055) 1px, transparent 1px)";

const QUERY_EXAMPLES = [
  { q: "onde como um lanche agora?",    cat: "Alimentação",  cor: "#C4873A" },
  { q: "trilha fácil com crianças",      cat: "Turismo",      cor: "#5a8a50" },
  { q: "pousada com café da manhã",      cat: "Hospedagem",   cor: "#4a70a0" },
  { q: "artesanato local em SBS",        cat: "Comércio",     cor: "#a07040" },
];

const CAPABILITIES = [
  { icon: BrainCircuit, title: "Linguagem natural",       desc: "O turista pergunta como fala, sem precisar escolher filtros" },
  { icon: Zap,          title: "Tempo real",               desc: "Considera horários, status de abertura e disponibilidade" },
  { icon: ScanText,     title: "Contexto inteligente",     desc: "Entende categoria, tipo de negócio e o que está aberto" },
];

// Os três canais de aquisição que o guia oferece ao comerciante — a narrativa
// central da página: o cliente chega antes da viagem (Google), na dúvida
// (busca por IA) e durante o passeio (guia + mapa).
const CANAIS = [
  {
    icon: Search,
    label: "ANTES DA VIAGEM",
    title: "Encontrado no Google",
    img: "/assets/home/sbs.jpg",
    alt: "Vista de São Bento do Sapucaí",
    desc: "O guia é construído para aparecer bem no Google. Quando alguém pesquisa “pousada na Serra da Mantiqueira” ou “onde comer em São Bento do Sapucaí”, encontra o guia — e, dentro dele, o seu negócio, com fotos, horários e endereço.",
    impact: "Clientes chegam até você antes mesmo de decidirem a viagem — sem gastar um real em anúncio.",
  },
  {
    icon: BrainCircuit,
    label: "NA HORA DA DÚVIDA",
    title: "Recomendado pela IA",
    img: "/assets/categorias/alimentacao.jpg",
    alt: "Gastronomia de São Bento do Sapucaí",
    desc: "A busca por inteligência artificial entende a pergunta do turista — “onde comer uma truta?”, “o que fazer com chuva?” — e recomenda os negócios certos, considerando até quem está aberto naquele momento.",
    impact: "Quanto mais completo o seu perfil, mais vezes a IA recomenda você.",
  },
  {
    icon: Compass,
    label: "DURANTE O PASSEIO",
    title: "Na mão de quem já está na cidade",
    img: "/assets/categorias/turismo.jpg",
    alt: "Pedra do Baú e trilhas da região",
    desc: "O turista vem pelo passeio — Pedra do Baú, trilhas, cachoeiras — e fica navegando no guia: página inicial com destaques e “abertos agora”, eventos, categorias e o mapa interativo com “perto de mim”.",
    impact: "O guia atrai o público com o passeio — e entrega esse público para o seu negócio.",
  },
];

// Os recursos detalhados (com linhas de impacto, fotos e animação de reveal)
// vivem em _components/features-list.tsx — ícones não são serializáveis como
// props de Server → Client Component.

const STEPS = [
  { n: "1", title: "Cadastre seu negócio",    desc: "Crie seu perfil em minutos. Grátis, sem compromisso." },
  { n: "2", title: "Personalize sua vitrine", desc: "Adicione fotos, horários, cardápio, eventos e palavras-chave." },
  { n: "3", title: "Seja encontrado",         desc: "No Google, na busca por IA e no mapa — clientes chegam por todos os caminhos." },
];

const FREE_FEATURES = [
  "Perfil publicado com URL própria",
  "Até 3 fotos",
  "Horários de funcionamento",
  "Localização no mapa",
  "Contato (WhatsApp, Instagram, telefone)",
  "Até 5 palavras-chave",
];

const PREMIUM_FEATURES = [
  "Tudo do plano Grátis",
  "Fotos ilimitadas",
  "Cardápio digital completo",
  "Catálogo de produtos e serviços",
  "Criação e divulgação de eventos",
  "Destaque na página inicial do guia",
  "Destaque na busca por IA",
  "Analytics de visualizações e cliques",
  "QR Code personalizado do perfil",
];

export default function ParaComerciantesPage() {
  return (
    <div style={{ background: "var(--sand-1)" }}>

      {/* ══════════════════════════════════════
          BANDA ESCURA — Hero + IA (seamless)
          ══════════════════════════════════════ */}

      {/* ── HERO ── */}
      <section style={{
        background: "var(--ink)",
        backgroundImage: DOT_GRID,
        backgroundSize: "28px 28px",
        padding: "80px 24px 64px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Glows */}
        <div style={{
          position: "absolute", top: -140, right: -100,
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,135,58,.11) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -60, left: -80,
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,135,58,.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="grain" />

        <div style={{ maxWidth: 520, margin: "0 auto", position: "relative" }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(196,135,58,.13)",
            border: "1px solid rgba(196,135,58,.28)",
            borderRadius: 999, padding: "5px 14px", marginBottom: 28,
          }}>
            <Star size={11} fill="currentColor" style={{ color: "var(--amber)" }} />
            <span style={{ color: "var(--amber-soft)", fontSize: 12, fontWeight: 600, letterSpacing: ".05em" }}>
              Guia SBS · São Bento do Sapucaí
            </span>
          </div>

          {/* Headline */}
          <h1 className="serif" style={{
            fontSize: "clamp(2rem, 7vw, 3.2rem)",
            fontWeight: 700,
            color: "var(--sand-1)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 20px",
          }}>
            Quando o turista pergunta,{" "}
            <span style={{ color: "var(--amber-soft)" }}>a IA encontra você</span>
          </h1>

          <p style={{
            color: "var(--sand-2)", fontSize: 16, lineHeight: 1.7,
            margin: "0 0 32px", maxWidth: 420,
          }}>
            O Guia SBS usa inteligência artificial para conectar turistas aos melhores estabelecimentos de São Bento do Sapucaí — em linguagem natural, em tempo real.
          </p>

          {/* Rotating query */}
          <div style={{ marginBottom: 36 }}>
            <p style={{ color: "rgba(245,240,232,.35)", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", marginBottom: 10 }}>
              OS TURISTAS PERGUNTAM:
            </p>
            <RotatingQuery />
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--amber)", color: "#fff",
              padding: "13px 22px", borderRadius: 14,
              fontWeight: 700, fontSize: 15,
              textDecoration: "none", letterSpacing: "-.01em",
            }}>
              Cadastre seu negócio grátis
              <ArrowRight size={16} />
            </Link>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center",
              color: "var(--sand-2)", padding: "13px 22px", borderRadius: 14,
              fontWeight: 600, fontSize: 15, textDecoration: "none",
              border: "1px solid rgba(245,240,232,.14)",
            }}>
              Explorar o guia
            </Link>
          </div>
        </div>
      </section>

      {/* ── BUSCA POR IA ── (mesma banda escura, sem wave) */}
      <section style={{
        background: "var(--ink)",
        backgroundImage: DOT_GRID,
        backgroundSize: "28px 28px",
        padding: "16px 24px 80px",
        position: "relative",
      }}>
        {/* Glow central */}
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(196,135,58,.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        <div style={{
          maxWidth: 480,
          margin: "0 auto",
          position: "relative",
        }}>

          {/* Separador sutil */}
          <div style={{
            borderTop: "1px solid rgba(245,240,232,.08)",
            marginBottom: 56,
          }} />

          {/* Label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40, justifyContent: "center" }}>
            <div style={{
              width: 24, height: 1,
              background: "rgba(196,135,58,.5)",
            }} />
            <span style={{
              color: "rgba(245,240,232,.35)",
              fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
            }}>
              A BUSCA EM AÇÃO
            </span>
            <div style={{
              width: 24, height: 1,
              background: "rgba(196,135,58,.5)",
            }} />
          </div>

          {/* Demo */}
          <AiDemo />

          {/* Capabilities */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 36,
          }}>
            {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: "rgba(255,255,255,.04)",
                borderRadius: 14,
                padding: "14px 12px",
                border: "1px solid rgba(255,255,255,.07)",
                textAlign: "center",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(196,135,58,.12)",
                  display: "grid", placeItems: "center",
                  color: "var(--amber)", margin: "0 auto 10px",
                }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sand-1)", marginBottom: 4, lineHeight: 1.2 }}>
                  {title}
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(245,240,232,.35)", lineHeight: 1.5 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>

          {/* Query examples */}
          <div style={{ marginTop: 28 }}>
            <p style={{
              color: "rgba(245,240,232,.3)",
              fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em",
              textAlign: "center", marginBottom: 14,
            }}>
              FUNCIONA PARA QUALQUER PERGUNTA
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {QUERY_EXAMPLES.map(({ q, cat, cor }) => (
                <div key={cat} style={{
                  background: "rgba(255,255,255,.04)",
                  borderRadius: 12,
                  padding: "11px 13px",
                  border: "1px solid rgba(255,255,255,.07)",
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: cor,
                    letterSpacing: ".05em",
                    marginBottom: 5,
                    opacity: 0.85,
                  }}>
                    {cat.toUpperCase()}
                  </div>
                  <div style={{ color: "rgba(245,240,232,.65)", fontSize: 11.5, lineHeight: 1.4, fontStyle: "italic" }}>
                    &ldquo;{q}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Wave from="var(--ink)" to="var(--sand-1)" />

      {/* ══════════════════════════════════════
          BANDA CLARA — Canais + Features + Planos
          ══════════════════════════════════════ */}

      {/* ── OS 3 CAMINHOS ATÉ O CLIENTE ── */}
      <section style={{ padding: "72px 24px", background: "var(--sand-1)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="serif" style={{
            fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
            fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.03em", margin: "0 0 8px",
          }}>
            Três caminhos levam o cliente até você
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 15, margin: "0 0 36px", lineHeight: 1.6 }}>
            Antes da viagem, na hora da dúvida e durante o passeio — o guia trabalha pelo seu negócio o tempo todo.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {CANAIS.map(({ icon: Icon, label, title, img, alt, desc, impact }) => (
              <div key={title} className="shadow-soft" style={{
                background: "var(--sand-2)",
                borderRadius: 20,
                border: "1px solid rgba(212,201,176,.5)",
                overflow: "hidden",
              }}>
                {/* Faixa de foto */}
                <div style={{ position: "relative", height: 116 }}>
                  <Image
                    src={img}
                    alt={alt}
                    fill
                    sizes="(max-width: 600px) 100vw, 560px"
                    style={{ objectFit: "cover" }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(26,13,4,.6), rgba(26,13,4,.05) 60%)",
                  }} />
                  <div style={{
                    position: "absolute", left: 16, bottom: 12,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(26,13,4,.55)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(245,240,232,.18)",
                    borderRadius: 999, padding: "4px 11px",
                  }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--amber-soft)", letterSpacing: ".09em" }}>
                      {label}
                    </span>
                  </div>
                </div>

                <div style={{ padding: "16px 20px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: "var(--ink)",
                      display: "grid", placeItems: "center",
                      color: "var(--amber-soft)", flexShrink: 0,
                    }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>
                      {title}
                    </div>
                  </div>
                  <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65, margin: 0 }}>
                    {desc}
                  </p>
                  <div style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    marginTop: 12, paddingTop: 12,
                    borderTop: "1px dashed rgba(196,135,58,.4)",
                  }}>
                    <ArrowRight size={14} style={{ color: "var(--terra)", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "var(--terra)", fontWeight: 600, lineHeight: 1.5, fontStyle: "italic" }}>
                      {impact}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Wave from="var(--sand-1)" to="var(--sand-2)" />

      {/* ── VITRINE COMPLETA (todos os recursos, sempre visíveis) ── */}
      <section style={{ padding: "72px 24px", background: "var(--sand-2)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="serif" style={{
            fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
            fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.03em", margin: "0 0 8px",
          }}>
            Tudo que seu negócio precisa para vender mais
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 15, margin: "0 0 36px", lineHeight: 1.6 }}>
            Cada recurso existe por um motivo: transformar quem visita o guia em cliente na sua porta.
          </p>

          <FeaturesList />
        </div>
      </section>

      <Wave from="var(--sand-2)" to="var(--sand-1)" flip />

      {/* ── COMO FUNCIONA ── */}
      <section style={{ padding: "72px 24px", background: "var(--sand-1)" }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <h2 className="serif" style={{
            fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
            fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.03em", margin: "0 0 8px",
          }}>
            Como funciona
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 15, margin: "0 0 44px" }}>
            Em menos de 10 minutos seu negócio está online.
          </p>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", position: "relative" }}>
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: "absolute", left: 19, top: 40,
                    width: 2, height: "calc(100% + 4px)",
                    background: "rgba(196,135,58,.2)",
                  }} />
                )}
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 12, background: "var(--ink)",
                  color: "var(--amber-soft)",
                  display: "grid", placeItems: "center",
                  fontSize: 17, fontWeight: 800,
                  flexShrink: 0, fontFamily: "var(--font-serif)",
                  position: "relative", zIndex: 1,
                }}>
                  {s.n}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 32 : 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 5 }}>{s.title}</div>
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Wave from="var(--sand-1)" to="var(--sand-2)" />

      {/* ── PLANOS ── */}
      <section style={{ padding: "72px 24px", background: "var(--sand-2)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 className="serif" style={{
            fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
            fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.03em", margin: "0 0 8px",
          }}>
            Comece grátis, cresça quando quiser
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 15, margin: "0 0 40px", lineHeight: 1.6 }}>
            Sem cartão de crédito. Sem prazo. Faça upgrade quando fizer sentido.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>

            {/* Grátis */}
            <div style={{
              background: "var(--sand-1)",
              borderRadius: 22, padding: "26px 22px",
              border: "1px solid rgba(212,201,176,.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".08em", marginBottom: 10 }}>
                GRÁTIS
              </div>
              <div className="serif" style={{ fontSize: 38, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                R$ 0
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 28, marginTop: 5 }}>
                para sempre
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {FREE_FEATURES.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Check size={14} style={{ color: "var(--terra)", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/admin/login" style={{
                display: "block", textAlign: "center",
                marginTop: 26, padding: "12px", borderRadius: 12,
                border: "1.5px solid var(--ink)",
                color: "var(--ink)", fontWeight: 700, fontSize: 14,
                textDecoration: "none",
              }}>
                Começar grátis
              </Link>
            </div>

            {/* Premium */}
            <div style={{
              background: "var(--ink)",
              backgroundImage: DOT_GRID, backgroundSize: "24px 24px",
              borderRadius: 22, padding: "26px 22px",
              position: "relative", overflow: "hidden",
            }}>
              <div className="grain" />
              <div style={{
                position: "absolute", top: -80, right: -60,
                width: 220, height: 220, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(196,135,58,.18) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "rgba(196,135,58,.18)",
                border: "1px solid rgba(196,135,58,.35)",
                borderRadius: 999, padding: "3px 10px", marginBottom: 10,
              }}>
                <Sparkles size={10} style={{ color: "var(--amber)" }} />
                <span style={{ color: "var(--amber-soft)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em" }}>PREMIUM</span>
              </div>
              <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: "var(--sand-1)", lineHeight: 1, position: "relative" }}>
                Sob consulta
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 28, marginTop: 5 }}>
                planos mensais ou anuais
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, position: "relative" }}>
                {PREMIUM_FEATURES.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Check size={14} style={{ color: "var(--amber)", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--sand-2)", lineHeight: 1.45 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/admin/login" style={{
                display: "block", textAlign: "center",
                marginTop: 26, padding: "12px", borderRadius: 12,
                background: "var(--amber)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                textDecoration: "none", position: "relative",
              }}>
                Fale conosco
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Wave from="var(--sand-2)" to="var(--ink)" />

      {/* ── CTA FINAL ── */}
      <section style={{
        background: "var(--ink)",
        backgroundImage: DOT_GRID, backgroundSize: "28px 28px",
        padding: "80px 24px 72px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div className="grain" />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500, height: 300, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(196,135,58,.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 440, margin: "0 auto", position: "relative" }}>
          <h2 className="serif" style={{
            fontSize: "clamp(1.7rem, 6vw, 2.8rem)",
            fontWeight: 700, color: "var(--sand-1)",
            letterSpacing: "-0.03em", lineHeight: 1.1,
            margin: "0 0 16px",
          }}>
            Pronto para aparecer no Guia SBS?
          </h2>
          <p style={{ color: "var(--sand-2)", fontSize: 15, lineHeight: 1.7, margin: "0 0 40px" }}>
            Cadastre seu negócio grátis em minutos e comece a ser encontrado pelos turistas que visitam São Bento do Sapucaí.
          </p>
          <Link href="/admin/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--amber)", color: "#fff",
            padding: "15px 30px", borderRadius: 14,
            fontWeight: 700, fontSize: 16,
            textDecoration: "none", letterSpacing: "-.01em",
          }}>
            Cadastrar meu negócio
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Wave from="var(--ink)" to="var(--sand-1)" />

    </div>
  );
}
