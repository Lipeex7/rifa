
const CACHE = "rifa-sobrepeliz-gotica-v5";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./compradores.html",
  "./manifest.webmanifest",
  "./cabecalho-gotico.webp",
  "./cruz-comprado.webp",
  "./rodape-gotico.webp",
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
          .filter(chave =>
            chave.startsWith("rifa-sobrepeliz-") &&
            chave !== CACHE
          )
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

    if (evento.request.mode === "navigate") {
      try {
        const resposta = await fetch(evento.request);

        if (resposta.ok) {
          await cache.put(
            evento.request,
            resposta.clone()
          );
        }

        return resposta;
      } catch (erro) {
        return (
          await cache.match(evento.request)
        ) || Response.error();
      }
    }

    const salvo = await cache.match(evento.request);

    if (salvo) return salvo;

    try {
      const resposta = await fetch(evento.request);

      if (resposta.ok) {
        await cache.put(
          evento.request,
          resposta.clone()
        );
      }

      return resposta;
    } catch (erro) {
      return Response.error();
    }
  })());
});
