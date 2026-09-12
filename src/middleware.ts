import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"
import { ADMIN_COMERCIO_COOKIE } from "@/lib/admin-comercio-cookie"

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
    if (isComerciante) return NextResponse.redirect(new URL("/comerciante/dashboard", req.url))
    return NextResponse.next()
  }

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL(isComerciante ? "/comerciante/dashboard" : "/", req.url))
  }

  if (isComercianteRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }
  if (isComercianteRoute && !isComerciante) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Admin abrindo o painel de gestão de um comércio: grava o comércio-alvo num
  // cookie httpOnly. As rotas /api/comerciante/* usam esse cookie (via
  // getComercioCtx) para resolver o comércio quando a sessão é de admin.
  const gerenciar = pathname.match(GERENCIAR_RE)
  if (gerenciar && isAdmin) {
    const res = NextResponse.next()
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
