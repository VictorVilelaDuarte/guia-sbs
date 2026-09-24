import type { Metadata } from "next"
import Link from "next/link"
import { PaginaTexto } from "@/components/public/pagina-texto"
import { CIDADE, CONTATO_EMAIL, SITE_NAME } from "@/lib/seo/site"

export const metadata: Metadata = {
  title: `Sobre o ${SITE_NAME} — guia de ${CIDADE}`,
  description: `O ${SITE_NAME} reúne comércios, hospedagens, eventos e pontos turísticos de ${CIDADE}, na Serra da Mantiqueira.`,
  alternates: { canonical: "/sobre" },
}

export default function SobrePage() {
  return (
    <PaginaTexto titulo={`Sobre o ${SITE_NAME}`} subtitulo={`O guia digital de ${CIDADE}, na Serra da Mantiqueira.`}>
      <p>
        O {SITE_NAME} nasceu para reunir, num lugar só, o que a cidade tem de melhor: onde comer, onde se hospedar, o
        que fazer, os eventos da semana e os pontos turísticos — com horários, localização e contato de cada lugar.
      </p>
      <p>
        As informações de cada comércio são cadastradas e atualizadas pelo próprio estabelecimento, e todo perfil passa
        por aprovação da nossa equipe antes de aparecer no guia. Os pontos turísticos são mantidos pela equipe do guia.
      </p>

      <h2>Para quem visita</h2>
      <ul>
        <li>
          <Link href="/mapa">Mapa da cidade</Link> com comércios e pontos turísticos.
        </li>
        <li>
          <Link href="/eventos">Agenda de eventos</Link> e <Link href="/pontos-turisticos">pontos turísticos</Link>{" "}
          com dicas de trilhas, mirantes e cachoeiras.
        </li>
        <li>Cardápios, pedidos online e o que está aberto agora.</li>
      </ul>

      <h2>Para quem tem um comércio</h2>
      <p>
        Cadastre o seu negócio para aparecer no guia, no mapa e no Google. Veja os recursos e planos em{" "}
        <Link href="/para-comerciantes">Para comerciantes</Link>.
      </p>

      {CONTATO_EMAIL && (
        <>
          <h2 id="contato">Contato</h2>
          <p>
            Fale com a equipe do guia pelo e-mail <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
          </p>
        </>
      )}
    </PaginaTexto>
  )
}
