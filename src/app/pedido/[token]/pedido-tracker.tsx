"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formaPagamentoLabel } from "@/lib/hospedagem";
import {
  STATUS_LABEL_CLIENTE,
  passosFluxo,
  isStatusTerminal,
  clientePodeCancelar,
} from "@/lib/pedidos";
import type { PedidoStatus, TipoEntrega } from "@prisma/client";

interface ItemData {
  id: string;
  titulo: string;
  variacaoNome: string | null;
  precoUnit: number;
  quantidade: number;
  observacao: string | null;
}

export interface PedidoData {
  token: string;
  numero: number;
  status: PedidoStatus;
  tipoEntrega: TipoEntrega;
  clienteNome: string;
  cep: string | null;
  endereco: string | null;
  numeroEnd: string | null;
  bairro: string | null;
  complemento: string | null;
  referencia: string | null;
  formaPagamento: string;
  trocoPara: number | null;
  observacoes: string | null;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  motivoCancelamento: string | null;
  createdAt: string;
  itens: ItemData[];
  comercio: {
    nome: string;
    slug: string;
    logo: string | null;
    whatsapp: string | null;
    pedidoConfig: { tempoPreparoMin: number | null } | null;
  };
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PedidoTracker({ initial }: { initial: PedidoData }) {
  const [pedido, setPedido] = useState<PedidoData>(initial);
  const [cancelando, setCancelando] = useState(false);

  const terminal = isStatusTerminal(pedido.status);

  // Polling a cada 20s enquanto o pedido não está em estado terminal.
  // O guard usa o status do mount; o intervalo se encerra sozinho ao chegar
  // num estado terminal durante o polling.
  useEffect(() => {
    if (isStatusTerminal(initial.status)) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/pedidos/${initial.token}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: PedidoData = await res.json();
        setPedido(data);
        if (isStatusTerminal(data.status)) clearInterval(id);
      } catch {
        // mantém o estado atual; tenta de novo no próximo tick
      }
    }, 20000);
    return () => clearInterval(id);
  }, [initial.token, initial.status]);

  async function cancelar() {
    if (!confirm("Deseja cancelar este pedido?")) return;
    setCancelando(true);
    try {
      const res = await fetch(`/api/pedidos/${initial.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "cancelar" }),
      });
      if (res.ok) {
        setPedido((p) => ({
          ...p,
          status: "CANCELADO",
          motivoCancelamento: "Cancelado pelo cliente",
        }));
      } else {
        const data = await res.json();
        alert(data.error ?? "Não foi possível cancelar.");
      }
    } finally {
      setCancelando(false);
    }
  }

  const cancelado = pedido.status === "CANCELADO" || pedido.status === "RECUSADO";
  const passos = passosFluxo(pedido.tipoEntrega);
  const idxAtual = passos.indexOf(pedido.status);
  const entrega = pedido.tipoEntrega === "ENTREGA";

  const whatsHref = pedido.comercio.whatsapp
    ? `https://wa.me/55${pedido.comercio.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Sobre meu pedido #${pedido.numero}`,
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#F5EFE4] pb-10">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href={`/vitrine/${pedido.comercio.slug}`}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white bg-stone-200 shadow-sm"
          >
            {pedido.comercio.logo ? (
              <Image
                src={pedido.comercio.logo}
                alt={pedido.comercio.nome}
                fill
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-bold text-stone-500">
                {pedido.comercio.nome[0]}
              </span>
            )}
          </Link>
          <div>
            <p className="text-xs text-stone-500">Pedido #{pedido.numero}</p>
            <h1 className="font-bold leading-tight text-stone-900">
              {pedido.comercio.nome}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4 py-5">
        {/* Status atual */}
        <section
          className={cn(
            "rounded-2xl p-5 text-center shadow-sm",
            cancelado ? "bg-rose-50" : "bg-white",
          )}
        >
          {!terminal && (
            <div className="mb-2 flex justify-center">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
              </span>
            </div>
          )}
          <h2
            className={cn(
              "text-lg font-bold",
              cancelado ? "text-rose-600" : "text-stone-900",
            )}
          >
            {STATUS_LABEL_CLIENTE[pedido.status]}
          </h2>
          {cancelado && pedido.motivoCancelamento && (
            <p className="mt-1 text-sm text-rose-500">{pedido.motivoCancelamento}</p>
          )}
          {!terminal && pedido.comercio.pedidoConfig?.tempoPreparoMin && (
            <p className="mt-1 text-sm text-stone-500">
              Tempo estimado: ~{pedido.comercio.pedidoConfig.tempoPreparoMin} min
            </p>
          )}
        </section>

        {/* Timeline */}
        {!cancelado && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <ol className="space-y-0">
              {passos.map((passo, i) => {
                const feito = i < idxAtual;
                const atual = i === idxAtual;
                const ultimo = i === passos.length - 1;
                return (
                  <li key={passo} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          feito && "border-green-500 bg-green-500 text-white",
                          atual && "border-amber-500 bg-amber-500 text-white",
                          !feito && !atual && "border-stone-200 bg-white text-stone-300",
                        )}
                      >
                        {feito ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </span>
                      {!ultimo && (
                        <span
                          className={cn(
                            "h-8 w-0.5",
                            i < idxAtual ? "bg-green-500" : "bg-stone-200",
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "pt-0.5 text-sm",
                        atual
                          ? "font-semibold text-stone-900"
                          : feito
                            ? "text-stone-600"
                            : "text-stone-400",
                      )}
                    >
                      {STATUS_LABEL_CLIENTE[passo]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Resumo */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-stone-900">Resumo</h3>
          <ul className="space-y-2">
            {pedido.itens.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 text-sm">
                <span className="text-stone-700">
                  <span className="font-medium tabular-nums">{i.quantidade}× </span>
                  {i.titulo}
                  {i.variacaoNome && (
                    <span className="text-stone-400"> · {i.variacaoNome}</span>
                  )}
                  {i.observacao && (
                    <span className="block text-xs text-stone-400">{i.observacao}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-stone-600">
                  {formatBRL(i.precoUnit * i.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatBRL(pedido.subtotal)}</span>
            </div>
            {entrega && (
              <div className="flex justify-between text-stone-600">
                <span>Taxa de entrega</span>
                <span className="tabular-nums">
                  {pedido.taxaEntrega > 0 ? formatBRL(pedido.taxaEntrega) : "Grátis"}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-bold text-stone-900">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(pedido.total)}</span>
            </div>
          </div>
        </section>

        {/* Detalhes entrega + pagamento */}
        <section className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {entrega ? "Entrega" : "Retirada"}
            </p>
            {entrega ? (
              <p className="text-stone-700">
                {pedido.endereco}, {pedido.numeroEnd}
                {pedido.complemento && ` · ${pedido.complemento}`}
                <br />
                {pedido.bairro}
                {pedido.referencia && (
                  <span className="block text-stone-400">Ref: {pedido.referencia}</span>
                )}
              </p>
            ) : (
              <p className="text-stone-700">Retirar na loja</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Pagamento
            </p>
            <p className="text-stone-700">
              {formaPagamentoLabel(pedido.formaPagamento)}
              {pedido.trocoPara != null && ` · troco para ${formatBRL(pedido.trocoPara)}`}
            </p>
          </div>
          {pedido.observacoes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Observações
              </p>
              <p className="text-stone-700">{pedido.observacoes}</p>
            </div>
          )}
        </section>

        {/* Ações */}
        <div className="space-y-2">
          {whatsHref && (
            <a
              href={whatsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-5 py-3.5 font-semibold text-white transition-colors active:bg-green-600"
            >
              <MessageCircle className="h-4 w-4" /> Falar com a loja
            </a>
          )}
          {clientePodeCancelar(pedido.status) && (
            <button
              type="button"
              onClick={cancelar}
              disabled={cancelando}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-medium text-stone-500 transition-colors active:bg-stone-100 disabled:opacity-50"
            >
              {cancelando && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancelar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
