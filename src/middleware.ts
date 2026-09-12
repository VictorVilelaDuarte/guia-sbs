import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"
import { ADMIN_COMERCIO_COOKIE } from "@/lib/admin-comercio-cookie"
import { rotaPainelLegada } from "@/lib/painel/rotas"

const { auth } = NextAuth(authConfig)

// /admin/comercios/[id]/gerenciar — captura o id para gravar no cookie
const GERENCIAR_RE = /^\/admin\/comercios\/([^/]+)\/gerenciar(?:\/|$)/

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login"
  const isComercianteRoute = pathname.startsWith("/comerciante")
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN"
  const isComerciante = role === "COMERCIANTE"

  if (pathname === "/admin/login" && isLoggedIn) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    if (isComerciante) return NextResponse.redirect(new URL("/comerciante", req.url))
    return NextResponse.next()
  }

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL(isComerciante ? "/comerciante" : "/", req.url))
  }

  if (isComercianteRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }
  if (isComercianteRoute && !isComerciante) {
    // Admin gerenciando um comércio usa as mesmas páginas do comerciante. Aqui só
    // se confere a presença do cookie (checagem otimista); a validação real — o
    // comércio existe e a sessão é admin — é do getComercioCtx() no layout e nas APIs.
    if (isAdmin && req.cookies.get(ADMIN_COMERCIO_COOKIE)?.value) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL(isAdmin ? "/admin/comercios" : "/", req.url))
  }

  // Antigo painel de abas: /comerciante/dashboard?tab=X → rota equivalente da
  // Vitrine ou da Gestão. Permanente — links salvos e o service worker de push
  // antigo (que abre ?tab=pedidos) seguem funcionando.
  if (pathname === "/comerciante/dashboard") {
    const tab = req.nextUrl.searchParams.get("tab")
    return NextResponse.redirect(new URL(rotaPainelLegada(tab), req.url), 308)
  }

  // Admin abrindo o painel de um comércio: grava o comércio-alvo num cookie
  // httpOnly e redireciona para o painel do comerciante. Páginas e rotas
  // /api/comerciante/* resolvem o comércio por esse cookie (getComercioCtx).
  const gerenciar = pathname.match(GERENCIAR_RE)
  if (gerenciar && isAdmin) {
    const destino = new URL(rotaPainelLegada(req.nextUrl.searchParams.get("tab")), req.url)
    const res = NextResponse.redirect(destino)
    res.cookies.set(ADMIN_COMERCIO_COOKIE, gerenciar[1], {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
    return res
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/comerciante/:path*"],
}
