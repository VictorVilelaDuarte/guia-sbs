"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Plus, X } from "lucide-react"

interface Foto {
  id: string
  url: string
  alt: string | null
}

interface FotosUploaderProps {
  fotosIniciais: Foto[]
}

export function FotosUploader({ fotosIniciais }: FotosUploaderProps) {
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciais)
  const [uploading, setUploading] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setUploading(true)

    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append("file", file)
      form.append("tipo", "foto")

      const uploadRes = await fetch("/api/comerciante/upload", { method: "POST", body: form })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        toast.error(err.error ?? "Erro no upload.")
        continue
      }

      const { url } = await uploadRes.json()

      const saveRes = await fetch("/api/comerciante/fotos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!saveRes.ok) {
        toast.error("Erro ao salvar foto.")
        continue
      }

      const foto: Foto = await saveRes.json()
      setFotos((prev) => [...prev, foto])
    }

    setUploading(false)
  }

  async function handleRemove(id: string) {
    setRemovendo(id)
    const res = await fetch(`/api/comerciante/fotos/${id}`, { method: "DELETE" })
    setRemovendo(null)

    if (!res.ok) {
      toast.error("Erro ao remover foto.")
      return
    }

    setFotos((prev) => prev.filter((f) => f.id !== id))
    toast.success("Foto removida.")
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((foto) => (
          <div key={foto.id} className="group relative aspect-video rounded-lg overflow-hidden border border-input bg-muted">
            <Image src={foto.url} alt={foto.alt ?? "Foto do comércio"} fill className="object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(foto.id)}
              disabled={removendo === foto.id}
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
            >
              {removendo === foto.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted hover:border-ring transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Plus className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP · máx. 5MB por foto · pode selecionar várias de uma vez
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
