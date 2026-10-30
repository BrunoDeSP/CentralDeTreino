import { montarTreinos, montarExtra } from './gerador.js';
import { CONFIG } from '../config.js';
import { FASES, PROXIMA_FASE, OPCOES, DIAS_A_MAIS, MAXIMO_DE_TREINOS_NA_SEMANA, buscarFase } from '../dados/modelos.js';
import { hojeISO, somarDias, diferencaDias } from '../util/datas.js';

// Regras do ciclo de treino.
//
// Um ciclo dura algumas semanas e mantém os mesmos exercícios do começo ao fim.
// Os treinos funcionam como uma fila: o próximo é sempre o seguinte ao último
// que ela concluiu, sem ficar preso a um dia da semana. As semanas contam a
// partir do dia em que o ciclo começou (semana 1 = 7 primeiros dias).
//
// Dias a mais: quando ela já fez os treinos da semana, o botão "Adicionar
// treino" acrescenta o próximo de uma ordem fixa (DIAS_A_MAIS, em
// modelos.js). O treino adicionado fica em ciclo.extras, vale só para aquela
// semana do ciclo, não mexe na fila e conta na constância como planejado e
// feito. Se ela adicionar e não fizer, ele some quando a semana vira.

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
    sessoes: [], // treinos concluídos: { id, treinoId, data, proximoAntes, extra? }
    extras: [], // dias a mais: treinos com extra: { semana, posicao, grupo, origem }
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
  return ciclo.treinos.find((treino) => treino.id === treinoId) ?? treinoAdicionado(ciclo, treinoId);
}

export function treinoAdicionado(ciclo, treinoId) {
  return (ciclo.extras ?? []).find((treino) => treino.id === treinoId) ?? null;
}

// Letra da anilha e nome do treino. Os dias a mais têm id próprio, por isso a
// tela usa estes campos. Ciclos antigos não têm letra nem nome: vale o id.
export function letraDoTreino(treino, treinoId = treino?.id) {
  return treino?.letra ?? treinoId;
}

export function nomeDoTreino(treino, treinoId = treino?.id) {
  return treino?.nome ?? `Treino ${treinoId}`;
}

export function proximoTreino(ciclo) {
  return ciclo.treinos[ciclo.proximo % ciclo.treinos.length];
}

// Registra um treino feito. Se ela fizer um treino fora da ordem, a fila
// continua a partir dele. Um dia a mais não mexe na fila.
export function concluirTreino(ciclo, treinoId, data = hojeISO()) {
  const adicionado = treinoAdicionado(ciclo, treinoId);
  const posicao = ciclo.treinos.findIndex((treino) => treino.id === treinoId);
  if (!adicionado && posicao === -1) throw new Error(`O ${treinoId} não faz parte deste ciclo.`);

  const sessao = { id: novoId('sessao'), treinoId, data, proximoAntes: ciclo.proximo, ...(adicionado ? { extra: true } : {}) };
  ciclo.sessoes.push(sessao);
  if (!adicionado) ciclo.proximo = (posicao + 1) % ciclo.treinos.length;
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

// Como está a semana atual do ciclo:
// - completa: ela já fez os treinos da semana (os dias a mais não contam aqui);
// - pendente: dia a mais que ela adicionou e ainda não fez;
// - podeAdicionar / proximoAdicional: o que o botão "Adicionar treino" traz;
// - cheia: chegou ao 6º treino ou ao fim da ordem; o 7º dia é descanso.
export function resumoDaSemana(ciclo, data = hojeISO()) {
  const semana = semanaDoCiclo(ciclo, data);
  const feitas = ciclo.sessoes.filter((sessao) => sessao.data >= semana.inicio && sessao.data <= semana.fim);
  const meta = ciclo.diasPorSemana;
  const doPlano = feitas.filter((sessao) => !sessao.extra).length;
  const feitosIds = new Set(feitas.map((sessao) => sessao.treinoId));
  const adicionados = (ciclo.extras ?? []).filter((treino) => treino.extra?.semana === semana.numero);
  const pendente = adicionados.find((treino) => !feitosIds.has(treino.id)) ?? null;
  const completa = doPlano >= meta;
  const cheia = feitas.length >= MAXIMO_DE_TREINOS_NA_SEMANA || adicionados.length >= (DIAS_A_MAIS[meta] ?? []).length;
  const podeAdicionar = completa && !pendente && !cheia;

  return {
    semana,
    meta,
    feitos: feitas.length,
    doPlano,
    alemDaMeta: Math.max(0, feitas.length - meta),
    adicionados,
    pendente,
    completa,
    cheia,
    podeAdicionar,
    proximoAdicional: podeAdicionar ? proximoAdicional(ciclo, semana.numero, adicionados) : null,
  };
}

// O próximo treino da ordem dos dias a mais, já montado.
function proximoAdicional(ciclo, semana, adicionados) {
  const posicao = adicionados.length;
  const item = (DIAS_A_MAIS[ciclo.diasPorSemana] ?? [])[posicao];
  if (!item) return null;
  const feitos = new Set(ciclo.sessoes.map((sessao) => sessao.treinoId));
  const vezesDoGrupo = (ciclo.extras ?? []).filter((treino) => treino.extra?.grupo === item.id && feitos.has(treino.id)).length;
  const intervaladoLivre = !OPCOES[ciclo.diasPorSemana]?.intervalado
    && !adicionados.some((treino) => treino.cardio?.intervalado && treino.cardio.chave === 'fim');
  return montarExtra({
    id: novoId('extra'),
    diasPorSemana: ciclo.diasPorSemana,
    fase: ciclo.fase ?? 'construcao',
    posicao,
    semana,
    vezesDoGrupo,
    intervaladoLivre,
  });
}

// Botão "Adicionar treino": põe o próximo da ordem na semana atual.
export function adicionarTreino(ciclo, data = hojeISO()) {
  const { podeAdicionar, proximoAdicional: treino } = resumoDaSemana(ciclo, data);
  if (!podeAdicionar || !treino) throw new Error('Não dá para adicionar treino nesta semana.');
  ciclo.extras ??= [];
  ciclo.extras.push(treino);
  return treino;
}

// "Desfazer" logo depois de adicionar. Só tira o dia se ele ainda não foi feito.
export function removerTreinoAdicionado(ciclo, treinoId) {
  if (!treinoAdicionado(ciclo, treinoId)) return false;
  if (ciclo.sessoes.some((sessao) => sessao.treinoId === treinoId)) return false;
  ciclo.extras = ciclo.extras.filter((treino) => treino.id !== treinoId);
  return true;
}

// --- Fases e constância --------------------------------------------------------

// Treinos feitos ÷ planejados, contando só as semanas que já passaram. Cada
// dia a mais feito conta nos dois: uma semana de 3 dias com 1 a mais dá 4 de 4.
export function constancia(ciclo, data = hojeISO()) {
  const ate = ciclo.fim ?? data;
  const semanas = Math.max(1, Math.min(ciclo.semanas, semanaDoCiclo(ciclo, ate).numero));
  const doPlano = ciclo.diasPorSemana * semanas;
  const aMais = ciclo.sessoes.filter((sessao) => sessao.extra && (treinoAdicionado(ciclo, sessao.treinoId)?.extra?.semana ?? 0) <= semanas).length;
  const dosTreinos = ciclo.sessoes.filter((sessao) => !sessao.extra).length;
  const planejados = doPlano + aMais;
  const feitos = Math.min(dosTreinos, doPlano) + aMais;
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
