import { armazenamento } from './armazenamento/index.js';
import { CONFIGURACOES_PADRAO } from './config.js';

// Estado completo do app. Formato salvo (versão 4):
// {
//   versao: 4,
//   cicloAtivoId: 'ciclo_...' | null,
//   ciclos: [ { id, status, inicio, fim, diasPorSemana, semanas, local, treinos, proximo, sessoes } ],
//   progressao: { [exercicioId]: { carga, decisao, semEvoluir, ultima, recorde } },
//   habitos: [ { id, nome, cor, meta: { vezes, periodo }, dias, criadoEm } ],
//   habitoTreinos: { meta: { vezes, periodo } },   // os dias vêm dos treinos concluídos
//   configuracoes: { pausaSegundos, pausaAutomatica, alertaFimDaPausa, telaLigada },
//   sessaoEmAndamento: null | { cicloId, treinoId, data, iniciadaEm, circuito, itens, pausa }
// }

const VERSAO = 4;
const META_PADRAO_DOS_TREINOS = { vezes: 3, periodo: 'semana' };
let estado = null;

export function estadoVazio() {
  return {
    versao: VERSAO,
    cicloAtivoId: null,
    ciclos: [],
    progressao: {},
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
  const salvou = await armazenamento.salvar(estado);
  if (!salvou) throw new Error('Falha ao salvar.');
  return resultado;
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
  if (migrado.versao !== VERSAO) return null;

  migrado.progressao ??= {};
  migrado.habitos ??= [];
  migrado.habitoTreinos ??= { meta: { ...META_PADRAO_DOS_TREINOS } };
  migrado.configuracoes = { ...CONFIGURACOES_PADRAO, ...migrado.configuracoes };
  migrado.sessaoEmAndamento ??= null;
  return migrado;
}
