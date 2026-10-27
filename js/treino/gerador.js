import { EXERCICIOS } from '../dados/exercicios.js';
import { MODELOS, PADRAO_DO_TREINO, SEGUNDOS_PADRAO } from '../dados/modelos.js';
import { LOCAIS } from '../config.js';

// Monta os treinos de um ciclo a partir da quantidade de dias por semana.
//
// Cada padrão de movimento usa os exercícios do banco em rodízio ao longo do
// ciclo: a primeira vaga de "agachar" pega o 1º agachamento disponível, a
// segunda pega o 2º, e assim por diante. Assim o Treino A e o Treino C não
// repetem os mesmos exercícios.
export function montarTreinos({ diasPorSemana, local }) {
  const modelo = MODELOS[diasPorSemana];
  if (!modelo) throw new Error(`Não existe modelo para ${diasPorSemana} dia(s) por semana.`);

  const disponiveis = LOCAIS[local]?.equipamentos ?? [];
  const rodizio = new Map(); // padrão -> próxima posição a usar

  return modelo.treinos.map((base) => {
    const usadosNoTreino = new Set();

    const exercicios = base.vagas.map((vaga) => {
      const exercicio = escolherExercicio(vaga.padrao, disponiveis, rodizio, usadosNoTreino);
      if (exercicio) usadosNoTreino.add(exercicio.id);
      return prescrever(vaga, exercicio);
    });

    return {
      id: base.id,
      nome: `Treino ${base.id}`,
      foco: base.foco,
      formato: base.formato ?? PADRAO_DO_TREINO.formato,
      voltas: base.voltas ?? PADRAO_DO_TREINO.voltas,
      descanso: base.descanso ?? PADRAO_DO_TREINO.descanso,
      cardio: base.cardio ?? PADRAO_DO_TREINO.cardio,
      exercicios,
    };
  });
}

// Prévia usada na tela de novo ciclo (sem escolher exercícios).
export function resumoDoModelo(diasPorSemana) {
  const modelo = MODELOS[diasPorSemana];
  if (!modelo) return null;
  return {
    nome: modelo.nome,
    descricao: modelo.descricao,
    treinos: modelo.treinos.map(({ id, foco }) => ({ id, foco })),
  };
}

function candidatos(padrao, disponiveis) {
  return EXERCICIOS.filter(
    (exercicio) => exercicio.padrao === padrao && exercicio.requer.every((item) => disponiveis.includes(item)),
  );
}

function escolherExercicio(padrao, disponiveis, rodizio, usadosNoTreino) {
  const lista = candidatos(padrao, disponiveis);
  if (lista.length === 0) return null;

  const inicio = rodizio.get(padrao) ?? 0;
  // Pula exercícios que já estão neste mesmo treino (ex.: duas vagas de "quadril").
  for (let passo = 0; passo < lista.length; passo++) {
    const opcao = lista[(inicio + passo) % lista.length];
    if (!usadosNoTreino.has(opcao.id)) {
      rodizio.set(padrao, inicio + passo + 1);
      return opcao;
    }
  }
  // Banco pequeno demais para não repetir: repete o exercício da vez.
  rodizio.set(padrao, inicio + 1);
  return lista[inicio % lista.length];
}

function prescrever(vaga, exercicio) {
  const emSegundos = exercicio?.medida === 'segundos';
  const [min, max] = emSegundos ? (vaga.segundos ?? SEGUNDOS_PADRAO) : vaga.reps;
  return {
    exercicioId: exercicio?.id ?? null, // null = nenhum exercício do banco serve para este local
    padrao: vaga.padrao,
    series: vaga.series,
    alvo: { min, max, medida: emSegundos ? 'segundos' : 'reps' },
  };
}
