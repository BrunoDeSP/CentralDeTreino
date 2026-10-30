// Ajustes gerais do sistema de treino.

export const CONFIG = {
  diasPorSemana: { min: 1, max: 6, padrao: 3 },
  semanasPorCiclo: { opcoes: [1, 2, 3, 4, 5], padrao: 4 }, // até 5 semanas, mais ou menos um mês
  // Local usado ao montar o ciclo enquanto não definimos onde ela treina.
  localPadrao: 'academia',
  // Limites do tempo de pausa (em segundos) na tela de Configurações.
  pausa: { min: 15, max: 300, passo: 15 },
};

// Cópia na planilha (Google Planilhas + Apps Script). Tempos em milissegundos.
export const PLANILHA = {
  esperaDepoisDeMudar: 8000, // envia a cópia 8 s depois da última mudança
  tempoLimite: 45000, // desiste se a planilha não responder neste tempo
  novasTentativas: [60000, 300000, 900000], // sem conexão: tenta de novo em 1, 5 e 15 min
};

// Valores iniciais da tela de Configurações.
export const CONFIGURACOES_PADRAO = {
  pausaSegundos: 90,
  pausaAutomatica: false, // começar a pausa sozinha ao concluir uma série
  alertaFimDaPausa: true, // som e vibração quando a pausa acaba
  telaLigada: true, // manter a tela ligada durante o treino
  checkupFeito: false, // o intervalado só entra depois do check-up médico
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
