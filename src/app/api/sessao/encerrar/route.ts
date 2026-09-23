import { signOut } from "@/lib/auth"

// Encerra a sessão e volta para o login. Usada quando o JWT ainda é válido mas a
// conta não existe mais (apagada, ou banco recriado pelo seed): mandar direto
// para /admin/login entraria em loop, porque o middleware vê o JWT e devolve
// para o painel. Server Component não apaga cookie — por isso uma rota.
// GET de propósito (é alvo de redirect); o pior que um link forjado faz é deslogar.
export async function GET() {
  await signOut({ redirectTo: "/admin/login" })
}
