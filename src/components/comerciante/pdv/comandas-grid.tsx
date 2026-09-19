"use client"

// Diálogo de abertura/edição de comanda. O mapa do salão vive em mapa-salao.tsx.
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function AbrirComandaDialog({
  open,
  onOpenChange,
  servicoPct,
  onAbrir,
  titulo = "Abrir comanda",
  inicial,
  mesasLivres = [],
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  servicoPct: number | null
  onAbrir: (d: { mesa: string; nome: string; cobrarServico: boolean }) => Promise<void>
  titulo?: string
  inicial?: { mesa: string; nome: string }
  mesasLivres?: string[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {open && <FormComanda servicoPct={servicoPct} onAbrir={onAbrir} inicial={inicial} editar={!!inicial} mesasLivres={mesasLivres} />}
      </DialogContent>
    </Dialog>
  )
}

function FormComanda({ servicoPct, onAbrir, inicial, editar, mesasLivres }: {
  servicoPct: number | null
  onAbrir: (d: { mesa: string; nome: string; cobrarServico: boolean }) => Promise<void>
  inicial?: { mesa: string; nome: string }
  editar: boolean
  mesasLivres: string[]
}) {
  const [mesa, setMesa] = useState(inicial?.mesa ?? "")
  const [nome, setNome] = useState(inicial?.nome ?? "")
  const [servico, setServico] = useState(servicoPct != null)
  const [ocupado, setOcupado] = useState(false)
  const campo = "h-12 w-full rounded-xl border border-stone-300 px-3 text-[16px]"
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!mesa.trim() && !nome.trim()) return
        setOcupado(true)
        try {
          await onAbrir({ mesa: mesa.trim(), nome: nome.trim(), cobrarServico: servico })
        } finally {
          setOcupado(false)
        }
      }}
    >
      <input autoFocus value={mesa} onChange={(e) => setMesa(e.target.value)} placeholder="Mesa (ex.: 4, Varanda 2)" maxLength={20} className={cn(campo, "text-lg font-semibold")} />
      {mesasLivres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mesasLivres.slice(0, 12).map((m) => (
            <button key={m} type="button" onClick={() => setMesa(m)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium ring-1", mesa === m ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-stone-300")}>
              {m}
            </button>
          ))}
        </div>
      )}
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={editar ? "Nome da comanda" : "Nome do cliente (opcional com mesa)"} maxLength={60} className={campo} />
      {!editar && servicoPct != null && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={servico} onChange={(e) => setServico(e.target.checked)} className="h-4 w-4" />
          Cobrar taxa de serviço ({String(servicoPct).replace(".", ",")}%)
        </label>
      )}
      <button type="submit" disabled={ocupado || (!mesa.trim() && !nome.trim())} className="h-12 w-full rounded-xl bg-stone-900 font-semibold text-white disabled:opacity-40">
        {editar ? "Salvar" : "Abrir"}
      </button>
    </form>
  )
}
