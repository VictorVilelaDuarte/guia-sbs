"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Keyboard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Leitura de código de barras pela câmera do celular — cadastro de produto e PDV
// sem leitor USB. Usa o BarcodeDetector nativo quando existe (Chrome/Android:
// rápido e preciso) e cai para a @zxing/browser no resto (Safari/iPhone), com
// import dinâmico: a lib só baixa quando o leitor abre. Câmera exige HTTPS
// (ou localhost). Sempre há o campo para digitar o código à mão.

const FORMATOS_NATIVOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"]

interface DetectorNativo {
  detect(fonte: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
interface ConstrutorDetector {
  new (opts: { formats: string[] }): DetectorNativo
  getSupportedFormats(): Promise<string[]>
}

export function LeitorCodigoBarras({
  aberto,
  onFechar,
  onLido,
  titulo = "Ler código de barras",
}: {
  aberto: boolean
  onFechar: () => void
  onLido: (codigo: string) => void
  titulo?: string
}) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Aponte a câmera para o código. A leitura é automática.</DialogDescription>
        </DialogHeader>
        {/* Monta só aberto: fechar desliga a câmera (cleanup do efeito). */}
        {aberto && <VisorCamera onLido={onLido} />}
      </DialogContent>
    </Dialog>
  )
}

function VisorCamera({ onLido }: { onLido: (codigo: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<"iniciando" | "lendo" | "erro">("iniciando")
  const [erro, setErro] = useState("")
  const [manual, setManual] = useState("")
  const lido = useRef(false)

  function entregar(codigo: string) {
    const limpo = codigo.replace(/\s+/g, "")
    if (!limpo || lido.current) return
    lido.current = true
    navigator.vibrate?.(80)
    onLido(limpo)
  }

  useEffect(() => {
    let cancelado = false
    let parar: () => void = () => {}

    async function iniciar() {
      const video = videoRef.current
      if (!video) return
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("erro")
        setErro("Este navegador não permite usar a câmera. Digite o código abaixo.")
        return
      }
      const Nativo = (globalThis as unknown as { BarcodeDetector?: ConstrutorDetector }).BarcodeDetector
      try {
        const suportados = Nativo ? await Nativo.getSupportedFormats().catch(() => [] as string[]) : []
        const formatos = FORMATOS_NATIVOS.filter((f) => suportados.includes(f))
        if (Nativo && formatos.length > 0) {
          // ---- nativo
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
            audio: false,
          })
          if (cancelado) return stream.getTracks().forEach((t) => t.stop())
          video.srcObject = stream
          await video.play()
          setEstado("lendo")
          const detector = new Nativo({ formats: formatos })
          const timer = window.setInterval(async () => {
            if (video.readyState < 2) return
            const achados = await detector.detect(video).catch(() => [])
            if (achados[0]?.rawValue) entregar(achados[0].rawValue)
          }, 150)
          parar = () => {
            window.clearInterval(timer)
            stream.getTracks().forEach((t) => t.stop())
          }
        } else {
          // ---- @zxing (Safari/iPhone e navegadores sem BarcodeDetector)
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ])
          if (cancelado) return
          const hints = new Map([
            [
              DecodeHintType.POSSIBLE_FORMATS,
              [
                BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
                BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF,
              ],
            ],
          ])
          const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
          const controles = await leitor.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            video,
            (resultado) => {
              if (resultado) entregar(resultado.getText())
            },
          )
          if (cancelado) return controles.stop()
          setEstado("lendo")
          parar = () => controles.stop()
        }
      } catch (e) {
        if (cancelado) return
        const nome = (e as { name?: string })?.name
        setEstado("erro")
        setErro(
          nome === "NotAllowedError"
            ? "Sem permissão para usar a câmera. Libere nas configurações do navegador ou digite o código abaixo."
            : nome === "NotFoundError"
              ? "Nenhuma câmera encontrada. Digite o código abaixo."
              : "Não foi possível abrir a câmera. Digite o código abaixo.",
        )
      }
    }

    void iniciar()
    return () => {
      cancelado = true
      parar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inicia uma vez por abertura
  }, [])

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
        {/* muted + playsInline: sem isso o Safari do iPhone não toca o vídeo inline. */}
        <video ref={videoRef} muted playsInline autoPlay className="h-full w-full object-cover" />
        {estado === "lendo" && (
          // Moldura de mira: faixa larga e baixa, como o código de barras.
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
          </div>
        )}
        {estado === "iniciando" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
            <Loader2 className="h-6 w-6 animate-spin" />
            Abrindo a câmera…
          </div>
        )}
        {estado === "erro" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/90">
            <Camera className="h-6 w-6" />
            {erro}
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          entregar(manual)
        }}
      >
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="Ou digite o código"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-[16px]"
          />
        </div>
        <Button type="submit" disabled={!manual.trim()}>
          Usar
        </Button>
      </form>
    </div>
  )
}
