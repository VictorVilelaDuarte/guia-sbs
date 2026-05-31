"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EnderecoInput, type EnderecoData } from "@/components/comerciante/endereco-input"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { CategoriaPonto, Dificuldade } from "@prisma/client"

interface PontoForm {
  nome: string
  descricao: string
  ativo: boolean
  endereco: EnderecoData
  dicas: string
  dificuldade: Dificuldade | ""
  distanciaKm: string
  duracaoMin: string
  altitudeM: string
  temPiscinaNatural: boolean
  precisaGuia: boolean
  periodo: string
}

interface Props {
  id: string
  categoria: CategoriaPonto
  inicial: {
    nome: string
    descricao: string | null
    ativo: boolean
    cep: string | null
    endereco: string | null
    numero: string | null
    bairro: string | null
    cidade: string | null
    estado: string | null
    lat: number | null
    lng: number | null
    dicas: string | null
    dificuldade: Dificuldade | null
    distanciaKm: number | null
    duracaoMin: number | null
    altitudeM: number | null
    temPiscinaNatural: boolean | null
    precisaGuia: boolean | null
    periodo: string | null
  }
}

export function PontoTuristicoForm({ id, categoria, inicial }: Props) {
  const [form, setForm] = useState<PontoForm>({
    nome: inicial.nome,
    descricao: inicial.descricao ?? "",
    ativo: inicial.ativo,
    endereco: {
      cep: inicial.cep ?? "",
      endereco: inicial.endereco ?? "",
      numero: inicial.numero ?? "",
      bairro: inicial.bairro ?? "",
      cidade: inicial.cidade ?? "",
      estado: inicial.estado ?? "",
      lat: inicial.lat ?? undefined,
      lng: inicial.lng ?? undefined,
    },
    dicas: inicial.dicas ?? "",
    dificuldade: inicial.dificuldade ?? "",
    distanciaKm: inicial.distanciaKm?.toString() ?? "",
    duracaoMin: inicial.duracaoMin?.toString() ?? "",
    altitudeM: inicial.altitudeM?.toString() ?? "",
    temPiscinaNatural: inicial.temPiscinaNatural ?? false,
    precisaGuia: inicial.precisaGuia ?? false,
    periodo: inicial.periodo ?? "",
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof PontoForm>(field: K, value: PontoForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload: Record<string, unknown> = {
      nome: form.nome,
      descricao: form.descricao || null,
      ativo: form.ativo,
      cep: form.endereco.cep || null,
      endereco: form.endereco.endereco || null,
      numero: form.endereco.numero || null,
      bairro: form.endereco.bairro || null,
      cidade: form.endereco.cidade || null,
      estado: form.endereco.estado || null,
      lat: form.endereco.lat ?? null,
      lng: form.endereco.lng ?? null,
      dicas: form.dicas || null,
    }

    if (categoria === "TRILHA") {
      payload.dificuldade = form.dificuldade || null
      payload.distanciaKm = form.distanciaKm ? parseFloat(form.distanciaKm) : null
      payload.duracaoMin = form.duracaoMin ? parseInt(form.duracaoMin) : null
    }
    if (categoria === "MIRANTE") {
      payload.altitudeM = form.altitudeM ? parseInt(form.altitudeM) : null
    }
    if (categoria === "CACHOEIRA") {
      payload.temPiscinaNatural = form.temPiscinaNatural
      payload.precisaGuia = form.precisaGuia
    }
    if (categoria === "HISTORICO") {
      payload.periodo = form.periodo || null
    }

    const res = await fetch(`/api/admin/pontos-turisticos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (!res.ok) { toast.error("Erro ao salvar."); return }
    toast.success("Ponto atualizado.")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Básico */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pt-nome">Nome</Label>
          <Input
            id="pt-nome"
            required
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pt-desc">Descrição</Label>
          <Textarea
            id="pt-desc"
            rows={4}
            placeholder="Conte sobre o ponto turístico..."
            value={form.descricao}
            onChange={(e) => set("descricao", e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted-foreground">Visível para os visitantes quando publicado.</p>
          </div>
          <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
        </div>
      </div>

      {/* Localização */}
      <div className="space-y-4 pt-2 border-t">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Localização</h3>
        <EnderecoInput value={form.endereco} onChange={(v) => set("endereco", v)} />
      </div>

      {/* Detalhes específicos por categoria */}
      {categoria === "TRILHA" && (
        <div className="space-y-4 pt-2 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Detalhes da trilha</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pt-dif">Dificuldade</Label>
              <Select
                value={form.dificuldade}
                onValueChange={(v) => set("dificuldade", v as Dificuldade | "")}
              >
                <SelectTrigger id="pt-dif">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACIL">Fácil</SelectItem>
                  <SelectItem value="MODERADA">Moderada</SelectItem>
                  <SelectItem value="DIFICIL">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-dist">Distância (km)</Label>
              <Input
                id="pt-dist"
                type="number"
                min="0"
                step="0.1"
                placeholder="Ex: 3.5"
                value={form.distanciaKm}
                onChange={(e) => set("distanciaKm", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-dur">Duração (min)</Label>
              <Input
                id="pt-dur"
                type="number"
                min="0"
                placeholder="Ex: 90"
                value={form.duracaoMin}
                onChange={(e) => set("duracaoMin", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {categoria === "MIRANTE" && (
        <div className="space-y-4 pt-2 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Detalhes do mirante</h3>
          <div className="max-w-[200px] space-y-2">
            <Label htmlFor="pt-alt">Altitude (m)</Label>
            <Input
              id="pt-alt"
              type="number"
              min="0"
              placeholder="Ex: 1890"
              value={form.altitudeM}
              onChange={(e) => set("altitudeM", e.target.value)}
            />
          </div>
        </div>
      )}

      {categoria === "CACHOEIRA" && (
        <div className="space-y-4 pt-2 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Detalhes da cachoeira</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="pt-piscina"
                checked={form.temPiscinaNatural}
                onCheckedChange={(v) => set("temPiscinaNatural", !!v)}
              />
              <Label htmlFor="pt-piscina" className="cursor-pointer">Tem piscina natural</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="pt-guia"
                checked={form.precisaGuia}
                onCheckedChange={(v) => set("precisaGuia", !!v)}
              />
              <Label htmlFor="pt-guia" className="cursor-pointer">Recomenda guia local</Label>
            </div>
          </div>
        </div>
      )}

      {categoria === "HISTORICO" && (
        <div className="space-y-4 pt-2 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Detalhes históricos</h3>
          <div className="space-y-2">
            <Label htmlFor="pt-per">Período / Época</Label>
            <Input
              id="pt-per"
              placeholder="Ex: Século XIX, Fundado em 1854"
              value={form.periodo}
              onChange={(e) => set("periodo", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Dicas */}
      <div className="space-y-4 pt-2 border-t">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Dicas</h3>
        <Textarea
          rows={3}
          placeholder="Ex: Melhor visitar ao amanhecer. Leve protetor solar e água."
          value={form.dicas}
          onChange={(e) => set("dicas", e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}
