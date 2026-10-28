// Modelos de divisão, um para cada quantidade de dias por semana.
//
// Cada treino é uma lista de "vagas". Uma vaga diz o padrão de movimento e a
// dose (séries e faixa de repetições); o gerador escolhe no banco um exercício
// daquele padrão para ocupar a vaga.
//
// Séries, repetições, descanso e cardio abaixo são valores de EXEMPLO.
// Quando tivermos os dados dela, é aqui que ajustamos.

export const PADROES = {
  agachar: 'Agachar',
  quadril: 'Dobrar o quadril',
  unilateral: 'Perna, um lado por vez',
  'empurrar-h': 'Empurrar à frente',
  'empurrar-v': 'Empurrar para cima',
  'puxar-h': 'Puxar em direção ao corpo',
  'puxar-v': 'Puxar de cima para baixo',
  core: 'Core',
};

// Faixa usada quando a vaga cai num exercício medido em segundos (ex.: prancha).
export const SEGUNDOS_PADRAO = [30, 45];

// Atalho para escrever vagas: vaga('agachar', 3, 10, 12) = 3 séries de 10 a 12.
const vaga = (padrao, series, repsMin, repsMax) => ({ padrao, series, reps: [repsMin, repsMax] });

const DESCANSO = { segundos: [60, 90] };
const CARDIO = { minutos: [10, 20], ritmo: 'moderado' };

const PERNAS = 'Pernas e glúteos';
const TRONCO = 'Costas, peito e ombros';

// Nos dias com "Pernas e glúteos" e "Costas, peito e ombros", a fila alterna
// as duas regiões para nunca cair a mesma em dois treinos seguidos.
const DIVISAO_POR_REGIAO = [
  {
    id: 'A',
    foco: PERNAS,
    vagas: [vaga('agachar', 3, 10, 12), vaga('quadril', 3, 10, 12), vaga('unilateral', 3, 10, 12), vaga('quadril', 3, 12, 15), vaga('core', 3, 10, 15)],
  },
  {
    id: 'B',
    foco: TRONCO,
    vagas: [vaga('empurrar-h', 3, 10, 12), vaga('puxar-v', 3, 10, 12), vaga('empurrar-v', 3, 10, 12), vaga('puxar-h', 3, 10, 12), vaga('core', 3, 10, 15)],
  },
  {
    id: 'C',
    foco: PERNAS,
    vagas: [vaga('quadril', 3, 10, 12), vaga('agachar', 3, 10, 12), vaga('unilateral', 3, 10, 12), vaga('quadril', 3, 12, 15), vaga('core', 3, 10, 15)],
  },
  {
    id: 'D',
    foco: TRONCO,
    vagas: [vaga('puxar-h', 3, 10, 12), vaga('empurrar-v', 3, 10, 12), vaga('puxar-v', 3, 10, 12), vaga('empurrar-h', 3, 10, 12), vaga('core', 3, 10, 15)],
  },
];

export const MODELOS = {
  1: {
    nome: 'Corpo todo em 1 treino',
    descricao: 'Um treino completo, com todos os movimentos principais.',
    treinos: [
      {
        id: 'A',
        foco: 'Corpo todo',
        vagas: [
          vaga('agachar', 3, 10, 12),
          vaga('puxar-v', 3, 10, 12),
          vaga('quadril', 3, 10, 12),
          vaga('empurrar-h', 3, 10, 12),
          vaga('unilateral', 3, 10, 12),
          vaga('puxar-h', 3, 10, 12),
          vaga('core', 3, 10, 15),
        ],
      },
    ],
  },

  2: {
    nome: 'Corpo todo em 2 treinos',
    descricao: 'Os dois treinos trabalham o corpo inteiro, com exercícios diferentes.',
    treinos: [
      {
        id: 'A',
        foco: 'Corpo todo',
        vagas: [vaga('agachar', 3, 10, 12), vaga('empurrar-h', 3, 10, 12), vaga('puxar-v', 3, 10, 12), vaga('quadril', 3, 10, 12), vaga('core', 3, 10, 15)],
      },
      {
        id: 'B',
        foco: 'Corpo todo',
        vagas: [vaga('quadril', 3, 10, 12), vaga('puxar-h', 3, 10, 12), vaga('unilateral', 3, 10, 12), vaga('empurrar-v', 3, 10, 12), vaga('core', 3, 10, 15)],
      },
    ],
  },

  3: {
    nome: 'Corpo todo em 3 treinos',
    descricao: 'Os três treinos trabalham o corpo inteiro, variando a ênfase.',
    treinos: [
      {
        id: 'A',
        foco: 'Corpo todo',
        vagas: [vaga('agachar', 3, 10, 12), vaga('empurrar-h', 3, 10, 12), vaga('puxar-h', 3, 10, 12), vaga('quadril', 3, 10, 12), vaga('core', 3, 10, 15)],
      },
      {
        id: 'B',
        foco: 'Corpo todo',
        vagas: [vaga('quadril', 3, 10, 12), vaga('puxar-v', 3, 10, 12), vaga('empurrar-v', 3, 10, 12), vaga('unilateral', 3, 10, 12), vaga('core', 3, 10, 15)],
      },
      {
        id: 'C',
        foco: 'Corpo todo',
        vagas: [vaga('unilateral', 3, 10, 12), vaga('empurrar-h', 3, 10, 12), vaga('puxar-v', 3, 10, 12), vaga('agachar', 3, 12, 15), vaga('core', 3, 10, 15)],
      },
    ],
  },

  4: {
    nome: 'Pernas e tronco, 2 vezes cada',
    descricao: 'Dois treinos de pernas e glúteos e dois de costas, peito e ombros, alternados.',
    treinos: DIVISAO_POR_REGIAO,
  },

  5: {
    nome: 'Pernas e tronco + circuito',
    descricao: 'Os quatro treinos alternados e um circuito de corpo todo para gastar mais energia.',
    treinos: [
      ...DIVISAO_POR_REGIAO,
      {
        id: 'E',
        foco: 'Circuito de corpo todo',
        formato: 'circuito',
        voltas: 3,
        descanso: { segundos: [90, 120] },
        cardio: { minutos: [15, 20], ritmo: 'moderado' },
        vagas: [vaga('agachar', 1, 12, 15), vaga('empurrar-h', 1, 12, 15), vaga('puxar-h', 1, 12, 15), vaga('unilateral', 1, 12, 15), vaga('core', 1, 10, 15)],
      },
    ],
  },
};

// Valores que todo treino recebe, a não ser que o próprio treino defina outro.
export const PADRAO_DO_TREINO = {
  formato: 'series',
  voltas: null,
  descanso: DESCANSO,
  cardio: CARDIO,
};
