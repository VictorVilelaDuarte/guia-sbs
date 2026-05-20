"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Tag {
  id: string
  nome: string
}

interface TagsEditorProps {
  tagsIniciais: Tag[]
  limite?: number
}

export function TagsEditor({ tagsIniciais, limite }: TagsEditorProps) {
  const [tags, setTags] = useState<Tag[]>(tagsIniciais)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const atingiuLimite = limite !== undefined && tags.length >= limite

  function normalize(value: string) {
    return value.toLowerCase().trim().replace(/\s+/g, " ")
  }

  async function addTag(raw: string) {
    const nome = normalize(raw)
    if (!nome) return

    if (atingiuLimite) {
      toast.warning(`Limite de ${limite} palavras-chave atingido. Faça upgrade para o plano Premium.`)
      setInput("")
      return
    }

    if (tags.some((t) => t.nome === nome)) {
      setInput("")
      return
    }

    setLoading(true)
    const res = await fetch("/api/comerciante/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao adicionar tag.")
      return
    }

    const tag: Tag = await res.json()
    setTags((prev) => [...prev, tag])
    setInput("")
  }

  async function removeTag(id: string) {
    setRemovingId(id)
    const res = await fetch(`/api/comerciante/tags/${id}`, { method: "DELETE" })
    setRemovingId(null)

    if (!res.ok) {
      toast.error("Erro ao remover tag.")
      return
    }

    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1].id)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-wrap gap-2 min-h-10 px-3 py-2 rounded-md border border-input bg-background",
          !atingiuLimite && "cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        )}
        onClick={() => !atingiuLimite && inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
          >
            {tag.nome}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag.id) }}
              disabled={removingId === tag.id}
              className="hover:text-destructive transition-colors disabled:opacity-50 ml-0.5"
              aria-label={`Remover ${tag.nome}`}
            >
              {removingId === tag.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <X className="h-3 w-3" />
              }
            </button>
          </span>
        ))}

        {!atingiuLimite && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) addTag(input) }}
            placeholder={tags.length === 0 ? "Digite uma palavra-chave e pressione Enter..." : ""}
            className="flex-1 min-w-32 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            disabled={loading}
          />
        )}

        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />}
      </div>

      {atingiuLimite && (
        <p className="text-xs text-amber-600 font-medium">
          Limite de {limite} palavras-chave atingido. Faça upgrade para o plano Premium para adicionar mais.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {!atingiuLimite && (
            <>
              Pressione <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd> ou <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">,</kbd> para adicionar.
              {" "}Backspace remove a última.
            </>
          )}
        </p>
        {limite !== undefined && (
          <p className={`text-xs font-medium ${atingiuLimite ? "text-amber-600" : "text-muted-foreground"}`}>
            {tags.length}/{limite} palavras-chave
          </p>
        )}
      </div>
    </div>
  )
}
