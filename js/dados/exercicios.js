// Banco de exercícios — EXEMPLO, só para o sistema funcionar.
// Os exercícios reais dela entram depois. O que importa aqui é a estrutura:
//
//   id          identificador fixo (a progressão de carga vai ser guardada por ele)
//   nome        como aparece para ela
//   padrao      padrão de movimento (lista em PADROES, no arquivo modelos.js)
//   grupo       região trabalhada, em linguagem simples
//   requer      equipamentos necessários ([] = só o peso do corpo)
//   medida      'reps' (repetições) ou 'segundos' (isometria, como a prancha)
//   porLado     true quando é feito um lado de cada vez
//   incremento  quanto a carga sobe por vez, em kg (usado na progressão, próxima etapa)
//
// A ordem dentro de cada padrão importa: o gerador usa os exercícios em
// rodízio, começando pelo primeiro da lista.

export const EXERCICIOS = [
  // Agachar
  { id: 'agachamento-livre', nome: 'Agachamento livre', padrao: 'agachar', grupo: 'Pernas e glúteos', requer: ['barra'], medida: 'reps', incremento: 2 },
  { id: 'leg-press', nome: 'Leg press 45°', padrao: 'agachar', grupo: 'Pernas e glúteos', requer: ['maquina'], medida: 'reps', incremento: 5 },
  { id: 'agachamento-goblet', nome: 'Agachamento goblet', padrao: 'agachar', grupo: 'Pernas e glúteos', requer: ['halter'], medida: 'reps', incremento: 2 },
  { id: 'agachamento-corpo', nome: 'Agachamento com o peso do corpo', padrao: 'agachar', grupo: 'Pernas e glúteos', requer: [], medida: 'reps', incremento: 0 },

  // Dobrar o quadril
  { id: 'elevacao-pelvica', nome: 'Elevação pélvica', padrao: 'quadril', grupo: 'Glúteos', requer: ['barra'], medida: 'reps', incremento: 2 },
  { id: 'stiff-halteres', nome: 'Stiff com halteres', padrao: 'quadril', grupo: 'Posterior da coxa e glúteos', requer: ['halter'], medida: 'reps', incremento: 2 },
  { id: 'mesa-flexora', nome: 'Mesa flexora', padrao: 'quadril', grupo: 'Posterior da coxa', requer: ['maquina'], medida: 'reps', incremento: 5 },
  { id: 'ponte-gluteo', nome: 'Ponte de glúteo', padrao: 'quadril', grupo: 'Glúteos', requer: [], medida: 'reps', incremento: 0 },

  // Perna, um lado de cada vez
  { id: 'afundo-halteres', nome: 'Afundo com halteres', padrao: 'unilateral', grupo: 'Pernas e glúteos', requer: ['halter'], medida: 'reps', porLado: true, incremento: 2 },
  { id: 'agachamento-bulgaro', nome: 'Agachamento búlgaro', padrao: 'unilateral', grupo: 'Pernas e glúteos', requer: ['halter'], medida: 'reps', porLado: true, incremento: 2 },
  { id: 'passada', nome: 'Passada caminhando', padrao: 'unilateral', grupo: 'Pernas e glúteos', requer: [], medida: 'reps', porLado: true, incremento: 0 },
  { id: 'subida-banco', nome: 'Subida no banco', padrao: 'unilateral', grupo: 'Pernas e glúteos', requer: [], medida: 'reps', porLado: true, incremento: 0 },

  // Empurrar à frente
  { id: 'supino-halteres', nome: 'Supino reto com halteres', padrao: 'empurrar-h', grupo: 'Peito e braços', requer: ['halter'], medida: 'reps', incremento: 2 },
  { id: 'supino-maquina', nome: 'Supino na máquina', padrao: 'empurrar-h', grupo: 'Peito e braços', requer: ['maquina'], medida: 'reps', incremento: 5 },
  { id: 'flexao', nome: 'Flexão de braço', padrao: 'empurrar-h', grupo: 'Peito e braços', requer: [], medida: 'reps', incremento: 0 },

  // Empurrar para cima
  { id: 'desenvolvimento-halteres', nome: 'Desenvolvimento com halteres', padrao: 'empurrar-v', grupo: 'Ombros', requer: ['halter'], medida: 'reps', incremento: 2 },
  { id: 'desenvolvimento-maquina', nome: 'Desenvolvimento na máquina', padrao: 'empurrar-v', grupo: 'Ombros', requer: ['maquina'], medida: 'reps', incremento: 5 },
  { id: 'elevacao-lateral', nome: 'Elevação lateral', padrao: 'empurrar-v', grupo: 'Ombros', requer: ['halter'], medida: 'reps', incremento: 1 },

  // Puxar em direção ao corpo (remadas)
  { id: 'remada-baixa', nome: 'Remada baixa na polia', padrao: 'puxar-h', grupo: 'Costas', requer: ['polia'], medida: 'reps', incremento: 5 },
  { id: 'remada-unilateral', nome: 'Remada unilateral com halter', padrao: 'puxar-h', grupo: 'Costas', requer: ['halter'], medida: 'reps', porLado: true, incremento: 2 },
  { id: 'remada-elastico', nome: 'Remada com elástico', padrao: 'puxar-h', grupo: 'Costas', requer: ['elastico'], medida: 'reps', incremento: 0 },

  // Puxar de cima para baixo (puxadas)
  { id: 'puxada-frente', nome: 'Puxada na frente', padrao: 'puxar-v', grupo: 'Costas', requer: ['polia'], medida: 'reps', incremento: 5 },
  { id: 'puxada-supinada', nome: 'Puxada supinada', padrao: 'puxar-v', grupo: 'Costas e bíceps', requer: ['polia'], medida: 'reps', incremento: 5 },
  { id: 'puxada-elastico', nome: 'Puxada com elástico', padrao: 'puxar-v', grupo: 'Costas', requer: ['elastico'], medida: 'reps', incremento: 0 },

  // Core
  { id: 'prancha', nome: 'Prancha', padrao: 'core', grupo: 'Abdômen', requer: [], medida: 'segundos', incremento: 0 },
  { id: 'prancha-lateral', nome: 'Prancha lateral', padrao: 'core', grupo: 'Abdômen', requer: [], medida: 'segundos', porLado: true, incremento: 0 },
  { id: 'dead-bug', nome: 'Dead bug', padrao: 'core', grupo: 'Abdômen', requer: [], medida: 'reps', porLado: true, incremento: 0 },
];

const porId = new Map(EXERCICIOS.map((exercicio) => [exercicio.id, exercicio]));

export function buscarExercicio(id) {
  return porId.get(id) ?? null;
}
