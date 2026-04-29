import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
