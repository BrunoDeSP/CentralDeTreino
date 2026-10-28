import { buscarExercicio } from '../dados/exercicios.js';
import { cicloAtivo, buscarTreino, concluirTreino, desfazerSessao } from './regras-do-ciclo.js';
import { usaCarga, avaliarExercicio, registroDe } from './progressao.js';
import { hojeISO } from '../util/datas.js';
import { TIPOS_DE_CARDIO, MINUTOS_DE_CARDIO } from '../dados/regioes.js';

// Treino em andamento: séries marcadas, cargas, repetições e pausa.
// É salvo a cada toque, então fechar o app no meio do treino não perde nada.

export function sessaoAtual(estado) {
  return estado.sessaoEmAndamento ?? null;
}

export function iniciarSessao(estado, treinoId) {
  const ciclo = cicloAtivo(estado);
  const treino = ciclo ? buscarTreino(ciclo, treinoId) : null;
  if (!treino) throw new Error(`O Treino ${treinoId} não faz parte do ciclo atual.`);
  const circuito = treino.formato === 'circuito';

  estado.sessaoEmAndamento = {
    cicloId: ciclo.id,
    treinoId,
    data: hojeISO(),
    iniciadaEm: Date.now(),
    circuito,
    itens: treino.exercicios
      .filter((item) => item.exercicioId)
      .map((item) => {
        const exercicio = buscarExercicio(item.exercicioId);
        const registro = registroDe(estado, item.exercicioId);
        const carga = usaCarga(exercicio) ? registro?.carga ?? null : null;
        const quantidade = circuito ? treino.voltas : item.series;
        return {
          exercicioId: item.exercicioId,
          alvo: item.alvo,
          series: Array.from({ length: quantidade }, (_, indice) => ({
            carga,
            reps: repsIniciais(registro, carga, indice, item.alvo),
            feita: false,
          })),
        };
      }),
    pausa: null,
    cardio: cardioInicial(estado, treino),
  };
  return estado.sessaoEmAndamento;
}

// Cardio do fim do treino: começa com o tipo e os minutos da última vez.
function cardioInicial(estado, treino) {
  if (!treino.cardio) return null;
  const ultimo = estado.ciclos
    .flatMap((ciclo) => ciclo.sessoes)
    .filter((sessao) => sessao.cardio)
    .sort((a, b) => a.data.localeCompare(b.data))
    .at(-1)?.cardio;
  return {
    tipo: ultimo?.tipo ?? TIPOS_DE_CARDIO[0].id,
    minutos: ultimo?.minutos ?? treino.cardio.minutos[0],
    meta: treino.cardio,
    feito: false,
  };
}

export function definirCardio(sessao, campos) {
  if (!sessao?.cardio) return;
  Object.assign(sessao.cardio, campos);
  const { min, max } = MINUTOS_DE_CARDIO;
  sessao.cardio.minutos = Math.min(max, Math.max(min, Math.round(Number(sessao.cardio.minutos) || min)));
}

// Começa com o que ela fez na última vez com a mesma carga; senão, com o mínimo da meta.
function repsIniciais(registro, carga, indice, alvo) {
  const ultima = registro?.ultima;
  if (ultima && Number.isFinite(ultima.reps[indice]) && (ultima.cargas[indice] ?? null) === carga) {
    return ultima.reps[indice];
  }
  return alvo.min;
}

// Ordem das séries: exercício por exercício, ou volta por volta no circuito.
export function ordemDasSeries(sessao) {
  const ordem = [];
  if (sessao.circuito) {
    const voltas = Math.max(...sessao.itens.map((item) => item.series.length));
    for (let volta = 0; volta < voltas; volta++) {
      sessao.itens.forEach((item, i) => {
        if (volta < item.series.length) ordem.push([i, volta]);
      });
    }
  } else {
    sessao.itens.forEach((item, i) => item.series.forEach((_, s) => ordem.push([i, s])));
  }
  return ordem;
}

// Próxima série a fazer: [índice do exercício, índice da série], ou null se acabou.
export function serieAtual(sessao) {
  return ordemDasSeries(sessao).find(([i, s]) => !sessao.itens[i].series[s].feita) ?? null;
}

export function progresso(sessao) {
  const todas = sessao.itens.flatMap((item) => item.series);
  return { feitas: todas.filter((serie) => serie.feita).length, total: todas.length };
}

export function alternarSerie(sessao, i, s) {
  const serie = sessao.itens[i].series[s];
  serie.feita = !serie.feita;
  return serie.feita;
}

// Ajusta a carga ou as repetições de uma série. Uma carga nova vale também
// para as séries seguintes do mesmo exercício que ainda não foram feitas.
export function definirValor(sessao, i, s, campo, valor) {
  const series = sessao.itens[i].series;
  const limpo = Number.isFinite(valor) ? Math.max(0, Math.round(valor * 100) / 100) : null;
  if (campo === 'carga') {
    for (let k = s; k < series.length; k++) {
      if (k === s || !series[k].feita) series[k].carga = limpo;
    }
  } else {
    series[s].reps = limpo ?? 0;
  }
}

// Quanto cada toque no + ou − muda o valor.
export function passoDoCampo(campo, exercicio, alvo) {
  if (campo === 'carga') return exercicio?.incremento || 1;
  return alvo.medida === 'segundos' ? 5 : 1;
}

export function iniciarPausa(sessao, segundos) {
  sessao.pausa = { fimEm: Date.now() + segundos * 1000 };
  return sessao.pausa;
}

export function ajustarPausa(sessao, segundos) {
  if (!sessao.pausa) return null;
  sessao.pausa.fimEm = Math.max(Date.now(), sessao.pausa.fimEm + segundos * 1000);
  return sessao.pausa;
}

export function encerrarPausa(sessao) {
  sessao.pausa = null;
}

export function pausaAtiva(sessao) {
  return Boolean(sessao?.pausa && sessao.pausa.fimEm > Date.now());
}

// Fecha o treino: registra no histórico do ciclo e atualiza a progressão de
// cada exercício. Devolve o necessário para desfazer logo em seguida.
export function finalizarSessao(estado) {
  const sessao = estado.sessaoEmAndamento;
  if (!sessao) throw new Error('Nenhum treino em andamento.');

  const ciclo = estado.ciclos.find((c) => c.id === sessao.cicloId) ?? null;
  const registro = ciclo ? concluirTreino(ciclo, sessao.treinoId, sessao.data) : null;
  if (registro) {
    registro.series = sessao.itens.map((item) => ({
      exercicioId: item.exercicioId,
      alvo: item.alvo,
      series: item.series.filter((serie) => serie.feita).map(({ carga, reps }) => ({ carga, reps })),
    }));
  }

  if (registro && sessao.cardio?.feito) {
    registro.cardio = { tipo: sessao.cardio.tipo, minutos: sessao.cardio.minutos };
  }

  const progressaoAntes = {};
  const mudancas = [];
  for (const item of sessao.itens) {
    const anterior = registroDe(estado, item.exercicioId);
    const novo = avaliarExercicio(item, buscarExercicio(item.exercicioId), anterior, sessao.data);
    if (!novo) continue;
    progressaoAntes[item.exercicioId] = anterior;
    estado.progressao[item.exercicioId] = novo;
    mudancas.push({ exercicioId: item.exercicioId, decisao: novo.decisao, carga: novo.carga });
  }

  estado.sessaoEmAndamento = null;
  return { sessao, registro, cicloId: ciclo?.id ?? null, progressaoAntes, mudancas };
}

// Desfaz a finalização: devolve a progressão, tira o treino do histórico e reabre o treino.
export function desfazerFinalizacao(estado, { sessao, registro, cicloId, progressaoAntes }) {
  for (const [id, anterior] of Object.entries(progressaoAntes)) {
    if (anterior) estado.progressao[id] = anterior;
    else delete estado.progressao[id];
  }
  const ciclo = estado.ciclos.find((c) => c.id === cicloId);
  if (ciclo && registro) desfazerSessao(ciclo, registro.id);
  estado.sessaoEmAndamento = { ...sessao, pausa: null };
}

export function cancelarSessao(estado) {
  estado.sessaoEmAndamento = null;
}
