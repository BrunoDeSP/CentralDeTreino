import { carregarEstado, lerEstado, alterarEstado } from './estado.js';
import { avisar } from './ui/avisos.js';
import * as hoje from './telas/hoje.js';
import * as ciclo from './telas/ciclo.js';
import * as treino from './telas/treino.js';
import * as novoCiclo from './telas/novo-ciclo.js';
import * as sessao from './telas/sessao.js';
import * as configuracoes from './telas/configuracoes.js';
import * as habitos from './telas/habitos.js';
import * as habito from './telas/habito.js';

// Rotas por "#" (ex.: #/treino/B) funcionam no GitHub Pages sem configuração extra.
// A tela inicial continua na rota #/hoje para não quebrar o app já instalado no celular.
const ROTAS = { hoje, ciclo, treino, 'novo-ciclo': novoCiclo, sessao, configuracoes, habitos, habito };

// Aba marcada em cada tela. O treino em andamento esconde as abas.
const ABA_DA_ROTA = {
  hoje: 'hoje',
  ciclo: 'ciclo',
  treino: 'ciclo',
  'novo-ciclo': 'ciclo',
  sessao: null,
  configuracoes: 'configuracoes',
  habitos: 'habitos',
  habito: 'habitos',
};

const conteudo = document.getElementById('conteudo');
let telaAtual = null;
let extrasPendentes = null;
const pilha = []; // hashes visitados, para o botão "Voltar"

function lerRota() {
  const [nome, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return ROTAS[nome] ? { nome, params } : { nome: 'hoje', params: [] };
}

function contexto(extras = {}) {
  return { estado: lerEstado(), extras, alterar: alterarEstado, render: renderizar, ir };
}

function renderizar(extras = null) {
  const { nome, params } = lerRota();
  const tela = ROTAS[nome];
  const trocouDeTela = telaAtual !== tela;
  if (telaAtual && trocouDeTela) telaAtual.aoSair?.();
  telaAtual = tela;

  const extrasDaVez = extras ?? extrasPendentes ?? {};
  extrasPendentes = null;
  const foco = document.activeElement?.dataset?.foco;

  conteudo.innerHTML = String(tela.render(params, contexto(extrasDaVez)));
  document.title = `${tela.titulo} | Central de Treino`;
  document.body.classList.toggle('em-treino', nome === 'sessao');
  marcarAba(ABA_DA_ROTA[nome]);

  // Devolve o foco ao mesmo botão depois de redesenhar (ex.: botões + e −).
  if (foco && !trocouDeTela) {
    conteudo.querySelector(`[data-foco="${CSS.escape(foco)}"]`)?.focus({ preventScroll: true });
  }
  if (trocouDeTela) tela.aoEntrar?.(contexto());
  tela.depoisDeRenderizar?.(extrasDaVez);
}

// Navega para uma rota levando dados extras (ex.: qual anilha animar).
function ir(hash, extras = null) {
  if (location.hash === hash) {
    renderizar(extras);
    rolarParaOTopo();
    return;
  }
  extrasPendentes = extras;
  location.hash = hash;
}

function voltar(alternativa) {
  if (pilha.length > 1) history.back();
  else ir(alternativa || '#/hoje');
}

function rolarParaOTopo() {
  const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: semAnimacao ? 'auto' : 'smooth' });
}

function marcarAba(aba) {
  document.querySelectorAll('.abas a').forEach((link) => {
    if (link.dataset.aba === aba) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// Cliques em elementos com data-acao="..." chamam a ação da tela atual.
conteudo.addEventListener('click', async (evento) => {
  const alvo = evento.target.closest('[data-acao]');
  if (!alvo) return;

  if (alvo.dataset.acao === 'voltar') {
    evento.preventDefault();
    voltar(alvo.getAttribute('href'));
    return;
  }

  const acao = telaAtual?.acoes?.[alvo.dataset.acao];
  if (!acao) return;
  evento.preventDefault();

  alvo.disabled = true; // evita toque duplo
  try {
    await acao({ ...alvo.dataset }, contexto());
  } catch (erro) {
    console.error(erro);
    avisar('Não deu para salvar. Tente de novo.');
  } finally {
    alvo.disabled = false;
  }
});

conteudo.addEventListener('change', async (evento) => {
  if (!telaAtual?.aoMudar) return;
  try {
    await telaAtual.aoMudar(evento, contexto());
  } catch (erro) {
    console.error(erro);
    avisar('Não deu para salvar. Tente de novo.');
  }
});

conteudo.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!telaAtual?.aoEnviar) return;
  try {
    await telaAtual.aoEnviar(new FormData(evento.target), contexto());
  } catch (erro) {
    console.error(erro);
    avisar('Não deu para salvar. Tente de novo.');
  }
});

window.addEventListener('hashchange', () => {
  const atual = location.hash;
  if (pilha.length > 1 && pilha.at(-2) === atual) pilha.pop();
  else pilha.push(atual);

  renderizar();
  window.scrollTo(0, 0);
  conteudo.focus({ preventScroll: true });
});

async function iniciar() {
  const [nome] = location.hash.replace(/^#\/?/, '').split('/');
  if (!ROTAS[nome]) history.replaceState(null, '', '#/hoje');
  pilha.push(location.hash);
  await carregarEstado();
  renderizar();
}

iniciar();

// Funciona offline depois da primeira visita e permite instalar na tela inicial.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((erro) => console.warn('Service worker não registrado.', erro));
  });
}
