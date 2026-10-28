// Formatação de textos e números.

// "1 treino", "3 treinos"
export function plural(quantidade, singular, pluralForma = `${singular}s`) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralForma}`;
}

const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

// 22.5 -> "22,5"
export function numero(valor) {
  return formatoNumero.format(valor);
}

// 22.5 -> "22,5 kg"
export function kg(valor) {
  return `${numero(valor)} kg`;
}

// Relógio da pausa: 90 -> "1:30"
export function tempo(segundos) {
  const total = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Duração por extenso: 45 -> "45 s", 90 -> "1 min 30 s", 120 -> "2 min"
export function duracao(segundos) {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (minutos === 0) return `${resto} s`;
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`;
}
