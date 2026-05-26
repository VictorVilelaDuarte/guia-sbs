"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { HorariosEditor } from "@/components/comerciante/horarios-editor";
import {
  EnderecoInput,
  type EnderecoData,
} from "@/components/comerciante/endereco-input";

const categorias = [
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "HOSPEDAGEM", label: "Hospedagem" },
  { value: "TURISMO", label: "Turismo" },
  { value: "SERVICO", label: "Serviço" },
  { value: "COMERCIO", label: "Comércio" },
  { value: "ENTRETENIMENTO", label: "Entretenimento" },
];

const categoriaLabels: Record<string, string> = Object.fromEntries(
  categorias.map((c) => [c.value, c.label]),
);

interface SubcategoriaBasica {
  id: string;
  nome: string;
  categoria: string;
}

interface Comercio {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  subcategorias: SubcategoriaBasica[];
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  horarios: string | null;
  lat: number | null;
  lng: number | null;
}

export function EditarComercioForm({
  comercio,
  subcategoriasDisponiveis,
  saveUrl = "/api/comerciante/comercio",
  saveMethod = "PATCH",
  adminMode = false,
}: {
  comercio: Comercio;
  subcategoriasDisponiveis: SubcategoriaBasica[];
  saveUrl?: string;
  saveMethod?: "PATCH" | "PUT";
  adminMode?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: comercio.nome,
    descricao: comercio.descricao ?? "",
    categoria: comercio.categoria,
    telefone: comercio.telefone ?? "",
    whatsapp: comercio.whatsapp ?? "",
    email: comercio.email ?? "",
    website: comercio.website ?? "",
    instagram: comercio.instagram ?? "",
    horarios: comercio.horarios ?? "",
  });
  const [subcategoriaIds, setSubcategoriaIds] = useState<string[]>(
    comercio.subcategorias.map((s) => s.id),
  );
  const [endereco, setEndereco] = useState<EnderecoData>({
    cep: comercio.cep ?? "",
    endereco: comercio.endereco ?? "",
    numero: comercio.numero ?? "",
    bairro: comercio.bairro ?? "",
    cidade: comercio.cidade ?? "",
    estado: comercio.estado ?? "",
    lat: comercio.lat ?? undefined,
    lng: comercio.lng ?? undefined,
  });

  function handleWhatsappChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) {
      value =
        value.length < 7
          ? `(${value.slice(0, 2)}) ${value.slice(2)}`
          : `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setForm({ ...form, whatsapp: value });
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) {
      value =
        value.length < 7
          ? `(${value.slice(0, 2)}) ${value.slice(2)}`
          : `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setForm({ ...form, telefone: value });
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(saveUrl, {
      method: saveMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...endereco, subcategoriaIds }),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Erro ao salvar alterações.");
      return;
    }

    toast.success("Informações atualizadas com sucesso.");
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nome">Nome do comércio</Label>
          <Input
            id="nome"
            required
            value={form.nome}
            onChange={field("nome")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <textarea
            id="descricao"
            rows={4}
            className={`${inputClass} resize-none`}
            value={form.descricao}
            onChange={field("descricao")}
          />
        </div>

        {adminMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => {
                  setForm({ ...form, categoria: v ?? form.categoria });
                  setSubcategoriaIds([]);
                }}
              >
                <SelectTrigger id="categoria">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? (categoriaLabels[value] ?? value) : "Selecione..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const chips = subcategoriasDisponiveis.filter(
                (s) => s.categoria === form.categoria,
              );
              if (chips.length === 0) return null;
              return (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Subcategorias</Label>
                  <div className="flex flex-wrap gap-2">
                    {chips.map((s) => {
                      const ativo = subcategoriaIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setSubcategoriaIds((ids) =>
                              ativo ? ids.filter((id) => id !== s.id) : [...ids, s.id],
                            )
                          }
                          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                            ativo
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-input hover:bg-muted"
                          }`}
                        >
                          {s.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Endereço</h3>
        <EnderecoInput value={endereco} onChange={setEndereco} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            placeholder="(00) 0000-0000"
            maxLength={15}
            value={form.telefone}
            onChange={handleTelefoneChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="(00) 00000-0000"
            maxLength={15}
            value={form.whatsapp}
            onChange={handleWhatsappChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail público</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={field("email")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={field("website")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            placeholder="@usuario"
            value={form.instagram}
            onChange={field("instagram")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Horários de funcionamento</Label>
          <HorariosEditor
            value={form.horarios}
            onChange={(v) => setForm((f) => ({ ...f, horarios: v }))}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
