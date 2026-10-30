// Regiões do corpo usadas na aba Exercícios e os tipos de cardio, com o
// passo a passo de cada aparelho (seção "Cardio aparelho por aparelho" do PDF).

export const REGIOES = [
  { id: 'inferiores', nome: 'Inferiores', descricao: 'Pernas e glúteos', padroes: ['agachar', 'quadril', 'unilateral'] },
  { id: 'superiores', nome: 'Superiores', descricao: 'Costas, peito, ombros e braços', padroes: ['empurrar-h', 'empurrar-v', 'puxar-h', 'puxar-v'] },
  { id: 'core', nome: 'Core', descricao: 'Abdômen', padroes: ['core'] },
  { id: 'cardio', nome: 'Cardio', descricao: 'Registrado no treino', padroes: [] },
];

export function regiaoDoPadrao(padrao) {
  return REGIOES.find((regiao) => regiao.padroes.includes(padrao))?.id ?? null;
}

export function regiaoDoExercicio(exercicio) {
  return exercicio?.regiao ?? regiaoDoPadrao(exercicio?.padrao);
}

const RITMO = 'Ritmo da conversa: dá para falar frases, mas não para cantar (esforço 5 a 6 de 10).';
const JOELHO_BIKE = 'Banco baixo e carga alta são o que mais forçam a frente do joelho. Se incomodar, suba um pouco o banco e baixe a carga antes de parar.';
const TIRO_BIKE = 'No tiro, aumente mais a rotação do que a carga; no leve, carga baixa.';

// onde: 'fim' = cardio no fim da musculação, 'core' = dia de Cardio + core,
// 'longo' = dia de Cardio longo. status 'testar' e 'fora' não aparecem para escolher.
export const TIPOS_DE_CARDIO = [
  {
    id: 'bicicleta', nome: 'Bike', status: 'liberado', intervalado: true, onde: ['fim', 'core', 'longo'],
    dicas: [
      ['Ajuste', 'Banco na altura em que, com o pedal embaixo, o joelho fica só um pouco dobrado. Teste: com o calcanhar no pedal embaixo, a perna fica quase reta.'],
      ['Como fazer', 'Pedale com a parte da frente do pé e o joelho alinhado com o pé. Na bike de spinning, fique sentada o tempo todo.'],
      ['Ritmo', `Carga leve a moderada, girando solto. ${RITMO}`],
      ['Intervalado', TIRO_BIKE],
      ['Joelho', JOELHO_BIKE],
    ],
  },
  {
    id: 'bike-horizontal', nome: 'Bike horizontal', status: 'liberado', intervalado: true, onde: ['fim', 'core', 'longo'],
    dicas: [
      ['Ajuste', 'Banco na distância em que, com o pedal mais longe, o joelho fica só um pouco dobrado.'],
      ['Como fazer', 'Costas apoiadas no encosto e joelho alinhado com o pé. Boa troca quando a lombar cansa ou a bike comum está ocupada.'],
      ['Ritmo', `Carga leve a moderada, girando solto. ${RITMO}`],
      ['Intervalado', TIRO_BIKE],
      ['Joelho', JOELHO_BIKE],
    ],
  },
  {
    id: 'eliptico', nome: 'Elíptico ou transport', status: 'liberado', intervalado: true, onde: ['fim', 'core', 'longo'],
    dicas: [
      ['Ajuste', 'Se o aparelho tiver, comece com inclinação e passada no meio da escala.'],
      ['Como fazer', 'Pé inteiro apoiado no pedal, sem ficar na ponta; tronco reto, sem jogar o peso nas alças. Empurrar e puxar as alças aumenta o gasto.'],
      ['Ritmo', `Resistência leve a moderada. ${RITMO}`],
      ['Intervalado', 'Se a bike estiver ocupada: no tiro, acelere as passadas, com a resistência só um pouco mais alta.'],
      ['Joelho', 'Se incomodar, baixe a resistência e a inclinação e confira se o joelho acompanha a linha do pé.'],
    ],
  },
  {
    id: 'hidro', nome: 'Hidroginástica ou natação', status: 'liberado', intervalado: false, onde: ['longo'],
    dicas: [
      ['Quando', 'No cardio longo ou como cardio extra num dia livre. Não tem impacto.'],
      ['Ritmo', RITMO],
      ['Natação', 'Crawl e costas. Evite a pernada do nado peito, que força a parte de dentro do joelho.'],
    ],
  },
  {
    id: 'remo', nome: 'Remo', status: 'testar', intervalado: false, onde: ['fim', 'core', 'longo'],
    dicas: [
      ['Teste', '5 min leves. Se o joelho incomodar durante ou no dia seguinte, ele fica fora.'],
      ['Como fazer', 'Na puxada: pernas, tronco e braços; na volta, a ordem inversa. Não deixe o banco chegar até os calcanhares.'],
    ],
  },
  // Fora do plano: ficam só para o histórico.
  { id: 'esteira', nome: 'Esteira', status: 'fora', intervalado: false, onde: [], dicas: [] },
  { id: 'escada', nome: 'Escada', status: 'fora', intervalado: false, onde: [], dicas: [] },
  { id: 'caminhada', nome: 'Caminhada', status: 'fora', intervalado: false, onde: [], dicas: [] },
  { id: 'corrida', nome: 'Corrida', status: 'fora', intervalado: false, onde: [], dicas: [] },
];

export function buscarCardio(id) {
  return TIPOS_DE_CARDIO.find((tipo) => tipo.id === id) ?? null;
}

// Tipos que ela pode escolher num treino.
export function tiposDeCardio(onde) {
  return TIPOS_DE_CARDIO.filter((tipo) => tipo.status === 'liberado' && tipo.onde.includes(onde));
}

// Limites dos campos do cardio.
export const MINUTOS_DE_CARDIO = { min: 5, max: 120, passo: 5 };
export const NIVEL_DE_CARDIO = { min: 1, max: 40 };

// Intervalado: tiros de 30 s forte e 90 s leve, começando com 6 e subindo 1 a
// cada intervalado concluído, até 10.
export const INTERVALADO = { forte: 30, leve: 90, tirosMin: 6, tirosMax: 10 };

export const SINAIS_PARA_PARAR =
  'Pare na hora e procure atendimento se sentir dor ou aperto no peito, falta de ar fora do normal, tontura, desmaio ou palpitação.';
