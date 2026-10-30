// Banco de exercícios do plano (PDF "Treino para emagrecimento").
//
//   id           identificador fixo: a carga fica guardada por ele, em qualquer treino e ciclo
//   nome         como aparece para ela
//   grupo        região trabalhada, em linguagem simples
//   regiao       'inferiores' | 'superiores' | 'core' (aba Exercícios e botão do joelho)
//   tipo         'composto' | 'isolado' | 'core' (na Consolidação, os 2 primeiros compostos ganham 1 série)
//   status       'liberado' (entra nos treinos) | 'alternativa' (só pela troca) | 'testar' | 'fora'
//   medida       'reps' ou 'segundos'
//   porLado      true quando é feito um lado de cada vez
//   incremento   quanto a carga sobe por vez, em kg (0 = sem carga: peso do corpo ou elástico)
//   requer       equipamentos ([] = só o peso do corpo)
//   dica         como fazer, mostrada durante o treino
//   alternativa  id do exercício para quando o aparelho estiver ocupado (tem carga própria)
//   alvo         só nas alternativas medidas de outro jeito que o exercício principal
//
// Para liberar ou tirar um exercício, mude o status. Os que saíram ficam como
// 'fora' para o histórico não sumir.

const e = (id, nome, grupo, regiao, tipo, incremento, requer, dica, extras = {}) => ({
  id, nome, grupo, regiao, tipo, incremento, requer, dica, status: 'liberado', medida: 'reps', porLado: false, ...extras,
});
const alt = (id, nome, grupo, regiao, tipo, incremento, requer, dica, extras = {}) =>
  e(id, nome, grupo, regiao, tipo, incremento, requer, dica, { status: 'alternativa', ...extras });

export const EXERCICIOS = [
  // --- Pernas e glúteo ---
  e('agachamento-banco', 'Agachamento no banco', 'Pernas e glúteo', 'inferiores', 'composto', 2, ['halter'],
    'Sentar e levantar. Banco alto no começo; desça só até onde não incomoda. Dá para começar sem peso e depois segurar um halter no peito.',
    { alternativa: 'agachamento-smith' }),
  e('agachamento-smith', 'Agachamento no smith', 'Pernas e glúteo', 'inferiores', 'composto', 5, ['barra'],
    'Pés um pouco à frente da barra e amplitude confortável. O banco atrás serve de limite.',
    { alternativa: 'agachamento-banco' }),
  e('cadeira-extensora', 'Cadeira extensora', 'Quadríceps', 'inferiores', 'isolado', 5, ['maquina'],
    'Movimento controlado, sem tranco no final. Se incomodar, faça só de 90° a 45°.',
    { alternativa: 'extensao-caneleira' }),
  e('mesa-flexora', 'Mesa ou cadeira flexora', 'Posterior de coxa', 'inferiores', 'isolado', 5, ['maquina'],
    'Subir e descer devagar.', { alternativa: 'flexao-caneleira' }),
  e('elevacao-pelvica', 'Elevação pélvica', 'Glúteo', 'inferiores', 'composto', 5, ['maquina'],
    'Máquina ou barra com proteção; joelhos a cerca de 90° no topo.', { alternativa: 'pull-through' }),
  e('stiff-halteres', 'Stiff com halteres', 'Posterior e glúteo', 'inferiores', 'composto', 2, ['halter'],
    'Joelhos levemente dobrados e parados; o quadril vai para trás. Comece leve.', { alternativa: 'stiff-barra' }),
  e('cadeira-abdutora', 'Cadeira abdutora', 'Glúteo médio', 'inferiores', 'isolado', 5, ['maquina'],
    'Abrir e voltar devagar. Ajuda a estabilizar o joelho.', { alternativa: 'abducao-miniband' }),
  e('cadeira-adutora', 'Cadeira adutora', 'Parte interna da coxa', 'inferiores', 'isolado', 5, ['maquina'],
    'Amplitude confortável.', { alternativa: 'aducao-polia' }),
  e('gluteo-polia', 'Glúteo na polia ou na máquina', 'Glúteo', 'inferiores', 'isolado', 2.5, ['polia'],
    'Em pé, com apoio; sem ajoelhar no chão.', { alternativa: 'coice-caneleira', porLado: true }),
  e('panturrilha', 'Panturrilha sentada ou no aparelho', 'Panturrilha', 'inferiores', 'isolado', 5, ['maquina'],
    'Pausa curta em cima e embaixo.', { alternativa: 'panturrilha-halter' }),

  // --- Costas, peito, ombros e braços ---
  e('puxada-frente', 'Puxada frente', 'Costas', 'superiores', 'composto', 2.5, ['polia'],
    'Puxar até o queixo, cotovelos para baixo.', { alternativa: 'pullover-polia' }),
  e('remada-baixa', 'Remada baixa', 'Costas', 'superiores', 'composto', 2.5, ['polia'],
    'Tronco parado; puxar até a barriga.', { alternativa: 'remada-halteres-apoiada' }),
  e('remada-maquina', 'Remada na máquina', 'Costas', 'superiores', 'composto', 2.5, ['maquina'],
    'Peito apoiado quando a máquina permitir.', { alternativa: 'remada-baixa' }),
  e('supino-maquina', 'Supino na máquina', 'Peito', 'superiores', 'composto', 2.5, ['maquina'],
    'Costas bem apoiadas; empurrar sem travar os cotovelos.', { alternativa: 'supino-halteres' }),
  e('supino-halteres', 'Supino com halteres', 'Peito', 'superiores', 'composto', 2, ['halter'],
    'Descer até a linha do peito, cotovelos um pouco abaixo dos ombros.', { alternativa: 'supino-maquina' }),
  e('desenvolvimento-sentada', 'Desenvolvimento sentada', 'Ombros', 'superiores', 'composto', 2, ['halter'],
    'Máquina ou halteres, com encosto.', { alternativa: 'desenvolvimento-smith' }),
  e('elevacao-lateral', 'Elevação lateral', 'Ombros', 'superiores', 'isolado', 1, ['halter'],
    'Carga leve, sem balançar o corpo.', { alternativa: 'elevacao-lateral-polia' }),
  e('face-pull', 'Face pull na polia', 'Ombros e postura', 'superiores', 'isolado', 2.5, ['polia'],
    'Puxar a corda em direção ao rosto.', { alternativa: 'voador-invertido' }),
  e('rosca', 'Rosca direta ou alternada', 'Bíceps', 'superiores', 'isolado', 1, ['halter'],
    'Cotovelos parados ao lado do corpo.', { alternativa: 'rosca-polia' }),
  e('triceps-polia', 'Tríceps na polia', 'Tríceps', 'superiores', 'isolado', 2.5, ['polia'],
    'Cotovelos colados ao corpo.', { alternativa: 'triceps-frances' }),

  // --- Core ---
  e('prancha-inclinada', 'Prancha inclinada', 'Abdômen', 'core', 'core', 0, [],
    'Mãos no banco. Evolua para o chão aos poucos; evite apoiar os joelhos se incomodar.',
    { alternativa: 'dead-bug', medida: 'segundos' }),
  e('pallof', 'Pallof press', 'Abdômen', 'core', 'core', 2.5, ['polia'],
    'Segure a polia à frente resistindo à rotação.', { alternativa: 'pallof-elastico', porLado: true }),
  e('abdominal-maquina', 'Abdominal na máquina', 'Abdômen', 'core', 'core', 2.5, ['maquina'],
    'Para força de core, não para “secar barriga”.', { alternativa: 'abdominal-colchonete' }),

  // --- Alternativas (aparelho ocupado) ---
  alt('extensao-caneleira', 'Extensão de joelho com caneleira', 'Quadríceps', 'inferiores', 'isolado', 1, [],
    'Sentada no banco, estender o joelho devagar; se incomodar, só de 90° a 45°.'),
  alt('flexao-caneleira', 'Flexão de joelho com caneleira', 'Posterior de coxa', 'inferiores', 'isolado', 1, [],
    'De bruços no banco, levar o calcanhar em direção ao glúteo sem tirar o quadril do banco.'),
  alt('pull-through', 'Pull-through na polia baixa', 'Glúteo', 'inferiores', 'composto', 2.5, ['polia'],
    'De costas para a polia, corda entre as pernas; o quadril vai para trás e volta contraindo o glúteo.'),
  alt('stiff-barra', 'Stiff com barra ou kettlebell', 'Posterior e glúteo', 'inferiores', 'composto', 2, ['barra'],
    'Joelhos levemente dobrados e parados; o quadril vai para trás.'),
  alt('abducao-miniband', 'Abdução sentada com miniband', 'Glúteo médio', 'inferiores', 'isolado', 0, ['elastico'],
    'Elástico logo acima dos joelhos; abrir os joelhos e voltar devagar.'),
  alt('aducao-polia', 'Adução na polia baixa, em pé', 'Parte interna da coxa', 'inferiores', 'isolado', 2.5, ['polia'],
    'Tornozeleira na polia e mão firme no aparelho; trazer a perna para a frente da outra.', { porLado: true }),
  alt('coice-caneleira', 'Coice com caneleira, em pé', 'Glúteo', 'inferiores', 'isolado', 1, [],
    'Mão firme num apoio; levar a perna para trás sem arquear a lombar.', { porLado: true }),
  alt('panturrilha-halter', 'Panturrilha sentada com halter', 'Panturrilha', 'inferiores', 'isolado', 2, ['halter'],
    'Halter sobre os joelhos e pontas dos pés numa anilha; subir os calcanhares e pausar em cima.'),
  alt('pullover-polia', 'Pullover na polia alta, em pé', 'Costas', 'superiores', 'composto', 2.5, ['polia'],
    'Braços quase estendidos; levar a barra até as coxas.'),
  alt('remada-halteres-apoiada', 'Remada com halteres, peito apoiado', 'Costas', 'superiores', 'composto', 2, ['halter'],
    'Peito no banco inclinado; puxar os cotovelos para trás sem tirar o peito do banco.'),
  alt('desenvolvimento-smith', 'Desenvolvimento no smith, sentada', 'Ombros', 'superiores', 'composto', 2.5, ['barra'],
    'Banco com encosto; a barra desce até a altura do queixo.'),
  alt('elevacao-lateral-polia', 'Elevação lateral na polia', 'Ombros', 'superiores', 'isolado', 2.5, ['polia'],
    'Um braço por vez, puxando de baixo até a altura do ombro, sem balançar o corpo.', { porLado: true }),
  alt('voador-invertido', 'Voador invertido', 'Ombros e postura', 'superiores', 'isolado', 2.5, ['maquina'],
    'Crucifixo invertido na máquina: abrir os braços para trás juntando as escápulas.'),
  alt('rosca-polia', 'Rosca na polia baixa', 'Bíceps', 'superiores', 'isolado', 2.5, ['polia'],
    'Cotovelos parados ao lado do corpo.'),
  alt('triceps-frances', 'Tríceps francês com halter, sentada', 'Tríceps', 'superiores', 'isolado', 1, ['halter'],
    'Encosto alto; o halter desce atrás da cabeça e sobe sem abrir os cotovelos.'),
  alt('dead-bug', 'Dead bug no colchonete', 'Abdômen', 'core', 'core', 0, [],
    'De costas, descer braço e perna opostos devagar, com a lombar colada no chão.',
    { porLado: true, alvo: { min: 8, max: 12, medida: 'reps' } }),
  alt('pallof-elastico', 'Pallof com elástico', 'Abdômen', 'core', 'core', 0, ['elastico'],
    'Elástico preso num ponto firme, na altura do peito.', { porLado: true }),
  alt('abdominal-colchonete', 'Abdominal curto no colchonete', 'Abdômen', 'core', 'core', 0, [],
    'Pés apoiados; tirar só os ombros do chão.'),

  // --- Fora do plano (ficam só para o histórico do banco de exemplo) ---
  ...[
    ['agachamento-livre', 'Agachamento livre', 'inferiores', 2],
    ['leg-press', 'Leg press 45°', 'inferiores', 5],
    ['agachamento-goblet', 'Agachamento goblet', 'inferiores', 2],
    ['agachamento-corpo', 'Agachamento com o peso do corpo', 'inferiores', 0],
    ['ponte-gluteo', 'Ponte de glúteo', 'inferiores', 0],
    ['afundo-halteres', 'Afundo com halteres', 'inferiores', 2],
    ['agachamento-bulgaro', 'Agachamento búlgaro', 'inferiores', 2],
    ['passada', 'Passada caminhando', 'inferiores', 0],
    ['subida-banco', 'Subida no banco', 'inferiores', 0],
    ['flexao', 'Flexão de braço', 'superiores', 0],
    ['desenvolvimento-halteres', 'Desenvolvimento com halteres', 'superiores', 2],
    ['desenvolvimento-maquina', 'Desenvolvimento na máquina', 'superiores', 5],
    ['remada-unilateral', 'Remada unilateral com halter', 'superiores', 2],
    ['remada-elastico', 'Remada com elástico', 'superiores', 0],
    ['puxada-supinada', 'Puxada supinada', 'superiores', 5],
    ['puxada-elastico', 'Puxada com elástico', 'superiores', 0],
    ['prancha', 'Prancha', 'core', 0, { medida: 'segundos' }],
    ['prancha-lateral', 'Prancha lateral', 'core', 0, { medida: 'segundos', porLado: true }],
  ].map(([id, nome, regiao, incremento, extras = {}]) =>
    e(id, nome, 'Fora do plano atual', regiao, 'isolado', incremento, incremento ? ['halter'] : [], '', { status: 'fora', ...extras })),
];

const porId = new Map(EXERCICIOS.map((exercicio) => [exercicio.id, exercicio]));

export function buscarExercicio(id) {
  return porId.get(id) ?? null;
}

// Joelho: o botão "Joelho incomodou" aparece nos exercícios de perna.
export function ehDePerna(exercicio) {
  return exercicio?.regiao === 'inferiores';
}
