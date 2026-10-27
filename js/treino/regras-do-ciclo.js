import { montarTreinos } from './gerador.js';
import { CONFIG } from '../config.js';
import { hojeISO, somarDias, diferencaDias } from '../util/datas.js';

// Regras do ciclo de treino.
//
// Um ciclo dura algumas semanas e mantém os mesmos exercícios do começo ao fim.
// Os treinos funcionam como uma fila: o próximo é sempre o seguinte ao último
// que ela concluiu, sem ficar preso a um dia da semana. As semanas contam a
// partir do dia em que o ciclo começou (semana 1 = 7 primeiros dias).

export function novoId(prefixo) {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function cicloAtivo(estado) {
  return estado.ciclos.find((ciclo) => ciclo.id === estado.cicloAtivoId) ?? null;
}

export function ciclosEncerrados(estado) {
  return estado.ciclos.filter((ciclo) => ciclo.status === 'encerrado');
}

export function criarCiclo(estado, { diasPorSemana, semanas, local = CONFIG.localPadrao, inicio = hojeISO() }) {
  // Mudança definitiva de dias = encerra o ciclo atual e começa outro.
  if (cicloAtivo(estado)) encerrarCiclo(estado, inicio);

  const ciclo = {
    id: novoId('ciclo'),
    status: 'ativo',
    inicio,
    fim: null,
    diasPorSemana,
    semanas,
    local,
    treinos: montarTreinos({ diasPorSemana, local }),
    proximo: 0, // posição do próximo treino na fila
    sessoes: [], // treinos concluídos: { id, treinoId, data, proximoAntes }
  };

  estado.ciclos.push(ciclo);
  estado.cicloAtivoId = ciclo.id;
  return ciclo;
}

export function encerrarCiclo(estado, data = hojeISO()) {
  const ciclo = cicloAtivo(estado);
  if (!ciclo) return null;
  ciclo.status = 'encerrado';
  ciclo.fim = data;
  estado.cicloAtivoId = null;
  return ciclo;
}

export function buscarTreino(ciclo, treinoId) {
  return ciclo.treinos.find((treino) => treino.id === treinoId) ?? null;
}

export function proximoTreino(ciclo) {
  return ciclo.treinos[ciclo.proximo % ciclo.treinos.length];
}

// Registra um treino feito. Se ela fizer um treino fora da ordem, a fila
// continua a partir dele.
export function concluirTreino(ciclo, treinoId, data = hojeISO()) {
  const posicao = ciclo.treinos.findIndex((treino) => treino.id === treinoId);
  if (posicao === -1) throw new Error(`O ${treinoId} não faz parte deste ciclo.`);

  const sessao = { id: novoId('sessao'), treinoId, data, proximoAntes: ciclo.proximo };
  ciclo.sessoes.push(sessao);
  ciclo.proximo = (posicao + 1) % ciclo.treinos.length;
  return sessao;
}

export function desfazerSessao(ciclo, sessaoId) {
  const posicao = ciclo.sessoes.findIndex((sessao) => sessao.id === sessaoId);
  if (posicao === -1) return false;
  const [sessao] = ciclo.sessoes.splice(posicao, 1);
  // Só devolve a fila se era a sessão mais recente.
  if (posicao === ciclo.sessoes.length) ciclo.proximo = sessao.proximoAntes;
  return true;
}

export function semanaDoCiclo(ciclo, data = hojeISO()) {
  const dias = Math.max(0, diferencaDias(ciclo.inicio, data));
  const numero = Math.floor(dias / 7) + 1;
  const inicio = somarDias(ciclo.inicio, (numero - 1) * 7);
  return { numero, inicio, fim: somarDias(inicio, 6) };
}

export function fimPrevisto(ciclo) {
  return somarDias(ciclo.inicio, ciclo.semanas * 7 - 1);
}

export function cicloConcluido(ciclo, data = hojeISO()) {
  return semanaDoCiclo(ciclo, data).numero > ciclo.semanas;
}

// Como está a semana atual: o que já foi feito e o que vem pela fila até
// completar a meta de dias.
export function resumoDaSemana(ciclo, data = hojeISO()) {
  const semana = semanaDoCiclo(ciclo, data);
  const feitas = ciclo.sessoes.filter((sessao) => sessao.data >= semana.inicio && sessao.data <= semana.fim);
  const meta = ciclo.diasPorSemana;

  const plano = feitas.map((sessao) => ({ treinoId: sessao.treinoId, status: 'feito', sessaoId: sessao.id }));
  for (let passo = 0; plano.length < meta; passo++) {
    const treino = ciclo.treinos[(ciclo.proximo + passo) % ciclo.treinos.length];
    plano.push({ treinoId: treino.id, status: passo === 0 ? 'proximo' : 'depois' });
  }

  return { semana, feitos: feitas.length, meta, plano, completa: feitas.length >= meta };
}
