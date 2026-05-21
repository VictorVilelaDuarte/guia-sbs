"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"

export function ShareButton({ title }: { title: string }) {
  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Link copiado!")
      }
    } catch {
      // usuário cancelou o compartilhamento
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Compartilhar"
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      <Share2 className="h-4 w-4" />
    </button>
  )
}
