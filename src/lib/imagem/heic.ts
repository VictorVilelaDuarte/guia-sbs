// HEIC/HEIF (fotos do iPhone) → JPEG no navegador, antes do recorte e do upload.
// O iOS Safari às vezes manda o arquivo sem MIME — por isso a extensão também conta.
export function ehHeic(file: File) {
  return /^image\/hei[cf]$/.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

// Aceita no seletor de arquivos e no arrastar-e-soltar.
export const ACCEPT_IMAGENS = "image/jpeg,image/png,image/webp,image/heic,image/heif"

export function ehImagem(file: File) {
  return file.type.startsWith("image/") || ehHeic(file)
}

export async function converterHeic(file: File): Promise<File> {
  if (!ehHeic(file)) return file
  // import dinâmico: heic2any acessa window na carga do módulo e quebra o SSR
  const { default: heic2any } = await import("heic2any")
  const convertido = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })
  const blob = Array.isArray(convertido) ? convertido[0] : convertido
  return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" })
}
