
// Etapa 1 da Rifa Solidária 2.0. Altere a versão ao publicar mudanças.
const CACHE = 'rifa-sobrepeliz-v10-reformulacao';
const OBRIGATORIOS = ['./', './index.html', './rifa.css', './rifa.js'];
const EXTRAS = [
  './compradores.html', './divulgacao.html', './sorteio.html',
  './manifest.webmanifest', './cabecalho-gotico.webp',
  './cruz-comprado.webp', './rodape-gotico.webp', './qr-pix.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(OBRIGATORIOS);
    await Promise.allSettled(EXTRAS.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key =>
      key.startsWith('rifa-sobrepeliz-') && key !== CACHE
    ).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const tipo = req.destination;
    const atualizar = req.mode === 'navigate' || tipo === 'script' || tipo === 'style';
    if (atualizar) {
      try {
        const resposta = await fetch(req);
        if (resposta.ok) await cache.put(req, resposta.clone());
        return resposta;
      } catch (_) {
        return await cache.match(req) ||
          (req.mode === 'navigate' ? await cache.match('./index.html') : null) ||
          Response.error();
      }
    }
    const salvo = await cache.match(req);
    if (salvo) return salvo;
    try {
      const resposta = await fetch(req);
      if (resposta.ok) await cache.put(req, resposta.clone());
      return resposta;
    } catch (_) { return Response.error(); }
  })());
});
