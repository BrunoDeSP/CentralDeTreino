import { lerEstado, aoSalvar, substituirEstado, temDados } from '../estado.js';
import { chamarPlanilha, ErroDaPlanilha } from './planilha.js';
import { montarTabelas, resumoDosDados } from './tabelas.js';
import { PLANILHA } from '../config.js';

// Cópia dos dados na planilha do Google.
//
// O celular continua sendo o dono dos dados: tudo é salvo nele primeiro, o que
// é rápido e não depende de sinal. A cópia vai para a planilha depois:
// - alguns segundos após a última mudança;
// - durante um treino em andamento, só quando o app sai da tela (para não
//   gastar internet a cada série);
// - sem internet, o app tenta de novo mais tarde e quando a conexão volta.
//
// Só um aparelho salva na planilha. Outro só passa a salvar se assumir de
// propósito (trazendo os dados dela ou trocando a cópia), para um celular de
// teste ou antigo não apagar a cópia boa.
//
// O endereço e a chave ficam só neste aparelho (fora dos dados e do GitHub).

const CHAVE_LOCAL = 'central-de-treino-planilha';

let conexao = lerConexao(); // { url, chave, dispositivo, revisaoEnviada, enviadoEm, erro, bloqueada, assumirNoProximo }
let espera = null;
let enviando = null;
let tentativas = 0;
const ouvintes = new Set();

function lerConexao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) ?? {};
  } catch {
    return {};
  }
}

function guardarConexao(novaConexao) {
  conexao = novaConexao;
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(conexao));
  } catch (erro) {
    console.error('Não foi possível guardar a conexão com a planilha.', erro);
  }
  avisarOuvintes();
}

function atualizarConexao(mudancas) {
  guardarConexao({ ...conexao, ...mudancas });
}

function avisarOuvintes() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function novoDispositivo() {
  return `aparelho_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function conectada() {
  return Boolean(conexao.url && conexao.chave);
}

// A tela de Configurações usa para se redesenhar quando o status muda.
export function aoMudarStatus(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function statusDaPlanilha() {
  const estado = lerEstado();
  return {
    conectada: conectada(),
    enviadoEm: conexao.enviadoEm ?? null,
    pendente: temDados(estado) && (estado.revisao ?? 0) > (conexao.revisaoEnviada ?? -1),
    enviando: Boolean(enviando),
    erro: conexao.erro ?? null,
    bloqueada: Boolean(conexao.bloqueada),
  };
}

export function iniciarSincronizacao() {
  aoSalvar(() => agendar());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviarSePreciso({ saindo: true });
  });
  window.addEventListener('online', () => agendar(1000));
  agendar(3000); // ao abrir, manda o que ficou pendente
}

function agendar(ms = PLANILHA.esperaDepoisDeMudar) {
  if (!conectada() || conexao.bloqueada) return;
  clearTimeout(espera);
  espera = setTimeout(() => enviarSePreciso(), ms);
}

async function enviarSePreciso({ saindo = false } = {}) {
  const estado = lerEstado();
  if (!estado || !conectada() || conexao.bloqueada) return;
  if (estado.sessaoEmAndamento && !saindo) return;
  if (!statusDaPlanilha().pendente) return;
  try {
    await enviarAgora();
  } catch {
    // O status já mostra o erro, e a nova tentativa já foi agendada.
  }
}

// Manda a cópia agora. "assumir" = este aparelho passa a ser o da planilha.
export function enviarAgora({ assumir = false } = {}) {
  if (enviando) return enviando;
  clearTimeout(espera);
  enviando = (async () => {
    const estado = lerEstado();
    const revisao = estado.revisao ?? 0;
    try {
      const resposta = await chamarPlanilha(conexao, 'enviar', {
        dispositivo: conexao.dispositivo,
        revisao,
        assumir: assumir || Boolean(conexao.assumirNoProximo),
        dados: JSON.stringify(estado),
        tabelas: montarTabelas(estado),
        resumo: resumoDosDados(estado),
      });
      tentativas = 0;
      atualizarConexao({ revisaoEnviada: revisao, enviadoEm: resposta.enviadoEm ?? new Date().toISOString(), erro: null, bloqueada: false, assumirNoProximo: false });
      if ((lerEstado().revisao ?? 0) > revisao) agendar(); // mudou algo enquanto enviava
      return resposta;
    } catch (erro) {
      const codigo = erro instanceof ErroDaPlanilha ? erro.codigo : 'servidor';
      const bloqueada = codigo === 'outro-aparelho' || codigo === 'chave';
      atualizarConexao({ erro: codigo, bloqueada });
      if (!bloqueada) novaTentativa();
      throw erro instanceof ErroDaPlanilha ? erro : new ErroDaPlanilha('servidor', String(erro?.message ?? erro));
    }
  })().finally(() => {
    enviando = null;
    avisarOuvintes();
  });
  avisarOuvintes();
  return enviando;
}

function novaTentativa() {
  const esperas = PLANILHA.novasTentativas;
  agendar(esperas[Math.min(tentativas, esperas.length - 1)]);
  tentativas += 1;
}

// Testa o endereço e a chave e decide o que fazer. Devolve a situação:
// - 'conectada': a planilha estava vazia (ou já era deste aparelho) e, se
//   havia dados, recebeu a cópia;
// - 'restaurado': este celular estava vazio e recebeu os dados da planilha;
// - 'escolher': os dois lados têm dados; a tela pergunta qual manter.
export async function conectar({ url, chave }) {
  const nova = { url, chave, dispositivo: conexao.dispositivo ?? novoDispositivo() };
  const remoto = await chamarPlanilha(nova, 'status');
  const doMesmoAparelho = remoto.temBackup && remoto.dispositivo === nova.dispositivo;

  if (!remoto.temBackup || doMesmoAparelho) {
    guardarConexao({ ...nova, revisaoEnviada: doMesmoAparelho ? remoto.revisao : -1, enviadoEm: remoto.enviadoEm, erro: null, bloqueada: false });
    if (statusDaPlanilha().pendente) await enviarAgora().catch(() => {});
    return { situacao: 'conectada', remoto };
  }
  if (!temDados(lerEstado())) {
    await restaurar(nova);
    return { situacao: 'restaurado', remoto };
  }
  return { situacao: 'escolher', remoto, nova };
}

// Troca os dados deste celular pelos da planilha, e este aparelho passa a ser o dela.
export async function restaurar(nova = conexao) {
  const resposta = await chamarPlanilha(nova, 'baixar');
  if (!resposta.dados) throw new ErroDaPlanilha('vazia');
  let dados;
  try {
    dados = JSON.parse(resposta.dados);
  } catch {
    throw new ErroDaPlanilha('formato');
  }
  if (!(await substituirEstado(dados))) throw new ErroDaPlanilha('formato');
  // Manda de volta já assumindo a planilha. Se falhar, vai no próximo envio.
  guardarConexao({ ...nova, revisaoEnviada: -1, enviadoEm: resposta.enviadoEm, erro: null, bloqueada: false, assumirNoProximo: true });
  await enviarAgora().catch(() => {});
  return resposta;
}

// Fica com os dados deste celular: a cópia da planilha é trocada por eles.
export async function substituirPlanilha(nova = conexao) {
  guardarConexao({ ...nova, revisaoEnviada: -1, erro: null, bloqueada: false, assumirNoProximo: true });
  return enviarAgora();
}

// Para de mandar a cópia. A planilha continua como está.
// esquecerAparelho: depois de apagar os dados, este celular volta a ser "novo",
// e ao conectar de novo ele traz os dados da planilha em vez de apagá-los.
export function desconectar({ esquecerAparelho = false } = {}) {
  clearTimeout(espera);
  tentativas = 0;
  guardarConexao(esquecerAparelho || !conexao.dispositivo ? {} : { dispositivo: conexao.dispositivo });
}
