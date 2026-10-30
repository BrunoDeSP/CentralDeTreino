import { buscarExercicio } from '../dados/exercicios.js';
import { REGIOES, regiaoDoExercicio, buscarCardio } from '../dados/regioes.js';
import { buscarFase } from '../dados/modelos.js';
import { buscarTreino, nomeDoTreino, constancia, fimPrevisto } from '../treino/regras-do-ciclo.js';
import { textoDaMeta } from '../habitos/regras-dos-habitos.js';
import { numero } from '../util/texto.js';

// Abas da planilha para ver os dados no computador. O app monta as linhas e o
// Apps Script só copia. Elas não voltam para o app: ele restaura pela aba
// Backup, e o que for mudado aqui some no envio seguinte. Datas vão como
// AAAA-MM-DD, que a planilha entende como data. O mais recente fica em cima.

const PROXIMA_VEZ = {
  subir: 'Sobe a carga',
  dificultar: 'Dá para dificultar',
  manter: 'Mantém',
  segurar: 'Segura a carga',
  baixar: 'Baixa uns 10%',
  joelho: 'Volta mais leve (joelho)',
};

export function montarTabelas(estado) {
  const sessoes = sessoesRecentesPrimeiro(estado);
  return {
    Treinos: [
      ['Data', 'Treino', 'Foco', 'Fase', 'Dia a mais', 'Séries', 'Cardio', 'Cardio (min)', 'Nível', 'Tiros'],
      ...sessoes.map(linhaDoTreino),
    ],
    'Séries': [
      ['Data', 'Treino', 'Exercício', 'Série', 'Carga (kg)', 'Feito', 'Unidade', 'Meta', 'Joelho'],
      ...sessoes.flatMap(linhasDeSeries),
    ],
    Cargas: [
      ['Exercício', 'Região', 'Carga atual (kg)', 'Próxima vez', 'Última vez', 'Melhor marca', 'Data da melhor marca'],
      ...linhasDeCargas(estado),
    ],
    'Hábitos': [['Hábito', 'Meta', 'Dia feito'], ...linhasDeHabitos(estado)],
    Ciclos: [
      ['Início', 'Fim', 'Fase', 'Dias por semana', 'Semanas', 'Situação', 'Treinos feitos', 'Dias a mais', 'Constância'],
      ...linhasDeCiclos(estado),
    ],
  };
}

// O que a planilha tem, para comparar com o celular antes de trazer os dados.
export function resumoDosDados(estado) {
  const datas = estado.ciclos.flatMap((ciclo) => ciclo.sessoes.map((sessao) => sessao.data)).sort();
  return { treinos: datas.length, ultimoTreino: datas.at(-1) ?? null, ciclos: estado.ciclos.length, habitos: estado.habitos.length };
}

function sessoesRecentesPrimeiro(estado) {
  return estado.ciclos
    .flatMap((ciclo, c) => ciclo.sessoes.map((sessao, s) => ({ ciclo, sessao, ordem: c * 100000 + s, treino: buscarTreino(ciclo, sessao.treinoId) })))
    .sort((a, b) => b.sessao.data.localeCompare(a.sessao.data) || b.ordem - a.ordem);
}

function nomeDaFase(ciclo) {
  return ciclo.fase ? buscarFase(ciclo.fase).nome : '';
}

function linhaDoTreino({ ciclo, sessao, treino }) {
  // "Já fiz, só marcar como feito" não registra séries.
  const series = sessao.series ? sessao.series.reduce((total, item) => total + item.series.length, 0) : 'Só marcado';
  const cardio = sessao.cardio;
  return [
    sessao.data,
    nomeDoTreino(treino, sessao.treinoId),
    treino?.foco ?? '',
    nomeDaFase(ciclo),
    sessao.extra ? 'Sim' : '',
    series,
    cardio ? buscarCardio(cardio.tipo)?.nome ?? cardio.tipo : '',
    cardio?.minutos ?? '',
    cardio?.nivel ?? '',
    cardio?.tiros ?? '',
  ];
}

function linhasDeSeries({ sessao, treino }) {
  const nome = nomeDoTreino(treino, sessao.treinoId);
  return (sessao.series ?? []).flatMap((item) => {
    const exercicio = buscarExercicio(item.exercicioId);
    const alvo = item.alvo;
    const meta = !alvo ? '' : alvo.min === alvo.max ? alvo.min : `${alvo.min} a ${alvo.max}`;
    const unidade = alvo?.medida === 'segundos' ? 's' : 'reps';
    return item.series.map((serie, indice) => [
      sessao.data,
      nome,
      exercicio?.nome ?? item.exercicioId,
      indice + 1,
      Number.isFinite(serie.carga) ? serie.carga : '',
      serie.reps ?? '',
      unidade,
      meta,
      item.joelho ? 'Incomodou' : '',
    ]);
  });
}

function linhasDeCargas(estado) {
  return Object.entries(estado.progressao ?? {})
    .map(([id, registro]) => ({ id, registro, exercicio: buscarExercicio(id) }))
    .sort((a, b) => (a.exercicio?.nome ?? a.id).localeCompare(b.exercicio?.nome ?? b.id, 'pt-BR'))
    .map(({ id, registro, exercicio }) => {
      const recorde = registro.recorde;
      const unidade = registro.ultima?.alvo?.medida === 'segundos' ? 's' : 'reps';
      const marca = !recorde ? '' : Number.isFinite(recorde.carga) ? `${numero(recorde.carga)} kg × ${recorde.reps}` : `${recorde.reps} ${unidade}`;
      return [
        exercicio?.nome ?? id,
        REGIOES.find((regiao) => regiao.id === regiaoDoExercicio(exercicio))?.nome ?? '',
        Number.isFinite(registro.carga) ? registro.carga : '',
        PROXIMA_VEZ[registro.decisao] ?? '',
        registro.ultima?.data ?? '',
        marca,
        recorde?.data ?? '',
      ];
    });
}

function linhasDeHabitos(estado) {
  return estado.habitos.flatMap((habito) => [...habito.dias].sort().reverse().map((dia) => [habito.nome, textoDaMeta(habito.meta), dia]));
}

function linhasDeCiclos(estado) {
  return [...estado.ciclos].reverse().map((ciclo) => [
    ciclo.inicio,
    ciclo.fim ?? fimPrevisto(ciclo),
    nomeDaFase(ciclo),
    ciclo.diasPorSemana,
    ciclo.semanas,
    ciclo.status === 'ativo' ? 'Atual' : 'Encerrado',
    ciclo.sessoes.length,
    ciclo.sessoes.filter((sessao) => sessao.extra).length,
    `${constancia(ciclo).porcentagem}%`,
  ]);
}
