// Service worker: deixa o app abrir sem internet (academia com sinal ruim).
//
// Estratégia "rede primeiro": com internet, sempre confere no servidor se há
// versão nova, então basta subir os arquivos para o celular receber a
// atualização. Sem internet, usa a cópia guardada. Ao criar arquivos novos,
// adicione-os em ARQUIVOS para já ficarem disponíveis offline.

const CACHE = 'central-de-treino-v7';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/estilos.css',
  './fontes/archivo-variavel.woff2',
  './icones/icone-192.png',
  './icones/apple-touch-icon.png',
  './js/app.js',
  './js/config.js',
  './js/estado.js',
  './js/armazenamento/index.js',
  './js/armazenamento/local.js',
  './js/dados/exercicios.js',
  './js/dados/modelos.js',
  './js/dados/regioes.js',
  './js/habitos/regras-dos-habitos.js',
  './js/treino/gerador.js',
  './js/treino/historico.js',
  './js/treino/progressao.js',
  './js/treino/regras-do-ciclo.js',
  './js/treino/sessao.js',
  './js/telas/ciclo.js',
  './js/telas/comum.js',
  './js/telas/configuracoes.js',
  './js/telas/exercicio.js',
  './js/telas/exercicios.js',
  './js/telas/habito.js',
  './js/telas/habitos.js',
  './js/telas/hoje.js',
  './js/telas/novo-ciclo.js',
  './js/telas/sessao.js',
  './js/telas/treino.js',
  './js/ui/avisos.js',
  './js/ui/calendario.js',
  './js/ui/componentes.js',
  './js/ui/grafico.js',
  './js/ui/cronometro.js',
  './js/ui/html.js',
  './js/util/datas.js',
  './js/util/texto.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      // Um arquivo que falhar não impede os outros de serem guardados.
      .then((cache) => Promise.allSettled(ARQUIVOS.map((arquivo) => cache.add(arquivo))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(redePrimeiro(pedido));
});

async function redePrimeiro(pedido) {
  const cache = await caches.open(CACHE);
  try {
    // "no-cache" pergunta ao servidor se o arquivo mudou, sem esperar o cache do navegador vencer.
    const resposta = await fetch(pedido.mode === 'navigate' ? pedido.url : pedido, { cache: 'no-cache' });
    if (resposta.ok) cache.put(pedido, resposta.clone());
    return resposta;
  } catch {
    const guardada = await cache.match(pedido, { ignoreSearch: true });
    if (guardada) return guardada;
    if (pedido.mode === 'navigate') return cache.match('./index.html');
    return Response.error();
  }
}
