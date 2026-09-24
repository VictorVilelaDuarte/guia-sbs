import { redirect } from "next/navigation"

// O antigo "Resumo" da Gestão virou o Início do painel (/comerciante).
// Mantido como redirect para links salvos e favoritos.
export default function GestaoPage() {
  redirect("/comerciante")
}
