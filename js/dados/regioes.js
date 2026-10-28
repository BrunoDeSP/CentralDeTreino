// Regiões do corpo usadas na aba Exercícios e os tipos de cardio que ela
// registra no fim do treino.

export const REGIOES = [
  { id: 'inferiores', nome: 'Inferiores', descricao: 'Pernas e glúteos', padroes: ['agachar', 'quadril', 'unilateral'] },
  { id: 'superiores', nome: 'Superiores', descricao: 'Costas, peito, ombros e braços', padroes: ['empurrar-h', 'empurrar-v', 'puxar-h', 'puxar-v'] },
  { id: 'core', nome: 'Core', descricao: 'Abdômen', padroes: ['core'] },
  { id: 'cardio', nome: 'Cardio', descricao: 'Registrado no fim do treino', padroes: [] },
];

export function regiaoDoPadrao(padrao) {
  return REGIOES.find((regiao) => regiao.padroes.includes(padrao))?.id ?? null;
}

export const TIPOS_DE_CARDIO = [
  { id: 'esteira', nome: 'Esteira' },
  { id: 'bicicleta', nome: 'Bicicleta' },
  { id: 'eliptico', nome: 'Elíptico' },
  { id: 'escada', nome: 'Escada' },
  { id: 'caminhada', nome: 'Caminhada' },
  { id: 'corrida', nome: 'Corrida' },
];

export function buscarCardio(id) {
  return TIPOS_DE_CARDIO.find((tipo) => tipo.id === id) ?? null;
}

// Limites do campo de minutos do cardio.
export const MINUTOS_DE_CARDIO = { min: 5, max: 120, passo: 5 };
