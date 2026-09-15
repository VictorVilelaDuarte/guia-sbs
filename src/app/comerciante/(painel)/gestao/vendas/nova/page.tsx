import { redirect } from "next/navigation"

// A tela de lançamento dentro do painel virou o PDV em tela cheia (Fase 3):
// links antigos e favoritos seguem funcionando.
export default function NovaVendaPage() {
  redirect("/comerciante/pdv")
}
