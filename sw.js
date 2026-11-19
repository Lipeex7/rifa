// Rifa Solidária 2.0 — 125 números / Rodada Extra.
// Para forçar atualização de arquivos em nova publicação, mude a versão.
const CACHE = 'rifa-sobrepeliz-v11-125-numeros';
const ARQUIVOS = [
  './', './index.html', './rifa.css', './rifa.js',
  './rodada-extra.html', './rodada-extra.css', './rodada-extra.js',
  './compradores.html', './divulgacao.html', './sorteio.html',
  './manifest.webmanifest', './cabecalho-gotico.webp',
  './cruz-comprado.webp', './rodape-gotico.webp', './qr-pix.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ARQUIVOS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter(chave =>
      chave.startsWith('rifa-sobrepeliz-') && chave !== CACHE
    ).map(chave => caches.delete(chave)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const atualizar = req.mode === 'navigate' ||
      req.destination === 'script' || req.destination === 'style';
    // Remove apenas a query para encontrar páginas com ?numero=101 no cache offline.
    const semQuery = new URL(url.href);
    semQuery.search = '';
    const salvo = async () => await cache.match(req) || await cache.match(semQuery.href);

    if (atualizar) {
      try {
        const resposta = await fetch(req);
        if (resposta.ok) await cache.put(semQuery.href, resposta.clone());
        return resposta;
      } catch (_) {
        return await salvo() ||
          (req.mode === 'navigate' ? await cache.match('./index.html') : null) ||
          Response.error();
      }
    }
    const existente = await salvo();
    if (existente) return existente;
    try {
      const resposta = await fetch(req);
      if (resposta.ok) await cache.put(semQuery.href, resposta.clone());
      return resposta;
    } catch (_) { return Response.error(); }
  })());
});