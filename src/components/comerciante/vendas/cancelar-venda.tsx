"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Cancelar venda manual concluída (lançada por engano). Motivo obrigatório —
// fica no histórico e a venda sai do faturamento.
export function CancelarVenda({ pedidoId, numero }: { pedidoId: string; numero: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [salvando, setSalvando] = useState(false)

  async function cancelar() {
    setSalvando(true)
    try {
      const res = await fetch(`/api/comerciante/gestao/vendas/${pedidoId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? "Não foi possível cancelar.")
      toast.success(`Venda #${numero} cancelada.`)
      setOpen(false)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <button type="button" className="text-xs text-muted-foreground hover:text-destructive hover:underline" onClick={() => setOpen(true)}>
        Cancelar
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar venda #{numero}?</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3 text-sm">
            <p>A venda sai do faturamento e o cancelamento fica registrado no histórico.</p>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (ex.: lançada em duplicidade)" className="text-[16px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Voltar</Button>
              <Button variant="destructive" disabled={salvando || motivo.trim().length < 3} onClick={cancelar}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancelar venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
