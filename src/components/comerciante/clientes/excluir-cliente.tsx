"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Exclusão a pedido do cliente (LGPD). A confirmação explica exatamente o que
// some e o que fica — a ação não tem volta.
export function ExcluirCliente({ clienteId, nome }: { clienteId: string; nome: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  async function excluir() {
    setExcluindo(true)
    try {
      const res = await fetch(`/api/comerciante/gestao/clientes/${clienteId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível excluir.")
        return
      }
      toast.success("Cliente excluído e dados pessoais removidos dos pedidos.")
      router.push("/comerciante/gestao/clientes")
      router.refresh()
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="mr-1.5 h-4 w-4" />
        Excluir cliente
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir {nome}?</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3 text-sm">
            <p>Use quando o cliente pedir para ter os dados apagados. Não dá para desfazer.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>O cadastro (nome, WhatsApp, e-mail, aniversário, observações e tags) é apagado.</li>
              <li>
                Nos pedidos dele, somem nome, WhatsApp, endereço e observações. Itens, valores e
                datas continuam, para o seu faturamento ficar correto.
              </li>
              <li>Se ele fizer um novo pedido, um cadastro novo é criado.</li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="destructive" disabled={excluindo} onClick={excluir}>
                {excluindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir definitivamente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
