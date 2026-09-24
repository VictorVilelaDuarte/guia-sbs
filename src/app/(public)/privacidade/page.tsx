import type { Metadata } from "next"
import Link from "next/link"
import { PaginaTexto } from "@/components/public/pagina-texto"
import { CONTATO_EMAIL, SITE_NAME } from "@/lib/seo/site"

export const metadata: Metadata = {
  title: `Política de privacidade | ${SITE_NAME}`,
  description: `Quais dados o ${SITE_NAME} coleta, para quê, com quem compartilha e como exercer seus direitos (LGPD).`,
  alternates: { canonical: "/privacidade" },
}

// Texto fiel ao que o sistema faz (conferido no código em 2026-09-23). Ao mudar
// a coleta de dados — novo campo no checkout, cookie, integração — atualizar aqui.
export default function PrivacidadePage() {
  return (
    <PaginaTexto
      titulo="Política de privacidade"
      subtitulo="Como tratamos os seus dados, em linguagem simples."
      atualizadoEm="23 de setembro de 2026"
    >
      <p>
        Esta política explica quais dados pessoais o {SITE_NAME} trata, para quê e quais são os seus direitos, conforme a
        Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>Navegar pelo guia</h2>
      <p>
        Você pode usar o guia sem criar conta. Para mostrar aos comércios quantas pessoas visitam o perfil deles,
        registramos visitas e cliques (por exemplo, &quot;abriu o cardápio&quot; ou &quot;clicou no WhatsApp&quot;) de forma
        anônima: usamos um identificador aleatório que vale só enquanto a aba está aberta. Não usamos cookies de
        publicidade nem guardamos seu nome, e-mail ou endereço IP nessas estatísticas.
      </p>
      <p>
        Os itens do carrinho ficam guardados só no seu navegador até você finalizar o pedido.
      </p>

      <h2>Fazer um pedido</h2>
      <p>
        Ao pedir pelo cardápio online ou pelo QR Code da mesa, você informa nome e WhatsApp e, se for entrega, o
        endereço. Esses dados vão para o comércio que recebe o pedido, que os usa para preparar, entregar e falar com
        você sobre ele. O comércio também pode manter um cadastro de clientes com o histórico de pedidos feitos na loja
        dele — cada comércio só vê os próprios clientes.
      </p>
      <p>
        Nesses casos o comércio é o responsável pelo uso dos seus dados no atendimento, e o {SITE_NAME} é a plataforma que
        os armazena para ele. Você pode pedir diretamente ao comércio que corrija ou apague o seu cadastro; ao apagar, os
        pedidos antigos ficam sem nome, telefone e endereço.
      </p>

      <h2>Contas de comerciantes e equipes</h2>
      <p>
        Quem gerencia um comércio no guia tem uma conta com nome, e-mail e senha (guardada de forma criptografada). Esses
        dados servem para o acesso ao painel e para contato sobre o serviço.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>Não vendemos dados. Usamos fornecedores que processam dados em nosso nome, só para o guia funcionar:</p>
      <ul>
        <li>hospedagem do site e do banco de dados (Vercel e Supabase);</li>
        <li>mapas (Google Maps) e busca de endereço por CEP (ViaCEP);</li>
        <li>notificações no navegador para comerciantes, quando ativadas.</li>
      </ul>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto o comércio usar o guia ou enquanto forem necessários para cumprir obrigações legais.
        Dados de pedidos podem ser mantidos pelo comércio para controle das próprias vendas.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão, e informações
        sobre com quem os compartilhamos.
        {CONTATO_EMAIL ? (
          <>
            {" "}
            Para isso, escreva para <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
          </>
        ) : (
          " Para isso, fale com o comércio onde fez o pedido ou com a equipe do guia."
        )}
      </p>

      <p>
        Veja também os <Link href="/termos">Termos de uso</Link>.
      </p>
    </PaginaTexto>
  )
}
