"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TrocarSenhaForm({ obrigatoria }: { obrigatoria: boolean }) {
  const router = useRouter()
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (novaSenha.length < 8) return setErro("A nova senha precisa ter pelo menos 8 caracteres.")
    if (novaSenha !== confirmacao) return setErro("A confirmação não confere com a nova senha.")

    setSalvando(true)
    try {
      const res = await fetch("/api/comerciante/conta/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErro(data.error ?? "Não foi possível trocar a senha.")
        return
      }
      setOk(true)
      // Senha trocada: o layout do painel deixa de redirecionar para cá.
      router.replace("/comerciante")
      router.refresh()
    } catch {
      setErro("Falha de conexão. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="senha-atual">{obrigatoria ? "Senha temporária" : "Senha atual"}</Label>
        <Input
          id="senha-atual"
          type="password"
          autoComplete="current-password"
          required
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nova-senha">Nova senha</Label>
        <Input
          id="nova-senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmacao">Confirme a nova senha</Label>
        <Input
          id="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {ok && <p className="text-sm text-green-700">Senha alterada. Abrindo o painel…</p>}

      <Button type="submit" className="w-full" disabled={salvando || ok}>
        {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {obrigatoria ? "Criar senha e entrar" : "Salvar nova senha"}
      </Button>

      {!obrigatoria && (
        <Link href="/comerciante" className="block text-center text-sm text-muted-foreground hover:underline">
          Voltar ao painel
        </Link>
      )}
    </form>
  )
}
