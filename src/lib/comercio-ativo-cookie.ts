// Módulo sem dependências (mesmo padrão de admin-comercio-cookie.ts). Não adicionar imports.

// Loja escolhida no seletor do painel por quem tem vínculo válido com mais de um
// comércio (na prática, dono de várias lojas — funcionário pertence a um só).
// Setado por POST /api/comerciante/comercio-ativo; getComercioCtx() só honra o
// valor se o usuário tiver vínculo válido com a loja — forjado, é ignorado.
export const COMERCIO_ATIVO_COOKIE = "comercio_ativo"
