import { buscarExercicio } from '../dados/exercicios.js';
import { OPCOES, DIAS_DE_CARDIO, DESCANSO, linhasDoTreino, focoDoTreino } from '../dados/modelos.js';

// Monta os treinos de um ciclo a partir dos dias por semana e da fase.
//
// As tabelas de modelos.js trazem as séries da Construção. Aqui elas viram as
// da fase: Adaptação = 2 séries em tudo; Consolidação = +1 nos dois primeiros
// compostos (até 4); semana leve = metade das séries da Consolidação.

export function montarTreinos({ diasPorSemana, fase = 'construcao' }) {
  const opcao = OPCOES[diasPorSemana];
  if (!opcao) throw new Error(`Não existe plano para ${diasPorSemana} dia(s) por semana.`);
  return opcao.sequencia.map((id) => montarTreino(id, diasPorSemana, opcao, fase));
}

function montarTreino(id, dias, opcao, fase) {
  const diaDeCardio = DIAS_DE_CARDIO[id];
  const linhas = linhasDoTreino(opcao.divisao, id).filter((linha) => !(linha.so4 && dias >= 5));
  let compostos = 0;
  const exercicios = linhas.map((linha) => {
    const exercicio = buscarExercicio(linha.id);
    const ehComposto = exercicio?.tipo === 'composto';
    const entreOsDois = ehComposto && compostos < 2;
    if (ehComposto) compostos += 1;
    return {
      exercicioId: linha.id,
      series: seriesDaFase(linha.series, fase, entreOsDois),
      alvo: { min: linha.min, max: linha.max, medida: exercicio?.medida === 'segundos' ? 'segundos' : 'reps' },
    };
  });

  const intervalado = fase !== 'leve' && (id === opcao.intervalado || (id === 'E' && fase === 'consolidacao'));
  return {
    id,
    nome: `Treino ${id}`,
    foco: focoDoTreino(opcao.divisao, id),
    tipo: diaDeCardio && exercicios.length === 0 ? 'cardio' : 'musculacao',
    formato: 'series',
    voltas: null,
    descanso: DESCANSO,
    aquecimento: diaDeCardio ? null : dias <= 3 ? 10 : 5,
    cardio: {
      chave: diaDeCardio?.chave ?? 'fim',
      minutos: diaDeCardio?.minutos ?? opcao.cardio,
      ritmo: 'moderado',
      intervalado,
      primeiro: Boolean(diaDeCardio?.primeiro),
      como: diaDeCardio?.como ?? null,
    },
    exercicios,
  };
}

function seriesDaFase(base, fase, entreOsDoisCompostos) {
  if (fase === 'adaptacao') return 2;
  const consolidacao = entreOsDoisCompostos ? Math.min(4, base + 1) : base;
  if (fase === 'consolidacao') return consolidacao;
  if (fase === 'leve') return Math.max(1, Math.ceil(consolidacao / 2));
  return base;
}

// Prévia usada na tela de novo ciclo.
export function resumoDoModelo(diasPorSemana) {
  const opcao = OPCOES[diasPorSemana];
  if (!opcao) return null;
  return {
    nome: opcao.nome,
    descricao: opcao.descricao,
    tempo: opcao.tempo,
    cardio: opcao.cardio,
    treinos: opcao.sequencia.map((id) => ({ id, foco: focoDoTreino(opcao.divisao, id) })),
  };
}
