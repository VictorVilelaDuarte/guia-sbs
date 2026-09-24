"use client"

import { useCallback, useRef, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { toast } from "sonner"
import { Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { converterHeic } from "@/lib/imagem/heic"

// Toda imagem cadastrada no sistema é quadrada: o recorte acontece no navegador,
// antes do upload, e o servidor recebe um arquivo já 1:1. Assim as telas podem
// exibir em quadrado sem cortar nada que o comerciante não tenha escolhido.
//
// Uso:
//   const { recortar, cropper } = useRecorteQuadrado()
//   const prontos = await recortar(arquivos) // os descartados ficam de fora
//   ...
//   {cropper}

const LADO_MAX = 1600 // px — suficiente para tela retina, bem abaixo do limite de 5 MB
const QUALIDADE_JPEG = 0.88
const ZOOM_MAX = 4

interface Opcoes {
  // Logo em PNG/WebP mantém a transparência (sai PNG). Fotos saem JPEG com fundo branco.
  preservarTransparencia?: boolean
}

interface Fila {
  arquivos: File[]
  indice: number
  prontos: File[]
  resolver: (prontos: File[]) => void
}

export function useRecorteQuadrado({ preservarTransparencia = false }: Opcoes = {}) {
  const fila = useRef<Fila | null>(null)
  const [atual, setAtual] = useState<{ arquivo: File; url: string; indice: number; total: number } | null>(null)
  const [preparando, setPreparando] = useState(false)

  const abrir = useCallback(async (f: Fila) => {
    // Pula arquivos que não abrem (HEIC que falhou na conversão) sem travar a fila.
    while (f.indice < f.arquivos.length) {
      const original = f.arquivos[f.indice]
      setPreparando(true)
      try {
        const arquivo = await converterHeic(original)
        setAtual({ arquivo, url: URL.createObjectURL(arquivo), indice: f.indice, total: f.arquivos.length })
        return
      } catch {
        toast.error(`Não foi possível abrir "${original.name}".`)
        f.indice++
      } finally {
        setPreparando(false)
      }
    }
    fila.current = null
    setAtual(null)
    f.resolver(f.prontos)
  }, [])

  const avancar = useCallback(
    (pronto: File | null) => {
      const f = fila.current
      if (!f) return
      if (atual) URL.revokeObjectURL(atual.url)
      if (pronto) f.prontos.push(pronto)
      f.indice++
      void abrir(f)
    },
    [abrir, atual],
  )

  const cancelarTudo = useCallback(() => {
    const f = fila.current
    if (atual) URL.revokeObjectURL(atual.url)
    fila.current = null
    setAtual(null)
    f?.resolver(f.prontos)
  }, [atual])

  const recortar = useCallback(
    (arquivos: File[]) =>
      new Promise<File[]>((resolver) => {
        if (arquivos.length === 0) return resolver([])
        // Uma fila por vez; se outra estiver aberta, ela termina com o que já foi confirmado.
        fila.current?.resolver(fila.current.prontos)
        const f: Fila = { arquivos, indice: 0, prontos: [], resolver }
        fila.current = f
        void abrir(f)
      }),
    [abrir],
  )

  const cropper = (
    <Dialog open={!!atual || preparando} onOpenChange={(aberto) => !aberto && cancelarTudo()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        {atual ? (
          <Editor
            key={atual.url}
            arquivo={atual.arquivo}
            url={atual.url}
            indice={atual.indice}
            total={atual.total}
            preservarTransparencia={preservarTransparencia}
            onConfirmar={avancar}
            onPular={() => avancar(null)}
            onCancelar={cancelarTudo}
          />
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <DialogTitle className="sr-only">Preparando a foto</DialogTitle>
            <Loader2 className="h-4 w-4 animate-spin" /> Preparando a foto…
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return { recortar, cropper }
}

function Editor({
  arquivo,
  url,
  indice,
  total,
  preservarTransparencia,
  onConfirmar,
  onPular,
  onCancelar,
}: {
  arquivo: File
  url: string
  indice: number
  total: number
  preservarTransparencia: boolean
  onConfirmar: (f: File) => void
  onPular: () => void
  onCancelar: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    if (!area) return
    setSalvando(true)
    try {
      onConfirmar(await gerarQuadrado(url, area, arquivo, preservarTransparencia))
    } catch {
      toast.error("Não foi possível recortar a foto.")
      setSalvando(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajuste a foto{total > 1 ? ` (${indice + 1} de ${total})` : ""}</DialogTitle>
        <DialogDescription>Arraste para posicionar e use o zoom. A foto fica quadrada em todo o site.</DialogDescription>
      </DialogHeader>

      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-stone-200">
        <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          aspect={1}
          maxZoom={ZOOM_MAX}
          objectFit="cover"
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, px) => setArea(px)}
          style={{ containerStyle: { background: "transparent" } }}
        />
      </div>

      <div className="flex items-center gap-3">
        <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="range"
          aria-label="Zoom"
          min={1}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-foreground"
        />
        <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          {total > 1 && (
            <Button type="button" variant="ghost" onClick={onPular} disabled={salvando}>
              Pular esta
            </Button>
          )}
        </div>
        <Button type="button" onClick={confirmar} disabled={!area || salvando}>
          {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {indice + 1 < total ? "Usar e próxima" : "Usar foto"}
        </Button>
      </DialogFooter>
    </>
  )
}

// Desenha a área escolhida num canvas quadrado. Fundo branco só por garantia
// (JPEG não tem transparência); a área sempre fica dentro da foto.
async function gerarQuadrado(url: string, area: Area, original: File, preservarTransparencia: boolean): Promise<File> {
  const img = await carregar(url)
  const lado = Math.max(1, Math.min(LADO_MAX, Math.round(area.width)))
  const escala = lado / area.width

  const canvas = document.createElement("canvas")
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas indisponível")

  const png = preservarTransparencia && /^image\/(png|webp|gif)$/.test(original.type)
  if (!png) {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, lado, lado)
  }
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, -area.x * escala, -area.y * escala, img.naturalWidth * escala, img.naturalHeight * escala)

  const tipo = png ? "image/png" : "image/jpeg"
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, png ? undefined : QUALIDADE_JPEG))
  if (!blob) throw new Error("falha ao gerar a imagem")
  const nome = original.name.replace(/\.[^.]+$/, "") + (png ? ".png" : ".jpg")
  return new File([blob], nome, { type: tipo })
}

function carregar(url: string) {
  return new Promise<HTMLImageElement>((ok, erro) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = erro
    img.src = url
  })
}
