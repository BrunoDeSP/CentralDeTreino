import { buscarExercicio } from '../dados/exercicios.js';
import { cicloAtivo, buscarTreino, concluirTreino, desfazerSessao } from './regras-do-ciclo.js';
import { usaCarga, avaliarExercicio, registroDe } from './progressao.js';
import { hojeISO, diferencaDias } from '../util/datas.js';
import { tiposDeCardio, buscarCardio, MINUTOS_DE_CARDIO, NIVEL_DE_CARDIO, INTERVALADO } from '../dados/regioes.js';

// Treino em andamento: séries marcadas, cargas, repetições, pausa e cardio.
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
    fase: ciclo.fase ?? null,
    data: hojeISO(),
    iniciadaEm: Date.now(),
    circuito,
    itens: treino.exercicios
      .filter((item) => item.exercicioId)
      .map((item) => {
        const novo = { exercicioId: item.exercicioId, base: item.exercicioId, alvo: item.alvo, alvoBase: item.alvo, joelho: false, series: [] };
        novo.series = seriesIniciais(estado, item.exercicioId, item.alvo, circuito ? treino.voltas : item.series);
        return novo;
      }),
    pausa: null,
    cardio: cardioInicial(estado, treino),
  };
  return estado.sessaoEmAndamento;
}

function seriesIniciais(estado, exercicioId, alvo, quantidade) {
  const registro = registroDe(estado, exercicioId);
  const carga = usaCarga(buscarExercicio(exercicioId)) ? registro?.carga ?? null : null;
  return Array.from({ length: quantidade }, (_, indice) => ({ carga, reps: repsIniciais(registro, carga, indice, alvo), feita: false }));
}

// --- Aparelho ocupado: troca pela alternativa ----------------------------------

// Troca o exercício pela alternativa (ou volta ao principal). Só antes da
// primeira série; a alternativa tem carga própria.
export function trocarExercicio(estado, sessao, i) {
  const item = sessao.itens[i];
  if (!item || item.series.some((serie) => serie.feita)) return false;
  const atual = buscarExercicio(item.exercicioId);
  const destinoId = item.exercicioId === item.base ? atual?.alternativa : item.base;
  const destino = buscarExercicio(destinoId);
  if (!destino) return false;
  item.exercicioId = destino.id;
  item.alvo = destino.id === item.base ? item.alvoBase : destino.alvo ?? item.alvoBase;
  item.series = seriesIniciais(estado, destino.id, item.alvo, item.series.length);
  return true;
}

// --- Joelho ----------------------------------------------------------------------

// Joelho incomodou (dor acima de 3 de 10 ou falha): encerra o exercício no dia.
export function encerrarPorJoelho(sessao, i) {
  if (sessao.itens[i]) sessao.itens[i].joelho = true;
}

export function retomarExercicio(sessao, i) {
  if (sessao.itens[i]) sessao.itens[i].joelho = false;
}

// --- Cardio ----------------------------------------------------------------------

// Cardio do treino: tipo da última vez, minutos sugeridos pela progressão e,
// nos dias de intervalado, o número de tiros (só depois do check-up).
function cardioInicial(estado, treino) {
  if (!treino.cardio) return null;
  const meta = { ...treino.cardio, chave: treino.cardio.chave ?? 'fim' };
  const opcoes = tiposDeCardio(meta.chave);
  const anteriores = estado.ciclos
    .flatMap((ciclo) => ciclo.sessoes)
    .filter((sessao) => sessao.cardio)
    .sort((a, b) => a.data.localeCompare(b.data));
  const ultimo = anteriores.filter((sessao) => opcoes.some((tipo) => tipo.id === sessao.cardio.tipo)).at(-1)?.cardio;
  const tipo = ultimo?.tipo ?? opcoes[0]?.id ?? 'bicicleta';
  const sugerido = sugestaoDeMinutos(estado, meta);
  const planejado = Boolean(meta.intervalado);
  return {
    chave: meta.chave,
    tipo,
    minutos: sugerido,
    sugerido,
    nivel: ultimoNivel(anteriores, tipo),
    meta,
    tiros: planejado && estado.configuracoes?.checkupFeito ? tirosDoIntervalado(estado) : null,
    semCheckup: planejado && !estado.configuracoes?.checkupFeito,
    timer: null,
    feito: false,
  };
}

export function sugestaoDeMinutos(estado, meta) {
  const [minimo, maximo] = meta.minutos;
  const guardado = estado.progressaoCardio?.[meta.chave ?? 'fim']?.sugerido;
  return Math.min(maximo, Math.max(minimo, Number.isFinite(guardado) ? guardado : minimo));
}

export function tirosDoIntervalado(estado) {
  const guardado = estado.progressaoCardio?.intervalado?.tiros;
  return Math.min(INTERVALADO.tirosMax, Math.max(INTERVALADO.tirosMin, Number.isFinite(guardado) ? guardado : INTERVALADO.tirosMin));
}

function ultimoNivel(anteriores, tipo) {
  return anteriores.filter((sessao) => sessao.cardio.tipo === tipo && Number.isFinite(sessao.cardio.nivel)).at(-1)?.cardio.nivel ?? null;
}

// O intervalado só vale nos tipos que aceitam tiro (bike, bike horizontal, elíptico).
export function intervaladoAtivo(cardio) {
  return Boolean(cardio?.tiros) && Boolean(buscarCardio(cardio.tipo)?.intervalado);
}

export function definirCardio(sessao, campos, estado = null) {
  if (!sessao?.cardio) return;
  const cardio = sessao.cardio;
  if ('tipo' in campos && campos.tipo !== cardio.tipo) {
    cardio.timer = null;
    if (estado) {
      const anteriores = estado.ciclos.flatMap((ciclo) => ciclo.sessoes).filter((s) => s.cardio).sort((a, b) => a.data.localeCompare(b.data));
      cardio.nivel = ultimoNivel(anteriores, campos.tipo);
    }
  }
  Object.assign(cardio, campos);
  const { min, max } = MINUTOS_DE_CARDIO;
  cardio.minutos = Math.min(max, Math.max(min, Math.round(Number(cardio.minutos) || min)));
  if (cardio.nivel !== null && cardio.nivel !== undefined) {
    const nivel = Math.round(Number(cardio.nivel));
    cardio.nivel = Number.isFinite(nivel) && nivel > 0 ? Math.min(NIVEL_DE_CARDIO.max, Math.max(NIVEL_DE_CARDIO.min, nivel)) : null;
  }
}

export function iniciarIntervalado(sessao) {
  if (sessao?.cardio) sessao.cardio.timer = { inicioEm: Date.now() };
}

export function pararIntervalado(sessao) {
  if (sessao?.cardio) sessao.cardio.timer = null;
}

// Onde o intervalado está: tiro, fase (forte, leve ou fim) e segundos que faltam.
export function momentoDoIntervalado(cardio, agora = Date.now()) {
  const { forte, leve } = INTERVALADO;
  const ciclo = forte + leve;
  const total = cardio.tiros * ciclo;
  const passados = Math.max(0, (agora - cardio.timer.inicioEm) / 1000);
  if (passados >= total) return { fase: 'fim', tiro: cardio.tiros, tiros: cardio.tiros, restante: 0, chave: 'fim' };
  const tiro = Math.floor(passados / ciclo) + 1;
  const noTiro = passados % ciclo;
  const fase = noTiro < forte ? 'forte' : 'leve';
  const restante = Math.ceil(fase === 'forte' ? forte - noTiro : ciclo - noTiro);
  return { fase, tiro, tiros: cardio.tiros, restante, chave: `${tiro}-${fase}` };
}

// --- Séries ------------------------------------------------------------------------

// Começa com o que ela fez na última vez com a mesma carga; senão, com o mínimo da meta.
function repsIniciais(registro, carga, indice, alvo) {
  const ultima = registro?.ultima;
  if (ultima && Number.isFinite(ultima.reps[indice]) && (ultima.cargas[indice] ?? null) === carga && ultima.alvo?.medida === alvo.medida) {
    return ultima.reps[indice];
  }
  return alvo.min;
}

// Ordem das séries: exercício por exercício, ou volta por volta no circuito.
// Exercícios encerrados pelo joelho saem da fila.
export function ordemDasSeries(sessao) {
  const ordem = [];
  if (sessao.circuito) {
    const voltas = Math.max(0, ...sessao.itens.map((item) => item.series.length));
    for (let volta = 0; volta < voltas; volta++) {
      sessao.itens.forEach((item, i) => {
        if (!item.joelho && volta < item.series.length) ordem.push([i, volta]);
      });
    }
  } else {
    sessao.itens.forEach((item, i) => {
      if (!item.joelho) item.series.forEach((_, s) => ordem.push([i, s]));
    });
  }
  return ordem;
}

// Próxima série a fazer: [índice do exercício, índice da série], ou null se acabou.
export function serieAtual(sessao) {
  return ordemDasSeries(sessao).find(([i, s]) => !sessao.itens[i].series[s].feita) ?? null;
}

export function progresso(sessao) {
  let feitas = 0;
  let total = 0;
  for (const item of sessao.itens) {
    const marcadas = item.series.filter((serie) => serie.feita).length;
    feitas += marcadas;
    total += item.joelho ? marcadas : item.series.length;
  }
  return { feitas, total };
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

// --- Fim do treino -------------------------------------------------------------------

// Fecha o treino: registra no histórico do ciclo e atualiza a progressão de
// cada exercício e do cardio. Devolve o necessário para desfazer logo em seguida.
export function finalizarSessao(estado) {
  const sessao = estado.sessaoEmAndamento;
  if (!sessao) throw new Error('Nenhum treino em andamento.');
  const ciclo = estado.ciclos.find((c) => c.id === sessao.cicloId) ?? null;
  const registro = ciclo ? concluirTreino(ciclo, sessao.treinoId, sessao.data) : null;
  if (registro) {
    registro.series = sessao.itens.map((item) => ({
      exercicioId: item.exercicioId,
      alvo: item.alvo,
      ...(item.joelho ? { joelho: true } : {}),
      series: item.series.filter((serie) => serie.feita).map(({ carga, reps }) => ({ carga, reps })),
    }));
  }
  const cardio = sessao.cardio;
  const intervalado = cardio?.feito && intervaladoAtivo(cardio);
  if (registro && cardio?.feito) {
    registro.cardio = {
      chave: cardio.chave,
      tipo: cardio.tipo,
      minutos: cardio.minutos,
      nivel: cardio.nivel ?? null,
      ...(intervalado ? { tiros: cardio.tiros } : {}),
    };
  }

  const congelar = (ciclo?.fase ?? sessao.fase) === 'leve';
  const progressaoAntes = {};
  const mudancas = [];
  for (const item of sessao.itens) {
    const anterior = registroDe(estado, item.exercicioId);
    const novo = avaliarExercicio(item, buscarExercicio(item.exercicioId), anterior, sessao.data, { congelar });
    if (!novo) continue;
    progressaoAntes[item.exercicioId] = anterior;
    estado.progressao[item.exercicioId] = novo;
    mudancas.push({ exercicioId: item.exercicioId, decisao: novo.decisao, carga: novo.carga });
  }

  // Cardio: completou os minutos sugeridos = 5 min a mais, no máximo 1 vez por semana.
  estado.progressaoCardio ??= {};
  const cardioAntes = JSON.parse(JSON.stringify(estado.progressaoCardio));
  if (cardio?.feito) {
    const guardado = estado.progressaoCardio[cardio.chave] ?? {};
    const podeSubir = !guardado.subiuEm || diferencaDias(guardado.subiuEm, sessao.data) >= 7;
    estado.progressaoCardio[cardio.chave] = cardio.minutos >= cardio.sugerido && podeSubir
      ? { sugerido: Math.min(cardio.meta.minutos[1], cardio.sugerido + MINUTOS_DE_CARDIO.passo), subiuEm: sessao.data }
      : { ...guardado, sugerido: cardio.sugerido };
    if (intervalado) {
      estado.progressaoCardio.intervalado = { tiros: Math.min(INTERVALADO.tirosMax, cardio.tiros + 1) };
    }
  }

  estado.sessaoEmAndamento = null;
  return { sessao, registro, cicloId: ciclo?.id ?? null, progressaoAntes, cardioAntes, mudancas };
}

// Desfaz a finalização: devolve a progressão, tira o treino do histórico e reabre o treino.
export function desfazerFinalizacao(estado, { sessao, registro, cicloId, progressaoAntes, cardioAntes }) {
  for (const [id, anterior] of Object.entries(progressaoAntes)) {
    if (anterior) estado.progressao[id] = anterior;
    else delete estado.progressao[id];
  }
  if (cardioAntes) estado.progressaoCardio = cardioAntes;
  const ciclo = estado.ciclos.find((c) => c.id === cicloId);
  if (ciclo && registro) desfazerSessao(ciclo, registro.id);
  estado.sessaoEmAndamento = { ...sessao, pausa: null };
}

export function cancelarSessao(estado) {
  estado.sessaoEmAndamento = null;
}
