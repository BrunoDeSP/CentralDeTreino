import { hojeISO, inicioDaSemana, somarDias, diasDoMes, mesDe, diaDaSemana } from '../util/datas.js';
import { novoId } from '../treino/regras-do-ciclo.js';

// Rastreador de hábitos.
//
// Cada hábito tem uma meta de X vezes por semana ou por mês (ela escolhe) e
// a lista dos dias em que foi feito. As semanas começam na segunda-feira.
// O hábito "Treinos" é automático: os dias vêm dos treinos concluídos.
//
// De propósito, não existe contagem de dias seguidos: ela zera na primeira
// falha e desanima em hábitos que não são diários. O app só soma o que foi feito.

export const CORES = [
  { id: 'agua', nome: 'Azul-água' },
  { id: 'violeta', nome: 'Violeta' },
  { id: 'rosa', nome: 'Rosa' },
  { id: 'laranja', nome: 'Laranja' },
  { id: 'verde', nome: 'Verde' },
  { id: 'grafite', nome: 'Grafite' },
];

export const LIMITE_DA_META = { semana: 7, mes: 31 };

export const SUGESTOES = ['Beber 2 L de água', 'Caminhar 30 min', 'Dormir antes das 23h', 'Alongar 10 min'];

export function habitoDosTreinos(estado) {
  const dias = new Set(estado.ciclos.flatMap((ciclo) => ciclo.sessoes.map((sessao) => sessao.data)));
  return { id: 'treinos', nome: 'Treinos', cor: 'tinta', automatico: true, meta: null, dias: [...dias].sort() };
}

export function buscarHabito(estado, id) {
  return estado.habitos.find((habito) => habito.id === id) ?? null;
}

export function criarHabito(estado, { nome, cor, vezes, periodo }) {
  const habito = { id: novoId('habito'), nome, cor, meta: { vezes, periodo }, dias: [], criadoEm: hojeISO() };
  estado.habitos.push(habito);
  return habito;
}

export function editarHabito(habito, { nome, cor, vezes, periodo }) {
  habito.nome = nome;
  habito.cor = cor;
  habito.meta = { vezes, periodo };
  return habito;
}

export function excluirHabito(estado, id) {
  estado.habitos = estado.habitos.filter((habito) => habito.id !== id);
}

// Marca ou desmarca um dia. Devolve true se marcou.
export function alternarDia(habito, data) {
  const posicao = habito.dias.indexOf(data);
  if (posicao >= 0) {
    habito.dias.splice(posicao, 1);
    return false;
  }
  habito.dias.push(data);
  habito.dias.sort();
  return true;
}

// Primeira cor ainda não usada por outro hábito.
export function corLivre(estado) {
  const usadas = new Set(estado.habitos.map((habito) => habito.cor));
  return (CORES.find((cor) => !usadas.has(cor.id)) ?? CORES[estado.habitos.length % CORES.length]).id;
}

// "3 vezes por semana", "1 vez por mês"
export function textoDaMeta({ vezes, periodo }) {
  return `${vezes} ${vezes === 1 ? 'vez' : 'vezes'} por ${periodo === 'semana' ? 'semana' : 'mês'}`;
}

function contarEntre(dias, inicio, fim) {
  return dias.reduce((total, dia) => total + (dia >= inicio && dia <= fim ? 1 : 0), 0);
}

// Quanto ela já fez no período atual da meta (esta semana ou este mês).
export function progressoAtual(habito, hoje = hojeISO()) {
  const { vezes, periodo } = habito.meta;
  let inicio;
  let fim;
  if (periodo === 'semana') {
    inicio = inicioDaSemana(hoje);
    fim = somarDias(inicio, 6);
  } else {
    const dias = diasDoMes(mesDe(hoje));
    inicio = dias[0];
    fim = dias.at(-1);
  }
  return { feitas: contarEntre(habito.dias, inicio, fim), meta: vezes, periodo };
}

// Resumo do mês, só com o que foi feito: total de vezes, semanas que
// começaram no mês e bateram a meta, e se a meta do mês foi batida.
export function resumoDoMes(habito, mes) {
  const dias = diasDoMes(mes);
  const total = contarEntre(habito.dias, dias[0], dias.at(-1));
  let semanasComMeta = 0;
  if (habito.meta?.periodo === 'semana') {
    for (const segunda of dias.filter((dia) => diaDaSemana(dia) === 0)) {
      if (contarEntre(habito.dias, segunda, somarDias(segunda, 6)) >= habito.meta.vezes) semanasComMeta++;
    }
  }
  const metaDoMes = habito.meta?.periodo === 'mes' && total >= habito.meta.vezes;
  return { total, semanasComMeta, metaDoMes };
}
