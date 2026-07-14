// Service worker MÍNIMO — só Web Push. NÃO é um PWA: sem manifest, sem
// cache, sem handler de fetch. Serve apenas para receber notificações de
// novos pedidos quando o painel do comerciante está em segundo plano ou
// com o navegador fechado (desktop/Android). Ver docs/pedido-online.md.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = {};
  }

  const title = data.title || "Novo pedido";
  const options = {
    body: data.body || "",
    tag: data.tag,
    renotify: !!data.tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/comerciante/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) ||
    "/comerciante/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // Se o painel já está aberto numa aba, foca nela.
        for (const client of list) {
          if (client.url.includes("/comerciante/dashboard") && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
  );
});
