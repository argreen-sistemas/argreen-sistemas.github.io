// Service Worker do Relatório de Atendimento — permite abrir o app e usar as
// funções que não dependem de rede (preencher, tirar foto, gerar PDF) mesmo
// sem internet, depois da primeira visita com sinal.
const CACHE_NAME = 'relatorio-atendimento-v2';
const ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('Falha ao preparar cache offline:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Só cuida de pedidos GET. Chamadas pro Supabase (dados da equipe) e pro R2/
// Worker (fotos) sempre precisam de rede de verdade e de CORS intacto — o
// service worker não deve interceptar essas, só os arquivos do próprio app.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('supabase.co') || url.includes('.r2.dev') || url.includes('.workers.dev')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchAndUpdate = fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});
