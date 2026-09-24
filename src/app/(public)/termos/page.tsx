import type { Metadata } from "next"
import Link from "next/link"
import { PaginaTexto } from "@/components/public/pagina-texto"
import { SITE_NAME } from "@/lib/seo/site"

export const metadata: Metadata = {
  title: `Termos de uso | ${SITE_NAME}`,
  description: `Regras de uso do ${SITE_NAME} para visitantes e comerciantes.`,
  alternates: { canonical: "/termos" },
}

export default function TermosPage() {
  return (
    <PaginaTexto titulo="Termos de uso" atualizadoEm="23 de setembro de 2026">
      <p>
        Ao usar o {SITE_NAME} você concorda com estes termos. Se não concordar, não use o site.
      </p>

      <h2>O que é o guia</h2>
      <p>
        O {SITE_NAME} é uma plataforma que divulga comércios, hospedagens, eventos e pontos turísticos e permite que
        comércios recebam pedidos online. O guia não vende produtos nem presta os serviços anunciados: cada comércio é
        responsável pelo que oferece, pelos preços, pela entrega e pelo atendimento.
      </p>

      <h2>Informações publicadas</h2>
      <p>
        Horários, preços, cardápios, fotos e demais informações de cada perfil são cadastrados pelo próprio comércio.
        Fazemos o possível para mantê-las corretas, mas elas podem mudar sem aviso — na dúvida, confirme com o
        estabelecimento. Informações de trilhas e pontos turísticos são orientativas: verifique as condições do local e
        respeite as regras de segurança.
      </p>

      <h2>Pedidos online</h2>
      <p>
        O pedido é feito diretamente ao comércio, que pode aceitá-lo ou recusá-lo. Pagamento, troco, entrega e eventuais
        trocas ou reembolsos são combinados com o comércio.
      </p>

      <h2>Para comerciantes</h2>
      <ul>
        <li>Mantenha as informações do perfil verdadeiras e atualizadas.</li>
        <li>Publique apenas fotos e textos que você tem direito de usar.</li>
        <li>Use os dados de clientes só para atender os pedidos e nos limites da LGPD.</li>
        <li>Cada membro da equipe deve usar a própria conta e não compartilhar a senha.</li>
      </ul>
      <p>
        Podemos recusar, suspender ou remover perfis com informação falsa, conteúdo impróprio ou uso indevido da
        plataforma. Os recursos de cada plano são os informados no momento da contratação.
      </p>

      <h2>Privacidade</h2>
      <p>
        O tratamento de dados pessoais está descrito na <Link href="/privacidade">Política de privacidade</Link>.
      </p>

      <h2>Alterações</h2>
      <p>Estes termos podem ser atualizados. A data da última atualização fica no topo desta página.</p>
    </PaginaTexto>
  )
}
