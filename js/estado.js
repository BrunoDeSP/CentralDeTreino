import { armazenamento } from './armazenamento/index.js';

// Estado completo do app. Formato salvo:
// {
//   versao: 1,
//   cicloAtivoId: 'ciclo_...' | null,
//   ciclos: [ { id, status, inicio, fim, diasPorSemana, semanas, local, treinos, proximo, sessoes } ]
// }

const VERSAO = 1;
let estado = null;

export function estadoVazio() {
  return { versao: VERSAO, cicloAtivoId: null, ciclos: [] };
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

// Quando o formato salvo mudar, as conversões entram aqui.
function migrar(salvo) {
  if (!salvo || typeof salvo !== 'object' || !Array.isArray(salvo.ciclos)) return null;
  if (salvo.versao === VERSAO) return salvo;
  return null;
}
