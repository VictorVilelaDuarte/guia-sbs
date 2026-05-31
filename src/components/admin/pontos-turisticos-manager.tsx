"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { CategoriaPonto } from "@prisma/client"

export const CATEGORIA_LABELS: Record<CategoriaPonto, string> = {
  MIRANTE: "Mirante",
  TRILHA: "Trilha",
  HISTORICO: "Histórico/Cultural",
  CACHOEIRA: "Cachoeira",
}

const CATEGORIA_COLORS: Record<CategoriaPonto, string> = {
  MIRANTE: "bg-sky-100 text-sky-700 border-sky-200",
  TRILHA: "bg-green-100 text-green-700 border-green-200",
  HISTORICO: "bg-amber-100 text-amber-700 border-amber-200",
  CACHOEIRA: "bg-cyan-100 text-cyan-700 border-cyan-200",
}

interface PontoTuristico {
  id: string
  nome: string
  slug: string
  categoria: CategoriaPonto
  fotos: string[]
  ativo: boolean
  createdAt: Date
}

interface Props {
  pontos: PontoTuristico[]
}

export function PontosTuristicosManager({ pontos: initial }: Props) {
  const router = useRouter()
  const [pontos, setPontos] = useState(initial)
  const [criando, setCriando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState<CategoriaPonto>("MIRANTE")

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/admin/pontos-turisticos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, categoria }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao criar ponto.")
      return
    }
    const novo = await res.json()
    setCriando(false)
    setNome("")
    router.push(`/admin/pontos-turisticos/${novo.id}`)
  }

  async function handleToggleAtivo(ponto: PontoTuristico) {
    const res = await fetch(`/api/admin/pontos-turisticos/${ponto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ponto.ativo }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar."); return }
    setPontos((prev) => prev.map((p) => p.id === ponto.id ? { ...p, ativo: !p.ativo } : p))
    toast.success(ponto.ativo ? "Ponto desativado." : "Ponto ativado.")
  }

  async function handleExcluir(ponto: PontoTuristico) {
    if (!confirm(`Excluir "${ponto.nome}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/pontos-turisticos/${ponto.id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Erro ao excluir."); return }
    setPontos((prev) => prev.filter((p) => p.id !== ponto.id))
    toast.success("Ponto excluído.")
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pontos Turísticos</h1>
          <p className="text-muted-foreground text-sm">
            {pontos.length} ponto{pontos.length !== 1 ? "s" : ""} cadastrado{pontos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => { setCriando(true); setNome("") }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo ponto
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fotos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pontos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Nenhum ponto turístico cadastrado.
                </TableCell>
              </TableRow>
            )}
            {pontos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    className="hover:text-primary transition-colors text-left"
                    onClick={() => router.push(`/admin/pontos-turisticos/${p.id}`)}
                  >
                    {p.nome}
                  </button>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORIA_COLORS[p.categoria]}`}>
                    {CATEGORIA_LABELS[p.categoria]}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {p.fotos.length}/8
                  </span>
                </TableCell>
                <TableCell>
                  {p.ativo ? (
                    <Badge variant="default">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/admin/pontos-turisticos/${p.id}`)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleAtivo(p)}>
                        {p.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {p.ativo ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleExcluir(p)}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={criando} onOpenChange={(v) => !v && setCriando(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo ponto turístico</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="pt-nome">Nome</Label>
              <Input
                id="pt-nome"
                required
                autoFocus
                placeholder="Ex: Mirante do Chapéu"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaPonto)}>
                <SelectTrigger id="pt-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIA_LABELS) as CategoriaPonto[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORIA_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCriando(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar e editar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
