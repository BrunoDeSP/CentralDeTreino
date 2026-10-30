import { kg, numero } from '../util/texto.js';

// Progressão de carga por exercício (regra do PDF). Vale para qualquer treino
// e ciclo, porque fica guardada pelo id do exercício.
//
// - Sobe: fez todas as séries no topo da faixa, com a mesma carga. No treino
//   seguinte a carga sobe o "incremento" do exercício.
// - Segura: a maioria das séries ficou abaixo do mínimo da faixa. Em 2 treinos
//   seguidos a carga se mantém; no 3º, baixa uns 10%.
// - Joelho: dor acima de 3 de 10 ou falha encerram o exercício no dia, e ele
//   volta no treino seguinte com uns 15% menos carga.
// - Semana leve: mesmas cargas, nada sobe nem desce.
//
// Exercícios com incremento 0 (peso do corpo, elástico) não têm carga. Ao
// bater o topo da meta, o app avisa que dá para dificultar.

export const LIMITE_ABAIXO = 3;
export const QUEDA_ABAIXO = 0.1;
export const QUEDA_JOELHO = 0.15;

export function usaCarga(exercicio) {
  return Boolean(exercicio) && exercicio.incremento > 0;
}

export function registroDe(estado, exercicioId) {
  return estado.progressao?.[exercicioId] ?? null;
}

// Calcula o novo registro do exercício a partir das séries feitas no treino.
// Devolve null se nada foi feito e o joelho não encerrou o exercício.
export function avaliarExercicio(item, exercicio, anterior, data, { congelar = false } = {}) {
  const feitas = item.series.filter((serie) => serie.feita && Number.isFinite(serie.reps));
  const comCarga = usaCarga(exercicio);
  const recordeAntes = anterior?.recorde ?? null;

  if (item.joelho) {
    const base = comCarga ? cargaDeReferencia(feitas, item, anterior) : null;
    return {
      carga: Number.isFinite(base) ? reduzir(base, QUEDA_JOELHO, exercicio.incremento) : anterior?.carga ?? null,
      decisao: 'joelho',
      abaixoSeguidas: 0,
      ultima: feitas.length ? ultimaVez(feitas, comCarga, item, data) : anterior?.ultima ?? null,
      recorde: recordeAntes,
    };
  }
  if (feitas.length === 0) return null;

  const usouCarga = comCarga && feitas.some((serie) => Number.isFinite(serie.carga));
  const cargas = feitas.map((serie) => (usouCarga ? serie.carga ?? 0 : null));
  const reps = feitas.map((serie) => serie.reps);
  const referencia = usouCarga ? Math.max(...cargas) : null;
  const completou = feitas.length >= item.series.length;
  const bateuTopo = completou && reps.every((r) => r >= item.alvo.max) && cargas.every((c) => c === referencia);
  const abaixo = reps.filter((r) => r < item.alvo.min).length > reps.length / 2;
  const melhor = { carga: referencia, reps: Math.max(...reps.filter((_, i) => cargas[i] === referencia)), data };
  const recorde = !recordeAntes || superou(melhor, recordeAntes) ? melhor : recordeAntes;
  const ultima = { data, cargas, reps, alvo: item.alvo };

  if (congelar) {
    return { carga: anterior?.carga ?? referencia, decisao: 'manter', abaixoSeguidas: anterior?.abaixoSeguidas ?? 0, ultima, recorde };
  }
  if (bateuTopo) {
    return { carga: usouCarga ? arredondar(referencia + exercicio.incremento) : null, decisao: usouCarga ? 'subir' : 'dificultar', abaixoSeguidas: 0, ultima, recorde };
  }
  const abaixoSeguidas = abaixo ? (anterior?.abaixoSeguidas ?? 0) + 1 : 0;
  if (usouCarga && abaixoSeguidas >= LIMITE_ABAIXO) {
    return { carga: reduzir(referencia, QUEDA_ABAIXO, exercicio.incremento), decisao: 'baixar', abaixoSeguidas: 0, ultima, recorde };
  }
  return { carga: referencia, decisao: abaixo ? 'segurar' : 'manter', abaixoSeguidas, ultima, recorde };
}

// "20 kg × 12, 12, 11"  |  "12, 12, 10 reps"  |  "30, 30, 25 s"
export function descreverSeries({ cargas, reps, alvo }) {
  const unidade = alvo?.medida === 'segundos' ? 's' : 'reps';
  const lista = reps.map((r) => numero(r)).join(', ');
  if (cargas.every((c) => c === null)) return `${lista} ${unidade}`;
  if (cargas.every((c) => c === cargas[0])) return `${kg(cargas[0])} × ${lista}`;
  return cargas.map((c, i) => `${kg(c ?? 0)} × ${numero(reps[i])}`).join(', ');
}

function cargaDeReferencia(feitas, item, anterior) {
  const usadas = feitas.map((serie) => serie.carga).filter(Number.isFinite);
  if (usadas.length) return Math.max(...usadas);
  const planejada = item.series.find((serie) => Number.isFinite(serie.carga))?.carga;
  return Number.isFinite(planejada) ? planejada : anterior?.carga ?? null;
}

function ultimaVez(feitas, comCarga, item, data) {
  return { data, cargas: feitas.map((serie) => (comCarga && Number.isFinite(serie.carga) ? serie.carga : null)), reps: feitas.map((serie) => serie.reps), alvo: item.alvo };
}

// Tira a porcentagem e arredonda para o degrau do aparelho, sempre para baixo.
export function reduzir(carga, porcentagem, passo) {
  const degrau = passo > 0 ? passo : 1;
  let nova = Math.round((carga * (1 - porcentagem)) / degrau) * degrau;
  if (nova >= carga) nova = carga - degrau;
  return Math.max(0, arredondar(nova));
}

function superou(atual, recorde) {
  if (atual.carga === null || recorde.carga === null) return atual.reps > recorde.reps;
  return atual.carga > recorde.carga || (atual.carga === recorde.carga && atual.reps > recorde.reps);
}

const arredondar = (valor) => Math.round(valor * 100) / 100;
