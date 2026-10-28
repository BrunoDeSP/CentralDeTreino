import { kg, numero } from '../util/texto.js';

// Progressão de carga por exercício. Vale para qualquer treino e ciclo,
// porque fica guardada pelo id do exercício.
//
// Regra (dupla progressão):
// - Cada exercício tem uma meta de repetições (ex.: 10 a 12).
// - Fez todas as séries no topo da meta, com a mesma carga: no próximo
//   treino a carga sobe o "incremento" do exercício.
// - Senão, a carga se mantém e o objetivo é fazer mais repetições.
// - Três treinos seguidos sem evoluir (nem carga, nem repetições): o app
//   sugere baixar a carga ou trocar o exercício.
//
// Exercícios com incremento 0 (peso do corpo, elástico) não têm carga. Ao
// bater o topo da meta, o app avisa que dá para dificultar.

export const LIMITE_SEM_EVOLUIR = 3;

export function usaCarga(exercicio) {
  return Boolean(exercicio) && exercicio.incremento > 0;
}

export function registroDe(estado, exercicioId) {
  return estado.progressao?.[exercicioId] ?? null;
}

// Calcula o novo registro do exercício a partir das séries feitas no treino.
// Devolve null se nenhuma série foi marcada.
export function avaliarExercicio(item, exercicio, anterior, data) {
  const feitas = item.series.filter((serie) => serie.feita && Number.isFinite(serie.reps));
  if (feitas.length === 0) return null;

  const comCarga = usaCarga(exercicio) && feitas.some((serie) => Number.isFinite(serie.carga));
  const cargas = feitas.map((serie) => (comCarga ? serie.carga ?? 0 : null));
  const reps = feitas.map((serie) => serie.reps);
  const referencia = comCarga ? Math.max(...cargas) : null;

  const completou = feitas.length >= item.series.length;
  const bateuTopo = completou && reps.every((r) => r >= item.alvo.max) && cargas.every((c) => c === referencia);
  const decisao = bateuTopo ? (comCarga ? 'subir' : 'dificultar') : 'manter';
  const carga = comCarga ? (decisao === 'subir' ? arredondar(referencia + exercicio.incremento) : referencia) : null;

  const melhor = {
    carga: referencia,
    reps: Math.max(...reps.filter((_, i) => cargas[i] === referencia)),
    data,
  };
  const recordeAntes = anterior?.recorde ?? null;

  return {
    carga, // carga sugerida para a próxima vez (null = sem carga)
    decisao, // 'subir' | 'manter' | 'dificultar'
    semEvoluir: evoluiu(reps, referencia, anterior?.ultima) ? 0 : (anterior?.semEvoluir ?? 0) + 1,
    ultima: { data, cargas, reps, alvo: item.alvo },
    recorde: !recordeAntes || superou(melhor, recordeAntes) ? melhor : recordeAntes,
  };
}

// "20 kg × 12, 12, 11"  |  "12, 12, 10 reps"  |  "30, 30, 25 s"
export function descreverSeries({ cargas, reps, alvo }) {
  const unidade = alvo?.medida === 'segundos' ? 's' : 'reps';
  const lista = reps.map((r) => numero(r)).join(', ');
  if (cargas.every((c) => c === null)) return `${lista} ${unidade}`;
  if (cargas.every((c) => c === cargas[0])) return `${kg(cargas[0])} × ${lista}`;
  return cargas.map((c, i) => `${kg(c ?? 0)} × ${numero(reps[i])}`).join(', ');
}

// Evoluiu = carga maior que na última vez ou, com a mesma carga, mais repetições no total.
function evoluiu(reps, referencia, ultima) {
  if (!ultima) return true;
  const total = soma(reps);
  const totalAntes = soma(ultima.reps);
  if (referencia === null) return total > totalAntes;
  const cargaAntes = Math.max(0, ...ultima.cargas.map((c) => c ?? 0));
  return referencia > cargaAntes || (referencia === cargaAntes && total > totalAntes);
}

function superou(atual, recorde) {
  if (atual.carga === null || recorde.carga === null) return atual.reps > recorde.reps;
  return atual.carga > recorde.carga || (atual.carga === recorde.carga && atual.reps > recorde.reps);
}

const soma = (lista) => lista.reduce((total, n) => total + n, 0);
const arredondar = (valor) => Math.round(valor * 100) / 100;
