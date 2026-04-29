import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

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

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/comerciante/:path*"],
}
