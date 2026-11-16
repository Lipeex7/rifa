
// Atualize o nome do cache quando publicar mudanças.
const CACHE = 'rifa-sobrepeliz-gotica-v9-sorteio';

const PAGINAS = [
  './',
  './index.html',
  './compradores.html',
  './divulgacao.html',
  './sorteio.html',
  './manifest.webmanifest'
];

const IMAGENS = [
  './cabecalho-gotico.webp',
  './cruz-comprado.webp',
  './rodape-gotico.webp',
  './qr-pix.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    await cache.addAll(PAGINAS);

    // Uma imagem ausente não impede a instalação.
    await Promise.allSettled(
      IMAGENS.map(arquivo => cache.add(arquivo))
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();

    await Promise.all(
      nomes
        .filter(
          nome =>
            nome.startsWith('rifa-sobrepeliz-') &&
            nome !== CACHE
        )
        .map(nome => caches.delete(nome))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', evento => {
  const req = evento.request;

  if (
    req.method !== 'GET' ||
    new URL(req.url).origin !== self.location.origin
  ) {
    return;
  }

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // Para páginas, tenta a versão mais recente.
    if (req.mode === 'navigate') {
      try {
        const resposta = await fetch(req);

        if (resposta.ok) {
          await cache.put(
            req,
            resposta.clone()
          );
        }

        return resposta;

      } catch(e) {
        return (
          await cache.match(req) ||
          await cache.match('./index.html') ||
          Response.error()
        );
      }
    }

    // Para imagens e outros arquivos, usa o cache.
    const salvo = await cache.match(req);

    if (salvo) return salvo;

    try {
      const resposta = await fetch(req);

      if (resposta.ok) {
        await cache.put(
          req,
          resposta.clone()
        );
      }

      return resposta;

    } catch(e) {
      return Response.error();
    }
  })());
});
