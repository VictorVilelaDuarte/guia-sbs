import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Planos
  const planFree = await prisma.plan.upsert({
    where: { slug: "free" },
    update: {},
    create: {
      slug: "free",
      nome: "Gratuito",
      descricao: "Perfil básico com informações essenciais do comércio.",
      preco: 0,
      ordem: 0,
      features: {
        eventos: false,
        fotos_ilimitadas: false,
        destaque_busca: false,
        analytics: false,
        qr_code: false,
      },
    },
  })

  await prisma.plan.upsert({
    where: { slug: "premium" },
    update: {},
    create: {
      slug: "premium",
      nome: "Premium",
      descricao: "Perfil completo com todos os recursos da plataforma.",
      preco: 49.9,
      ordem: 1,
      features: {
        eventos: true,
        fotos_ilimitadas: true,
        destaque_busca: true,
        analytics: true,
        qr_code: true,
      },
    },
  })

  console.log("Planos criados: Gratuito, Premium")

  // Super Admin
  const email = "admin@guiasbs.com.br"
  const exists = await prisma.user.findUnique({ where: { email } })

  if (exists) {
    console.log("Super admin já existe.")
    return
  }

  const password = await bcrypt.hash("admin123", 10)
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      password,
      role: "SUPER_ADMIN",
    },
  })

  console.log("Super admin criado:")
  console.log("  E-mail: admin@guiasbs.com.br")
  console.log("  Senha:  admin123")
  console.log("  ⚠️  Troque a senha após o primeiro login.")

  void planFree
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
