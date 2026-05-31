"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Loader2, ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_FOTOS = 8

interface Props {
  pontoId: string
  fotosIniciais: string[]
}

export function PontoTuristicoFotos({ pontoId, fotosIniciais }: Props) {
  const [fotos, setFotos] = useState(fotosIniciais)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const slotsLivres = MAX_FOTOS - fotos.length

  async function processFiles(rawFiles: File[]) {
    if (slotsLivres <= 0) return
    const toProcess = rawFiles.slice(0, slotsLivres)
    setUploading(true)

    for (const rawFile of toProcess) {
      let file = rawFile

      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif")

      if (isHeic) {
        try {
          const { default: heic2any } = await import("heic2any")
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })
          const blob = Array.isArray(converted) ? converted[0] : converted
          file = new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" })
        } catch {
          toast.error(`Não foi possível converter "${file.name}".`)
          continue
        }
      }

      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/admin/pontos-turisticos/${pontoId}/fotos`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? `Erro ao enviar "${file.name}".`)
      } else {
        const data = await res.json()
        setFotos(data.fotos)
      }
    }

    setUploading(false)
    if (rawFiles.length > slotsLivres) {
      toast.warning(`Limite de ${MAX_FOTOS} fotos. ${rawFiles.length - slotsLivres} arquivo(s) ignorado(s).`)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length > 0) processFiles(files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (slotsLivres > 0) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name),
    )
    if (files.length > 0) processFiles(files)
  }

  async function handleDeletar(url: string) {
    setDeletando(url)
    const res = await fetch(`/api/admin/pontos-turisticos/${pontoId}/fotos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    setDeletando(null)
    if (!res.ok) { toast.error("Erro ao remover foto."); return }
    const data = await res.json()
    setFotos(data.fotos)
    toast.success("Foto removida.")
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fotos.length}/{MAX_FOTOS} fotos · arraste para adicionar
        </p>
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-lg border-2 border-dashed p-1.5 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-transparent",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fotos.map((url) => (
          <div key={url} className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-muted">
            <Image src={url} alt="" fill className="object-cover" sizes="96px" />
            <button
              type="button"
              onClick={() => handleDeletar(url)}
              disabled={!!deletando}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              {deletando === url
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <X className="h-3 w-3" />
              }
            </button>
          </div>
        ))}

        {slotsLivres > 0 && (
          <div
            className={cn(
              "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-muted/30 hover:bg-muted/50 text-muted-foreground",
            )}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] leading-tight text-center px-1">
                  {isDragging
                    ? "Soltar aqui"
                    : slotsLivres < MAX_FOTOS
                      ? `${slotsLivres} restante${slotsLivres !== 1 ? "s" : ""}`
                      : "Adicionar"}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple={slotsLivres > 1}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
