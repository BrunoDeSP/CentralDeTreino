// O plano do PDF dentro do app: fases, treinos por dias da semana e cardio.
//
// As tabelas abaixo trazem as séries da Construção. O gerador ajusta para a
// fase (Adaptação: 2 séries; Consolidação: +1 nos dois primeiros compostos;
// semana leve: metade) e tira o que não entra com 5 ou 6 dias.

export const FASES = [
  { id: 'adaptacao', nome: 'Adaptação', semanas: 4, sobrando: 3, foco: 'Técnica e hábito', resumo: '2 séries por exercício, 3 repetições sobrando' },
  { id: 'construcao', nome: 'Construção', semanas: 4, sobrando: 2, foco: 'Subir as cargas', resumo: 'Séries do plano, 2 repetições sobrando' },
  { id: 'consolidacao', nome: 'Consolidação', semanas: 4, sobrando: 2, foco: 'Volume e intensidade', resumo: 'Uma série a mais nos dois primeiros compostos' },
  { id: 'leve', nome: 'Semana leve', semanas: 1, sobrando: 2, foco: 'Respiro antes da próxima rodada', resumo: 'Mesmas cargas, metade das séries, sem intervalado' },
];

export function buscarFase(id) {
  return FASES.find((fase) => fase.id === id) ?? FASES[1];
}

// Depois da semana leve, uma nova rodada começa pela Construção.
export const PROXIMA_FASE = { adaptacao: 'construcao', construcao: 'consolidacao', consolidacao: 'leve', leve: 'construcao' };

// Atalho: x('supino-maquina', 3, 10, 12). Exercícios em segundos usam min e max em segundos.
const x = (id, series, min, max, extras = {}) => ({ id, series, min, max, ...extras });

// Corpo inteiro (1 a 3 dias).
const CORPO_INTEIRO = {
  A: [x('agachamento-banco', 3, 10, 12), x('elevacao-pelvica', 3, 10, 12), x('supino-maquina', 3, 10, 12), x('puxada-frente', 3, 10, 12), x('cadeira-abdutora', 2, 12, 15), x('triceps-polia', 2, 12, 15), x('prancha-inclinada', 2, 20, 30)],
  B: [x('stiff-halteres', 3, 10, 12), x('mesa-flexora', 3, 12, 15), x('remada-baixa', 3, 10, 12), x('desenvolvimento-sentada', 3, 10, 12), x('cadeira-extensora', 2, 12, 15), x('rosca', 2, 12, 15), x('pallof', 2, 10, 12)],
  C: [x('agachamento-smith', 3, 10, 12), x('gluteo-polia', 3, 12, 15), x('supino-halteres', 3, 10, 12), x('remada-maquina', 3, 10, 12), x('cadeira-adutora', 2, 12, 15), x('elevacao-lateral', 2, 12, 15), x('abdominal-maquina', 2, 12, 15)],
};

// Inferior e superior (4 a 6 dias). "so4" = só com 4 dias; com 5 ou 6, o core
// vai para o dia de Cardio + core e a elevação lateral sai.
const DIVIDIDO = {
  A: [x('agachamento-banco', 3, 10, 12), x('cadeira-extensora', 2, 12, 15), x('elevacao-pelvica', 3, 10, 12), x('cadeira-abdutora', 2, 12, 15), x('panturrilha', 2, 12, 15), x('prancha-inclinada', 2, 20, 30, { so4: true })],
  B: [x('puxada-frente', 3, 10, 12), x('supino-maquina', 3, 10, 12), x('remada-baixa', 3, 10, 12), x('desenvolvimento-sentada', 3, 10, 12), x('rosca', 2, 12, 15), x('elevacao-lateral', 2, 12, 15, { so4: true })],
  C: [x('stiff-halteres', 3, 10, 12), x('agachamento-smith', 3, 10, 12), x('mesa-flexora', 2, 12, 15), x('gluteo-polia', 2, 12, 15), x('cadeira-adutora', 2, 12, 15), x('pallof', 2, 10, 12, { so4: true })],
  D: [x('remada-maquina', 3, 10, 12), x('supino-halteres', 3, 10, 12), x('puxada-frente', 3, 10, 12), x('face-pull', 2, 12, 15), x('triceps-polia', 2, 12, 15), x('abdominal-maquina', 2, 12, 15, { so4: true })],
  E: [x('prancha-inclinada', 2, 20, 30), x('pallof', 2, 10, 12), x('abdominal-maquina', 2, 12, 15)],
  F: [],
};

const FOCOS = {
  inteiro: { A: 'Corpo inteiro', B: 'Corpo inteiro', C: 'Corpo inteiro' },
  dividido: {
    A: 'Inferior A: pernas e glúteo',
    B: 'Superior A: costas, peito e braço',
    C: 'Inferior B: posterior e glúteo',
    D: 'Superior B: costas, peito e ombro',
    E: 'Cardio + core',
    F: 'Cardio longo',
  },
};

// Opções por dias na semana: sequência da fila, tempo e cardio de cada treino.
export const OPCOES = {
  1: { divisao: 'inteiro', sequencia: ['A'], tempo: '1h30', cardio: [30, 40], intervalado: null, nome: 'Corpo inteiro, 1 treino', descricao: 'Para semana muito corrida: só o Treino A. Não serve de rotina.' },
  2: { divisao: 'inteiro', sequencia: ['A', 'B'], tempo: '1h30', cardio: [30, 40], intervalado: 'B', nome: 'Corpo inteiro em 2 treinos', descricao: 'A e B trabalham o corpo todo. Se der, some 2 cardios de 30 min em outros dias.' },
  3: { divisao: 'inteiro', sequencia: ['A', 'B', 'C'], tempo: '1h20', cardio: [25, 30], intervalado: 'C', nome: 'Corpo inteiro em 3 treinos', descricao: 'A, B e C trabalham o corpo todo, com exercícios diferentes. É o jeito de começar.' },
  4: { divisao: 'dividido', sequencia: ['A', 'B', 'C', 'D'], tempo: '1h10', cardio: [25, 30], intervalado: 'D', nome: 'Inferior e superior', descricao: 'Dois treinos de pernas e dois de tronco, alternados. Para depois de 6 a 8 semanas de constância.' },
  5: { divisao: 'dividido', sequencia: ['A', 'B', 'E', 'C', 'D'], tempo: '1h', cardio: [20, 25], intervalado: 'D', nome: 'Inferior, superior e cardio', descricao: 'Os 4 treinos e um dia de Cardio + core no meio. Para quando 4 dias já estiverem fáceis.' },
  6: { divisao: 'dividido', sequencia: ['A', 'B', 'E', 'C', 'D', 'F'], tempo: '1h', cardio: [20, 25], intervalado: 'D', nome: '5 dias + cardio longo', descricao: 'Só com folga na rotina, e sempre com 1 dia de descanso.' },
};

// Dias a mais na semana. Depois que ela faz os treinos da semana, o botão
// "Adicionar treino" do Início traz o próximo desta ordem, conforme os dias do
// ciclo. Com 1 ou 2 dias, entra o C e depois o A e o B de novo; com 3, um
// Inferior e depois um Superior (A e B se alternam a cada vez que ela
// adiciona). O 6º treino da semana é sempre o Cardio longo, e o 7º dia é
// descanso. O treino adicionado vale só para aquela semana.
const inteiro = (id) => ({ divisao: 'inteiro', id });
const dividido = (id) => ({ divisao: 'dividido', id });

export const DIAS_A_MAIS = {
  1: [inteiro('B'), inteiro('C'), inteiro('A'), inteiro('B'), dividido('F')],
  2: [inteiro('C'), inteiro('A'), inteiro('B'), dividido('F')],
  3: [dividido('inferior'), dividido('superior'), dividido('F')],
  4: [dividido('E'), dividido('F')],
  5: [dividido('F')],
  6: [],
};

export const MAXIMO_DE_TREINOS_NA_SEMANA = 6;

// Inferior e Superior que entram como dia a mais numa semana de corpo inteiro
// (versão de 4 dias). Ganham nome próprio e as anilhas I e S, para não se
// confundirem com os treinos A, B e C de corpo inteiro.
export const GRUPOS_A_MAIS = { inferior: ['A', 'C'], superior: ['B', 'D'] };

export const DIVIDIDO_A_MAIS = {
  A: { letra: 'I', nome: 'Inferior A', foco: 'Pernas e glúteo' },
  B: { letra: 'S', nome: 'Superior A', foco: 'Costas, peito e braço' },
  C: { letra: 'I', nome: 'Inferior B', foco: 'Posterior e glúteo' },
  D: { letra: 'S', nome: 'Superior B', foco: 'Costas, peito e ombro' },
};

// Dias só de cardio (5 e 6 dias).
export const DIAS_DE_CARDIO = {
  E: { chave: 'core', minutos: [40, 45], primeiro: true, como: 'Alterne bike e elíptico, começando pela bike. Depois, o core.' },
  F: { chave: 'longo', minutos: [45, 55], primeiro: true, como: 'Bike, elíptico ou hidroginástica, tudo em ritmo moderado.' },
};

export const DESCANSO = { segundos: [60, 90] };

export function linhasDoTreino(divisao, id) {
  return (divisao === 'inteiro' ? CORPO_INTEIRO : DIVIDIDO)[id] ?? [];
}

export function focoDoTreino(divisao, id) {
  return FOCOS[divisao][id];
}
