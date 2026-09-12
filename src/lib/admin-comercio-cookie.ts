// Módulo sem dependências: importado pelo middleware (Edge) e por
// src/lib/comercio-ctx.ts (Node). Não adicionar imports aqui.

// Cookie que aponta qual comércio um admin está gerenciando. Setado pelo
// middleware ao abrir /admin/comercios/[id]/gerenciar (que redireciona para o
// painel do comerciante); honrado apenas para sessões ADMIN/SUPER_ADMIN em
// getComercioCtx().
export const ADMIN_COMERCIO_COOKIE = "admin_comercio_id"
