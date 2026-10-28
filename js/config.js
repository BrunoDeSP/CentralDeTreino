// Ajustes gerais do sistema de treino.

export const CONFIG = {
  diasPorSemana: { min: 1, max: 5, padrao: 3 },
  semanasPorCiclo: { opcoes: [1, 2, 3, 4, 5], padrao: 4 }, // até 5 semanas, mais ou menos um mês
  // Local usado ao montar o ciclo enquanto não definimos onde ela treina.
  localPadrao: 'academia',
  // Limites do tempo de pausa (em segundos) na tela de Configurações.
  pausa: { min: 15, max: 300, passo: 15 },
};

// Valores iniciais da tela de Configurações.
export const CONFIGURACOES_PADRAO = {
  pausaSegundos: 90,
  pausaAutomatica: false, // começar a pausa sozinha ao concluir uma série
  alertaFimDaPausa: true, // som e vibração quando a pausa acaba
  telaLigada: true, // manter a tela ligada durante o treino
};

// Equipamentos de cada local. Um exercício só entra no treino se tudo o que
// ele precisa (campo "requer" no banco de exercícios) estiver na lista do local.
export const LOCAIS = {
  academia: {
    nome: 'Academia',
    equipamentos: ['barra', 'halter', 'maquina', 'polia', 'elastico'],
  },
  casa: {
    nome: 'Casa',
    equipamentos: [], // por enquanto, só exercícios com o peso do corpo
  },
};
