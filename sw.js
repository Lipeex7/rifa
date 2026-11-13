
const CACHE = "rifa-sobrepeliz-offline-v1";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
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
  if (
    evento.request.method !== "GET" ||
    new URL(evento.request.url).origin !== self.location.origin
  ) return;

  evento.respondWith(
    fetch(evento.request)
      .then(resposta => {
        if (resposta.ok) {
          const copia = resposta.clone();

          caches.open(CACHE).then(cache => {
            cache.put(evento.request, copia);
          });
        }

        return resposta;
      })
      .catch(() =>
        caches.match(evento.request)
          .then(resposta =>
            resposta || caches.match("./index.html")
          )
      )
  );
});
