"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Minus, Plus, Trash2, Bike, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCarrinho } from "@/lib/carrinho";
import { formaPagamentoLabel } from "@/lib/hospedagem";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Máscara (xx) xxxxx-xxxx — limita a 11 dígitos (DDD + celular).
function formatWhats(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[16px] placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400";

interface ConfigPedido {
  entregaAtiva: boolean;
  retiradaAtiva: boolean;
  pedidoMinimo: number;
  formasPagamento: string[];
  tempoPreparoMin: number | null;
}

interface ZonaCheckout {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  taxa: number;
}

interface Props {
  slug: string;
  comercioId: string;
  nomeComercio: string;
  abertoAgora: boolean;
  zonas: ZonaCheckout[];
  config: ConfigPedido;
}

export function CheckoutForm({ slug, comercioId, nomeComercio, abertoAgora, zonas, config }: Props) {
  const router = useRouter();
  const carrinho = useCarrinho(slug);
  const cardapioHref = `/vitrine/${slug}/cardapio`;

  const [tipoEntrega, setTipoEntrega] = useState<"ENTREGA" | "RETIRADA">(
    config.entregaAtiva ? "ENTREGA" : "RETIRADA",
  );
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numeroEnd, setNumeroEnd] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");
  const [formaPagamento, setFormaPagamento] = useState(config.formasPagamento[0] ?? "");
  const [trocoPara, setTrocoPara] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const entrega = tipoEntrega === "ENTREGA";
  const subtotal = carrinho.subtotal;
  const zonaSelecionada = zonas.find((z) => z.id === zonaId) ?? null;
  const semZonas = entrega && zonas.length === 0;
  const taxa = entrega ? zonaSelecionada?.taxa ?? 0 : 0;
  const total = subtotal + taxa;
  const zonasPorCidade = zonas.reduce<Record<string, ZonaCheckout[]>>((acc, z) => {
    const k = `${z.cidade} · ${z.uf}`;
    (acc[k] ??= []).push(z);
    return acc;
  }, {});
  const abaixoMinimo =
    entrega && config.pedidoMinimo > 0 && subtotal < config.pedidoMinimo;

  function formatCep(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function buscarCep(value: string) {
    const d = value.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setEndereco(data.logradouro);
      }
    } catch {
      // silencioso — o cliente pode preencher manualmente
    } finally {
      setBuscandoCep(false);
    }
  }

  async function enviar() {
    setErro(null);

    if (carrinho.itens.length === 0) return;
    if (!abertoAgora) return setErro("A loja está fechada agora e não está recebendo pedidos.");
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (whats.replace(/\D/g, "").length < 10) return setErro("Informe um WhatsApp válido.");
    if (entrega) {
      if (semZonas)
        return setErro("A loja ainda não cadastrou bairros de entrega. Escolha retirada.");
      if (!zonaId) return setErro("Selecione o bairro de entrega.");
      if (!endereco.trim() || !numeroEnd.trim())
        return setErro("Preencha o endereço de entrega (rua e número).");
    }
    if (!formaPagamento) return setErro("Escolha a forma de pagamento.");
    if (abaixoMinimo) {
      return setErro(`Pedido mínimo para entrega: ${formatBRL(config.pedidoMinimo)}.`);
    }

    const trocoNum = trocoPara ? parseFloat(trocoPara.replace(",", ".")) : null;
    if (formaPagamento === "dinheiro" && trocoNum != null && trocoNum < total) {
      return setErro("O valor do troco é menor que o total.");
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comercioId,
          tipoEntrega,
          clienteNome: nome.trim(),
          clienteWhats: whats.replace(/\D/g, ""),
          cep: entrega ? cep : null,
          endereco: entrega ? endereco : null,
          numeroEnd: entrega ? numeroEnd : null,
          complemento: entrega ? complemento : null,
          referencia: entrega ? referencia : null,
          zonaId: entrega ? zonaId : null,
          formaPagamento,
          trocoPara: formaPagamento === "dinheiro" ? trocoNum : null,
          observacoes: observacoes.trim() || null,
          itens: carrinho.itens.map((i) => ({
            produtoId: i.produtoId,
            variacaoId: i.variacaoId,
            quantidade: i.quantidade,
            observacao: i.observacao,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível enviar o pedido.");
        setEnviando(false);
        return;
      }

      carrinho.limpar();
      // Navega na própria aba (popups após await são bloqueados em mobile).
      router.push(`/pedido/${data.token}`);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setEnviando(false);
    }
  }

  // Carrinho vazio (após hidratar) — não há o que finalizar.
  if (carrinho.mounted && carrinho.itens.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5EFE4] px-6 text-center">
        <p className="text-stone-500">Seu carrinho está vazio.</p>
        <Link
          href={cardapioHref}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFE4] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-200 bg-[#F5EFE4] px-4 py-3">
        <Link
          href={cardapioHref}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold leading-tight text-stone-900">Finalizar pedido</h1>
          <p className="text-xs text-stone-500">{nomeComercio}</p>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4 py-5">
        {/* Loja fechada — bloqueia o envio */}
        {!abertoAgora && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
            <p className="font-semibold text-rose-700">A loja está fechada agora</p>
            <p className="text-rose-600">
              Não é possível enviar pedidos no momento. Tente novamente dentro do
              horário de funcionamento.
            </p>
          </div>
        )}

        {/* Itens */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-stone-900">Seu pedido</h2>
          <ul className="divide-y divide-stone-100">
            {carrinho.itens.map((i) => (
              <li key={i.uid} className="flex items-center gap-3 py-3">
                {i.imagem ? (
                  <Image
                    src={i.imagem}
                    alt={i.titulo}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 font-serif text-stone-300">
                    {i.titulo[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">{i.titulo}</p>
                  {i.variacaoNome && (
                    <p className="text-xs text-stone-500">{i.variacaoNome}</p>
                  )}
                  {i.observacao && (
                    <p className="truncate text-xs text-stone-400">{i.observacao}</p>
                  )}
                  <p className="mt-0.5 text-sm font-semibold text-stone-900">
                    {formatBRL(i.precoUnit * i.quantidade)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => carrinho.setQuantidade(i.uid, i.quantidade - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-600 active:bg-stone-100"
                    aria-label="Diminuir"
                  >
                    {i.quantidade <= 1 ? (
                      <Trash2 className="h-3.5 w-3.5" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">
                    {i.quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => carrinho.setQuantidade(i.uid, i.quantidade + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-600 active:bg-stone-100"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href={cardapioHref}
            className="mt-2 inline-block text-xs font-medium text-stone-500 underline"
          >
            + Adicionar mais itens
          </Link>
        </section>

        {/* Tipo de entrega */}
        {config.entregaAtiva && config.retiradaAtiva && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-stone-900">Como você quer receber?</h2>
            <div className="grid grid-cols-2 gap-2">
              <TipoBtn
                ativo={entrega}
                onClick={() => setTipoEntrega("ENTREGA")}
                icon={<Bike className="h-4 w-4" />}
                label="Entrega"
              />
              <TipoBtn
                ativo={!entrega}
                onClick={() => setTipoEntrega("RETIRADA")}
                icon={<Store className="h-4 w-4" />}
                label="Retirar na loja"
              />
            </div>
          </section>
        )}

        {/* Dados do cliente */}
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-stone-900">Seus dados</h2>
          <Campo label="Nome">
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </Campo>
          <Campo label="WhatsApp">
            <input
              className={inputCls}
              value={whats}
              onChange={(e) => setWhats(formatWhats(e.target.value))}
              inputMode="tel"
              maxLength={15}
              placeholder="(12) 99999-9999"
            />
          </Campo>
        </section>

        {/* Endereço (entrega) */}
        {entrega && (
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900">Endereço de entrega</h2>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="CEP">
                <div className="relative">
                  <input
                    className={inputCls}
                    value={cep}
                    inputMode="numeric"
                    maxLength={9}
                    onChange={(e) => {
                      const f = formatCep(e.target.value);
                      setCep(f);
                      if (f.replace(/\D/g, "").length === 8) buscarCep(f);
                    }}
                    placeholder="00000-000"
                  />
                  {buscandoCep && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-stone-400" />
                  )}
                </div>
              </Campo>
              <Campo label="Número">
                <input
                  className={inputCls}
                  value={numeroEnd}
                  onChange={(e) => setNumeroEnd(e.target.value)}
                  placeholder="123"
                />
              </Campo>
            </div>
            <Campo label="Rua">
              <input
                className={inputCls}
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, avenida…"
              />
            </Campo>
            <Campo label="Bairro / área de entrega">
              {semZonas ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                  A loja ainda não cadastrou bairros de entrega. Escolha
                  “Retirar na loja” acima.
                </p>
              ) : (
                <>
                  <select
                    className={inputCls}
                    value={zonaId}
                    onChange={(e) => setZonaId(e.target.value)}
                  >
                    <option value="">Selecione seu bairro</option>
                    {Object.entries(zonasPorCidade).map(([cidade, lista]) => (
                      <optgroup key={cidade} label={cidade}>
                        {lista.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.nome}
                            {z.taxa > 0 ? ` — ${formatBRL(z.taxa)}` : " — Grátis"}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-stone-400">
                    Não achou seu bairro? A loja não entrega na sua região — você
                    pode escolher retirada.
                  </span>
                </>
              )}
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Complemento" opcional>
                <input
                  className={inputCls}
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, bloco…"
                />
              </Campo>
              <Campo label="Referência" opcional>
                <input
                  className={inputCls}
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Perto de…"
                />
              </Campo>
            </div>
          </section>
        )}

        {/* Pagamento */}
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-stone-900">Pagamento na {entrega ? "entrega" : "retirada"}</h2>
          <div className="flex flex-wrap gap-2">
            {config.formasPagamento.map((fp) => (
              <button
                key={fp}
                type="button"
                onClick={() => setFormaPagamento(fp)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  formaPagamento === fp
                    ? "border-stone-800 bg-stone-900 text-white"
                    : "border-stone-200 text-stone-700 hover:border-stone-300",
                )}
              >
                {formaPagamentoLabel(fp)}
              </button>
            ))}
          </div>
          {formaPagamento === "dinheiro" && (
            <Campo label="Troco para" opcional>
              <input
                className={inputCls}
                value={trocoPara}
                inputMode="decimal"
                onChange={(e) => setTrocoPara(e.target.value)}
                placeholder="Ex: 50,00"
              />
            </Campo>
          )}
        </section>

        {/* Observações */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <Campo label="Observações do pedido" opcional>
            <textarea
              className={cn(inputCls, "resize-none")}
              rows={2}
              maxLength={500}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Algo que a loja precise saber?"
            />
          </Campo>
        </section>

        {/* Resumo */}
        <section className="space-y-1.5 rounded-2xl bg-white p-4 shadow-sm text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatBRL(subtotal)}</span>
          </div>
          {entrega && (
            <div className="flex justify-between text-stone-600">
              <span>Taxa de entrega</span>
              <span className="tabular-nums">
                {!zonaSelecionada ? "—" : taxa > 0 ? formatBRL(taxa) : "Grátis"}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-100 pt-1.5 text-base font-bold text-stone-900">
            <span>Total</span>
            <span className="tabular-nums">{formatBRL(total)}</span>
          </div>
          {config.tempoPreparoMin && (
            <p className="pt-1 text-xs text-stone-400">
              Tempo estimado de preparo: ~{config.tempoPreparoMin} min
            </p>
          )}
        </section>

        {erro && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{erro}</p>
        )}
      </div>

      {/* Botão fixo */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-[#F5EFE4] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || abaixoMinimo || !abertoAgora}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3.5 font-semibold text-white transition-colors active:bg-black disabled:opacity-50"
        >
          {enviando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
            </>
          ) : !abertoAgora ? (
            "Loja fechada"
          ) : abaixoMinimo ? (
            `Mínimo ${formatBRL(config.pedidoMinimo)}`
          ) : (
            <>
              Enviar pedido <span className="tabular-nums">· {formatBRL(total)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function TipoBtn({
  ativo,
  onClick,
  icon,
  label,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
        ativo
          ? "border-stone-800 bg-stone-50 text-stone-900"
          : "border-stone-200 text-stone-600 hover:border-stone-300",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Campo({
  label,
  opcional,
  children,
}: {
  label: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        {opcional && <span className="font-normal text-stone-400"> (opcional)</span>}
      </span>
      {children}
    </label>
  );
}
