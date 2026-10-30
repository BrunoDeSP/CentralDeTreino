import { montarTreinos } from './gerador.js';
import { CONFIG } from '../config.js';
import { FASES, PROXIMA_FASE, buscarFase } from '../dados/modelos.js';
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

export function criarCiclo(estado, { diasPorSemana, semanas, fase = 'construcao', local = CONFIG.localPadrao, inicio = hojeISO() }) {
  // Mudança definitiva de dias = encerra o ciclo atual e começa outro.
  if (cicloAtivo(estado)) encerrarCiclo(estado, inicio);

  const ciclo = {
    id: novoId('ciclo'),
    status: 'ativo',
    inicio,
    fim: null,
    diasPorSemana,
    semanas,
    fase,
    local,
    treinos: montarTreinos({ diasPorSemana, fase }),
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

// --- Fases e constância --------------------------------------------------------

// Treinos feitos ÷ planejados, contando só as semanas que já passaram.
export function constancia(ciclo, data = hojeISO()) {
  const ate = ciclo.fim ?? data;
  const semanas = Math.min(ciclo.semanas, semanaDoCiclo(ciclo, ate).numero);
  const planejados = ciclo.diasPorSemana * Math.max(1, semanas);
  const feitos = Math.min(ciclo.sessoes.length, planejados);
  return { feitos, planejados, porcentagem: Math.round((feitos / planejados) * 100) };
}

function ultimoCiclo(estado) {
  return cicloAtivo(estado) ?? [...estado.ciclos].reverse().find((ciclo) => ciclo.status === 'encerrado') ?? null;
}

function ultimoTreino(estado) {
  return estado.ciclos.flatMap((ciclo) => ciclo.sessoes.map((sessao) => sessao.data)).sort().at(-1) ?? null;
}

// Sugestão da tela de novo ciclo, pela regra do PDF: com 80% ou mais dos
// treinos feitos, a próxima fase; abaixo disso, repete a fase por 2 semanas.
// Ela pode escolher outra.
export function sugerirProximoCiclo(estado, data = hojeISO()) {
  const anterior = ultimoCiclo(estado);
  const lembretes = [];
  const sugestao = (fase, semanas, motivo) => ({ fase, semanas, motivo, lembretes, dias: anterior?.diasPorSemana ?? null });

  if (!anterior?.fase) {
    return sugestao('adaptacao', buscarFase('adaptacao').semanas, 'Primeiro ciclo do plano: começa pela Adaptação.');
  }
  const ultimo = ultimoTreino(estado);
  if (ultimo && diferencaDias(ultimo, data) > 14) {
    return sugestao('adaptacao', 2, 'Mais de 2 semanas sem treinar: 2 semanas de Adaptação para voltar aos poucos.');
  }
  const ate = anterior.status === 'ativo' ? data : anterior.fim;
  const completo = semanaDoCiclo(anterior, ate).numero > anterior.semanas;
  if (!completo) {
    const faltam = Math.max(1, anterior.semanas - semanaDoCiclo(anterior, ate).numero + 1);
    return sugestao(anterior.fase, Math.min(faltam, buscarFase(anterior.fase).semanas), `O ciclo atual ainda não terminou: continua na ${buscarFase(anterior.fase).nome}.`);
  }
  const { feitos, planejados, porcentagem } = constancia(anterior, ate);
  const placar = `${feitos} de ${planejados} treinos (${porcentagem}%) no ciclo anterior`;
  if (porcentagem < 80) {
    return sugestao(anterior.fase, 2, `${placar}: o plano repete a ${buscarFase(anterior.fase).nome} por mais 2 semanas.`);
  }
  const fase = PROXIMA_FASE[anterior.fase];
  if (fase === 'construcao' && anterior.fase === 'adaptacao') lembretes.push('Hora do check-up médico, se ainda não fez: ele libera o intervalado.');
  if (fase === 'consolidacao') {
    lembretes.push('Hora da bioimpedância da semana 8.');
    if (anterior.diasPorSemana < 4) lembretes.push('O plano sugere passar para 4 dias por semana.');
  }
  if (anterior.fase === 'leve') lembretes.push('Hora da bioimpedância antes da nova rodada.');
  return sugestao(fase, buscarFase(fase).semanas, `${placar}: pode avançar para a ${buscarFase(fase).nome}.`);
}

export { FASES };
