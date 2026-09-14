"use client"

import dynamic from "next/dynamic"

// O PDV é uma aplicação de caixa: roda só no navegador (rascunho da venda no
// localStorage, atalhos, tela cheia). Sem SSR não há divergência de hidratação
// entre o servidor (sem rascunho) e o navegador (com rascunho).
export const PdvCliente = dynamic(() => import("./pdv-app").then((m) => m.PdvApp), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-stone-500">Abrindo o PDV…</div>
  ),
})
