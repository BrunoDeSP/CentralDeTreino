import { buscarExercicio } from '../dados/exercicios.js';
import { REGIOES, regiaoDoPadrao, buscarCardio } from '../dados/regioes.js';
import { usaCarga } from './progressao.js';
import { kg, numero } from '../util/texto.js';

// Histórico de exercícios, montado a partir dos treinos concluídos de todos
// os ciclos. Por isso vale para qualquer treino e ciclo.

function sessoesEmOrdem(estado) {
  return estado.ciclos
    .flatMap((ciclo) => ciclo.sessoes)
    .filter((sessao) => sessao.series || sessao.cardio)
    .sort((a, b) => a.data.localeCompare(b.data));
}

// exercicioId -> [{ data, series: [{ carga, reps }], alvo }], do mais antigo ao mais recente.
export function historicoDeForca(estado) {
  const porExercicio = new Map();
  for (const sessao of sessoesEmOrdem(estado)) {
    for (const item of sessao.series ?? []) {
      if (!item.series?.length) continue;
      const lista = porExercicio.get(item.exercicioId) ?? [];
      lista.push({ data: sessao.data, series: item.series, alvo: item.alvo });
      porExercicio.set(item.exercicioId, lista);
    }
  }
  return porExercicio;
}

// tipo de cardio -> [{ data, minutos }]
export function historicoDeCardio(estado) {
  const porTipo = new Map();
  for (const sessao of sessoesEmOrdem(estado)) {
    if (!sessao.cardio) continue;
    const lista = porTipo.get(sessao.cardio.tipo) ?? [];
    lista.push({ data: sessao.data, minutos: sessao.cardio.minutos });
    porTipo.set(sessao.cardio.tipo, lista);
  }
  return porTipo;
}

// Tudo o que a página do exercício mostra: carga atual, melhor marca,
// quantas vezes fez com cada carga e a evolução treino a treino.
export function resumoDeForca(exercicioId, registros, progressao = null) {
  const exercicio = buscarExercicio(exercicioId);
  const comCarga = usaCarga(exercicio);
  const medida = registros.at(-1)?.alvo?.medida ?? 'reps';
  const cargas = new Map();
  const evolucao = [];
  let recorde = null;

  for (const { data, series } of registros) {
    const nestaVez = new Set();
    for (const serie of series) {
      const carga = comCarga && Number.isFinite(serie.carga) ? serie.carga : null;
      const entrada = cargas.get(carga) ?? { carga, vezes: 0, series: 0 };
      entrada.series += 1;
      if (!nestaVez.has(carga)) {
        entrada.vezes += 1;
        nestaVez.add(carga);
      }
      cargas.set(carga, entrada);
      const marca = { carga, reps: serie.reps, data };
      if (!recorde || superou(marca, recorde, comCarga)) recorde = marca;
    }
    const comValor = series.filter((serie) => Number.isFinite(serie.carga));
    if (comCarga && comValor.length) evolucao.push({ data, valor: Math.max(...comValor.map((serie) => serie.carga)) });
    if (!comCarga) evolucao.push({ data, valor: Math.max(...series.map((serie) => serie.reps)) });
  }

  const ultimaCarga = evolucao.at(-1)?.valor ?? null;
  return {
    exercicio,
    regiao: regiaoDoPadrao(exercicio?.padrao),
    comCarga,
    medida,
    vezes: registros.length,
    ultima: registros.at(-1),
    cargaAtual: comCarga ? (Number.isFinite(progressao?.carga) ? progressao.carga : ultimaCarga) : null,
    recorde,
    cargas: [...cargas.values()].sort((a, b) => (b.carga ?? -1) - (a.carga ?? -1)),
    evolucao,
    historico: [...registros].reverse(),
  };
}

function superou(a, b, comCarga) {
  if (comCarga && a.carga !== b.carga) return (a.carga ?? -1) > (b.carga ?? -1);
  return a.reps > b.reps;
}

export function resumoDeCardio(tipoId, registros) {
  const duracoes = new Map();
  for (const { minutos } of registros) duracoes.set(minutos, (duracoes.get(minutos) ?? 0) + 1);
  return {
    tipo: buscarCardio(tipoId),
    vezes: registros.length,
    ultima: registros.at(-1),
    totalMinutos: registros.reduce((total, registro) => total + registro.minutos, 0),
    duracoes: [...duracoes].map(([minutos, vezes]) => ({ minutos, vezes })).sort((a, b) => b.minutos - a.minutos),
    evolucao: registros.map(({ data, minutos }) => ({ data, valor: minutos })),
    historico: [...registros].reverse(),
  };
}

// Lista da aba Exercícios: cada região com os exercícios já feitos, em ordem alfabética.
export function exerciciosPorRegiao(estado) {
  const grupos = new Map(REGIOES.map((regiao) => [regiao.id, []]));
  for (const [id, registros] of historicoDeForca(estado)) {
    const resumo = resumoDeForca(id, registros, estado.progressao?.[id]);
    if (!resumo.exercicio || !grupos.has(resumo.regiao)) continue;
    grupos.get(resumo.regiao).push({ id, nome: resumo.exercicio.nome, valor: valorDeForca(resumo), resumo });
  }
  for (const [tipo, registros] of historicoDeCardio(estado)) {
    const resumo = resumoDeCardio(tipo, registros);
    if (!resumo.tipo) continue;
    grupos.get('cardio').push({ id: `cardio-${tipo}`, nome: resumo.tipo.nome, valor: `${resumo.ultima.minutos} min`, resumo });
  }
  return REGIOES.map((regiao) => ({
    regiao,
    itens: grupos.get(regiao.id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }));
}

export function valorDeForca(resumo) {
  if (resumo.comCarga) return Number.isFinite(resumo.cargaAtual) ? kg(resumo.cargaAtual) : '— kg';
  return `${numero(resumo.recorde?.reps ?? 0)} ${resumo.medida === 'segundos' ? 's' : 'reps'}`;
}
