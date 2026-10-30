import { armazenamento } from './armazenamento/index.js';
import { CONFIGURACOES_PADRAO } from './config.js';
import { hojeISO } from './util/datas.js';

// Estado completo do app. Formato salvo (versão 5):
// {
//   versao: 5,
//   revisao: 0,   // sobe a cada alteração; a cópia na planilha compara por ele
//   cicloAtivoId: 'ciclo_...' | null,
//   ciclos: [ { id, status, inicio, fim, diasPorSemana, semanas, fase, local, treinos, proximo, sessoes, extras } ],
//            (extras = dias a mais adicionados na semana; sessões deles têm extra: true)
//   progressao: { [exercicioId]: { carga, decisao, abaixoSeguidas, ultima, recorde } },
//   progressaoCardio: { fim|core|longo: { sugerido, subiuEm }, intervalado: { tiros } },
//   habitos: [ { id, nome, cor, meta: { vezes, periodo }, dias, criadoEm } ],
//   habitoTreinos: { meta: { vezes, periodo } },   // os dias vêm dos treinos concluídos
//   configuracoes: { pausaSegundos, pausaAutomatica, alertaFimDaPausa, telaLigada, checkupFeito },
//   sessaoEmAndamento: null | { cicloId, treinoId, data, iniciadaEm, circuito, itens, pausa }
// }

const VERSAO = 5;
const META_PADRAO_DOS_TREINOS = { vezes: 3, periodo: 'semana' };
let estado = null;
const ouvintes = []; // avisados depois de cada alteração salva (ex.: cópia na planilha)

export function estadoVazio() {
  return {
    versao: VERSAO,
    revisao: 0,
    cicloAtivoId: null,
    ciclos: [],
    progressao: {},
    progressaoCardio: {},
    habitos: [],
    habitoTreinos: { meta: { ...META_PADRAO_DOS_TREINOS } },
    configuracoes: { ...CONFIGURACOES_PADRAO },
    sessaoEmAndamento: null,
  };
}

export async function carregarEstado() {
  const salvo = await armazenamento.carregar();
  estado = migrar(salvo) ?? estadoVazio();
  return estado;
}

export function lerEstado() {
  return estado;
}

// Aplica uma alteração e salva. Devolve o que a alteração devolver.
export async function alterarEstado(alteracao) {
  const resultado = alteracao(estado);
  estado.revisao = (estado.revisao ?? 0) + 1;
  const salvou = await armazenamento.salvar(estado);
  if (!salvou) throw new Error('Falha ao salvar.');
  for (const ouvinte of ouvintes) {
    try {
      ouvinte(estado);
    } catch (erro) {
      console.error(erro); // o que foi salvo continua salvo
    }
  }
  return resultado;
}

export function aoSalvar(ouvinte) {
  ouvintes.push(ouvinte);
}

// Troca todos os dados deste celular pelos que vieram da planilha.
// Converte versões antigas; devolve false se os dados não forem do app.
export async function substituirEstado(dados) {
  const novo = migrar(dados);
  if (!novo) return false;
  const salvou = await armazenamento.salvar(novo);
  if (!salvou) return false;
  estado = novo;
  return true;
}

// Existe algo que valha guardar? (Um app recém-instalado não tem.)
export function temDados(alvo = estado) {
  return Boolean(alvo && (alvo.ciclos?.length || alvo.habitos?.length || Object.keys(alvo.progressao ?? {}).length));
}

export async function apagarTudo() {
  await armazenamento.apagar();
  estado = estadoVazio();
}

// Converte dados salvos por versões antigas do app, sem perder nada.
function migrar(salvo) {
  if (!salvo || typeof salvo !== 'object' || !Array.isArray(salvo.ciclos)) return null;
  const migrado = { ...salvo };

  // 1 → 2: progressão de carga, configurações e treino em andamento.
  if (migrado.versao === 1) migrado.versao = 2;
  // 2 → 3: hábitos.
  if (migrado.versao === 2) migrado.versao = 3;
  // 3 → 4: meta própria do hábito Treinos.
  if (migrado.versao === 3) migrado.versao = 4;
  // 4 → 5: plano oficial com fases. O ciclo de teste (sem fase) é encerrado;
  // o histórico e as cargas continuam salvos.
  if (migrado.versao === 4) {
    migrado.ciclos = migrado.ciclos.map((ciclo) =>
      ciclo.status === 'ativo' && !ciclo.fase ? { ...ciclo, status: 'encerrado', fim: hojeISO() } : ciclo,
    );
    if (!migrado.ciclos.some((ciclo) => ciclo.id === migrado.cicloAtivoId && ciclo.status === 'ativo')) migrado.cicloAtivoId = null;
    migrado.versao = 5;
  }
  if (migrado.versao !== VERSAO) return null;

  // Dias a mais na semana: ciclos salvos antes disso começam sem nenhum.
  migrado.ciclos = migrado.ciclos.map((ciclo) => (Array.isArray(ciclo.extras) ? ciclo : { ...ciclo, extras: [] }));
  migrado.revisao = Number.isFinite(migrado.revisao) ? migrado.revisao : 0;
  migrado.progressao ??= {};
  migrado.progressaoCardio ??= {};
  migrado.habitos ??= [];
  migrado.habitoTreinos ??= { meta: { ...META_PADRAO_DOS_TREINOS } };
  migrado.configuracoes = { ...CONFIGURACOES_PADRAO, ...migrado.configuracoes };
  migrado.sessaoEmAndamento ??= null;
  return migrado;
}
