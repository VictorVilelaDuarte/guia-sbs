"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";

const MapaPicker = dynamic(
  () => import("./mapa-picker").then((m) => ({ default: m.MapaPicker })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full rounded-lg border border-input bg-muted animate-pulse" />
    ),
  },
);

export interface EnderecoData {
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  lat?: number;
  lng?: number;
}

interface EnderecoInputProps {
  value: EnderecoData;
  onChange: (data: EnderecoData) => void;
}

const DEFAULT_LAT = -26.2489;
const DEFAULT_LNG = -49.3799; // São Bento do Sul, SC

async function geocodeCidade(
  cidade: string,
  estado: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${cidade}, ${estado}, Brasil`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "GuiaSBS/1.0" },
    });
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export function EnderecoInput({ value, onChange }: EnderecoInputProps) {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mapaVisivel, setMapaVisivel] = useState(!!(value.lat && value.lng));

  const mapLat = value.lat ?? DEFAULT_LAT;
  const mapLng = value.lng ?? DEFAULT_LNG;

  function set(field: keyof EnderecoData, val: string) {
    onChange({ ...value, [field]: val });
  }

  function formatCep(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    return digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setBuscando(true);
    setErro(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        setErro("CEP não encontrado.");
        setBuscando(false);
        return;
      }

      const cidade = data.localidade ?? value.cidade;
      const estado = data.uf ?? value.estado;

      // Geocodifica a cidade para centralizar o mapa
      const coords = await geocodeCidade(cidade, estado);

      onChange({
        ...value,
        cep: formatCep(digits),
        endereco: data.logradouro ?? value.endereco,
        bairro: data.bairro ?? value.bairro,
        cidade,
        estado,
        lat: coords?.lat ?? value.lat,
        lng: coords?.lng ?? value.lng,
      });

      setMapaVisivel(true);
    } catch {
      setErro("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="relative">
            <Input
              id="cep"
              placeholder="00000-000"
              maxLength={9}
              value={value.cep}
              onChange={(e) => {
                const formatted = formatCep(e.target.value);
                set("cep", formatted);
                if (formatted.replace(/\D/g, "").length === 8)
                  buscarCep(formatted);
              }}
            />
            {buscando && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            placeholder="123"
            value={value.numero}
            onChange={(e) => set("numero", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco">Logradouro</Label>
        <Input
          id="endereco"
          placeholder="Rua, Avenida..."
          value={value.endereco}
          onChange={(e) => set("endereco", e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            value={value.bairro}
            onChange={(e) => set("bairro", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={value.cidade}
            onChange={(e) => set("cidade", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">UF</Label>
          <Input
            id="estado"
            maxLength={2}
            value={value.estado}
            onChange={(e) => set("estado", e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {mapaVisivel && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Localização no mapa
            </Label>
            {value.lat && value.lng && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </span>
            )}
          </div>
          <MapaPicker
            lat={mapLat}
            lng={mapLng}
            onPick={(lat, lng) => onChange({ ...value, lat, lng })}
          />
          <p className="text-xs text-muted-foreground">
            Arraste o pin para marcar a localização exata do comércio para
            aparecer no mapa interativo.
          </p>
        </div>
      )}
    </div>
  );
}
