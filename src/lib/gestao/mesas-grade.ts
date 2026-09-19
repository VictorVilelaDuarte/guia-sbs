// Grade da planta do salão. Módulo sem runtime: vale no servidor (validação) e
// no navegador (editor da Gestão e mapa do PDV).
//
// A mesa guarda COLUNA e LINHA, não pixels: o tamanho da célula muda entre
// desktop e celular sem bagunçar a planta salva.

export const GRADE_COLUNAS = 14
export const GRADE_LINHAS = 10

export interface PosicaoMesa {
  id: string
  x: number
  y: number
}

export function dentroDaGrade(x: number, y: number) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < GRADE_COLUNAS && y < GRADE_LINHAS
}

// Primeira célula livre a partir de (x, y), em espiral quadrada. Usada quando a
// mesa é solta em cima de outra: em vez de recusar o arraste, encosta ao lado.
export function celulaLivre(x: number, y: number, ocupadas: Set<string>): { x: number; y: number } {
  const limpo = (v: number, max: number) => Math.min(Math.max(v, 0), max - 1)
  const alvoX = limpo(x, GRADE_COLUNAS)
  const alvoY = limpo(y, GRADE_LINHAS)
  if (!ocupadas.has(`${alvoX},${alvoY}`)) return { x: alvoX, y: alvoY }
  for (let raio = 1; raio < Math.max(GRADE_COLUNAS, GRADE_LINHAS); raio++) {
    for (let dy = -raio; dy <= raio; dy++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (Math.abs(dx) !== raio && Math.abs(dy) !== raio) continue
        const nx = alvoX + dx
        const ny = alvoY + dy
        if (nx < 0 || ny < 0 || nx >= GRADE_COLUNAS || ny >= GRADE_LINHAS) continue
        if (!ocupadas.has(`${nx},${ny}`)) return { x: nx, y: ny }
      }
    }
  }
  return { x: alvoX, y: alvoY }
}
