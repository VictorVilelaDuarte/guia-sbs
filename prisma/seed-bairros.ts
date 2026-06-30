import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Catálogo canônico de bairros/áreas de entrega. Base: lista real da Hot Stone
// Pizzaria (referência local) normalizada + bairros oficiais + "Zona rural"
// genérica + cidade vizinha (Gonçalves/MG). Idempotente por (nome, cidade).
// Roda com: npm run db:seed:bairros

const SBS = "São Bento do Sapucaí"
const GON = "Gonçalves"

const bairros: { nome: string; cidade: string; uf: string }[] = [
  // São Bento do Sapucaí (SP)
  { nome: "Centro", cidade: SBS, uf: "SP" },
  { nome: "Campo Monteiro", cidade: SBS, uf: "SP" },
  { nome: "Caracol", cidade: SBS, uf: "SP" },
  { nome: "Caracol — sentido Morro à Riba", cidade: SBS, uf: "SP" },
  { nome: "CDHU Antiga", cidade: SBS, uf: "SP" },
  { nome: "CDHU Nova", cidade: SBS, uf: "SP" },
  { nome: "Córrego da Foice", cidade: SBS, uf: "SP" },
  { nome: "Dias", cidade: SBS, uf: "SP" },
  { nome: "Fervura (até a Reciclagem)", cidade: SBS, uf: "SP" },
  { nome: "Monjolinho (até a Igreja)", cidade: SBS, uf: "SP" },
  { nome: "Osório", cidade: SBS, uf: "SP" },
  { nome: "Pinheiro", cidade: SBS, uf: "SP" },
  { nome: "Rancho Fundo", cidade: SBS, uf: "SP" },
  { nome: "Santa Terezinha", cidade: SBS, uf: "SP" },
  { nome: "Sítio", cidade: SBS, uf: "SP" },
  { nome: "Sítio — sentido Pousada da Nória", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — do Posto Barracão até o Km 2", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — Km 2 ao 3", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — Km 3 ao 5", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — Km 6 até o Bar do Bosco", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — Estacionamento do Chico Bento", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — Igreja São Pedro", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — próximo à Cachoeira dos Amores", cidade: SBS, uf: "SP" },
  { nome: "Paiol Grande — Restaurante Pedra do Baú", cidade: SBS, uf: "SP" },
  { nome: "Quilombo — Parte de Cima", cidade: SBS, uf: "SP" },
  { nome: "Quilombo — Parte de Baixo (Campinho)", cidade: SBS, uf: "SP" },
  { nome: "Quilombo — Estr. Artesã Jandyra Silva Costa", cidade: SBS, uf: "SP" },
  { nome: "Serrano — Igreja São José", cidade: SBS, uf: "SP" },
  { nome: "Serrano — sentido Caminho da Mata", cidade: SBS, uf: "SP" },
  { nome: "Serrano — sentido Pousada Vida na Roça", cidade: SBS, uf: "SP" },
  { nome: "Serrano — sentido Quinta dos Cogumelos", cidade: SBS, uf: "SP" },
  { nome: "Serrano — Vilage", cidade: SBS, uf: "SP" },
  { nome: "Serrano — Vilinha", cidade: SBS, uf: "SP" },
  { nome: "Pousada Aldeia dos Manacás (Serrano)", cidade: SBS, uf: "SP" },
  { nome: "Pousada Cara de Cão (Paiol Grande)", cidade: SBS, uf: "SP" },
  { nome: "Pousada Recanto do Rei (Paiol Grande)", cidade: SBS, uf: "SP" },
  { nome: "Pousada Vale do Coimbra (Paiol Grande)", cidade: SBS, uf: "SP" },
  { nome: "Pousada Paioleiro (Paiol Grande)", cidade: SBS, uf: "SP" },
  { nome: "Pousada Vilarejo São Francisco", cidade: SBS, uf: "SP" },
  { nome: "Cantagalo", cidade: SBS, uf: "SP" },
  { nome: "Jardim Nova Conquista", cidade: SBS, uf: "SP" },
  { nome: "Zona rural", cidade: SBS, uf: "SP" },
  // Gonçalves (MG) — cidade vizinha
  { nome: "Trevo de Gonçalves", cidade: GON, uf: "MG" },
  { nome: "Pousada Mont Sha'n (Gonçalves)", cidade: GON, uf: "MG" },
]

async function main() {
  let criados = 0
  for (let i = 0; i < bairros.length; i++) {
    const b = bairros[i]
    await prisma.bairro.upsert({
      where: { nome_cidade: { nome: b.nome, cidade: b.cidade } },
      update: { uf: b.uf, ordem: i },
      create: { ...b, ordem: i },
    })
    criados++
  }
  console.log(`Catálogo de bairros sincronizado: ${criados} entradas.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
