import type { ReactNode } from "react"

// Link que abre o PDV em aba própria (decisão da Fase 3: o PDV é tela cheia, fora
// do painel). O `target` com NOME fixo reaproveita a mesma aba: clicar de novo
// traz o PDV já aberto para a frente em vez de abrir várias abas com vendas soltas.
export const PDV_HREF = "/comerciante/pdv"
export const PDV_JANELA = "pdv"

export function AbrirPdvLink({
  className,
  children,
  href = PDV_HREF,
  ...rest
}: { className?: string; children: ReactNode; href?: string; "aria-label"?: string; style?: React.CSSProperties }) {
  return (
    <a href={href} target={PDV_JANELA} className={className} {...rest}>
      {children}
    </a>
  )
}
