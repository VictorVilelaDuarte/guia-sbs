// Módulo sem dependências: importado pelo middleware (Edge) e por
// src/lib/comercio-ctx.ts (Node). Não adicionar imports aqui.

// Cookie que aponta qual comércio um admin está gerenciando no painel
// (/admin/comercios/[id]/gerenciar). Setado pelo middleware; honrado
// apenas para sessões ADMIN/SUPER_ADMIN em getComercioCtx().
export const ADMIN_COMERCIO_COOKIE = "admin_comercio_id"
