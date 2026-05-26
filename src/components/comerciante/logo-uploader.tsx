"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"

interface LogoUploaderProps {
  logoAtual: string | null
  comercioId?: string   // quando presente, usa rota admin
  saveUrl?: string      // URL para salvar o campo logo (default: /api/comerciante/comercio)
}

export function LogoUploader({
  logoAtual,
  comercioId,
  saveUrl = "/api/comerciante/comercio",
}: LogoUploaderProps) {
  const [logo, setLogo] = useState<string | null>(logoAtual)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)

    const form = new FormData()
    form.append("file", file)
    form.append("tipo", "logo")
    if (comercioId) form.append("comercioId", comercioId)

    const uploadRes = await fetch("/api/comerciante/upload", { method: "POST", body: form })
    if (!uploadRes.ok) {
      const err = await uploadRes.json()
      toast.error(err.error ?? "Erro no upload.")
      setLoading(false)
      return
    }

    const { url } = await uploadRes.json()

    const saveRes = await fetch(saveUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: url }),
    })

    setLoading(false)

    if (!saveRes.ok) {
      toast.error("Erro ao salvar logo.")
      return
    }

    setLogo(url)
    toast.success("Logo atualizada.")
  }

  async function handleRemove() {
    setLoading(true)
    const res = await fetch(saveUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: "" }),
    })
    setLoading(false)
    if (!res.ok) { toast.error("Erro ao remover logo."); return }
    setLogo(null)
    toast.success("Logo removida.")
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted cursor-pointer overflow-hidden hover:border-ring transition-colors"
        onClick={() => !loading && inputRef.current?.click()}
      >
        {logo ? (
          <Image src={logo} alt="Logo" fill className="object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {logo ? "Trocar logo" : "Enviar logo"}
          </Button>
          {logo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP · máx. 5MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
