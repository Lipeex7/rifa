
const CACHE = "rifa-sobrepeliz-offline-v3";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./qr-pix.png"
];

self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(
        chaves
          .filter(chave => chave !== CACHE)
          .map(chave => caches.delete(chave))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", evento => {
  if (evento.request.method !== "GET") return;

  if (
    new URL(evento.request.url).origin !==
    self.location.origin
  ) return;

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const emCache = await cache.match(evento.request);

    try {
      const resposta = await fetch(evento.request);

      if (resposta.ok) {
        cache.put(
          evento.request,
          resposta.clone()
        );
      }

      return resposta;
    } catch (erro) {
      if (emCache) return emCache;

      if (evento.request.mode === "navigate") {
        return (
          await cache.match("./index.html")
        ) || Response.error();
      }

      return Response.error();
    }
  })());
});
