import { buscarExercicio } from '../dados/exercicios.js';
import {
  OPCOES,
  DIAS_DE_CARDIO,
  DESCANSO,
  DIAS_A_MAIS,
  GRUPOS_A_MAIS,
  DIVIDIDO_A_MAIS,
  linhasDoTreino,
  focoDoTreino,
} from '../dados/modelos.js';

// Monta os treinos de um ciclo a partir dos dias por semana e da fase.
//
// As tabelas de modelos.js trazem as séries da Construção. Aqui elas viram as
// da fase: Adaptação = 2 séries em tudo; Consolidação = +1 nos dois primeiros
// compostos (até 4); semana leve = metade das séries da Consolidação.

export function montarTreinos({ diasPorSemana, fase = 'construcao' }) {
  const opcao = OPCOES[diasPorSemana];
  if (!opcao) throw new Error(`Não existe plano para ${diasPorSemana} dia(s) por semana.`);
  return opcao.sequencia.map((id) => ({
    id,
    letra: id,
    nome: `Treino ${id}`,
    foco: focoDoTreino(opcao.divisao, id),
    ...montarConteudo(id, {
      divisao: opcao.divisao,
      versao: diasPorSemana,
      dias: diasPorSemana,
      fase,
      intervalado: fase !== 'leve' && (id === opcao.intervalado || (id === 'E' && fase === 'consolidacao')),
    }),
  }));
}

// Treino de um dia a mais na semana (botão "Adicionar treino").
//
// - posicao: quantos dias a mais ela já adicionou nesta semana (0 = o primeiro).
// - vezesDoGrupo: quantos Inferiores (ou Superiores) a mais ela já fez no
//   ciclo; decide se agora é o A ou o B.
// - intervaladoLivre: a semana ainda não tem intervalado (só acontece com
//   1 dia por semana, que não tem).
//
// Ele é montado como se ela tivesse escolhido o novo total de dias desde o
// começo: aquecimento e cardio no fim seguem esse total. Inferior e Superior
// usam a versão de 4 dias, com a última linha, já que a semana não tem o dia
// de Cardio + core.
export function montarExtra({ diasPorSemana, fase = 'construcao', posicao, semana, vezesDoGrupo = 0, intervaladoLivre = false, id }) {
  const item = (DIAS_A_MAIS[diasPorSemana] ?? [])[posicao];
  if (!item) return null;
  const total = diasPorSemana + posicao + 1;
  const grupo = GRUPOS_A_MAIS[item.id] ? item.id : null;
  const origem = grupo ? GRUPOS_A_MAIS[grupo][vezesDoGrupo % 2] : item.id;
  const opcaoDoTotal = OPCOES[total];
  const intervaladoPrincipal = intervaladoLivre && opcaoDoTotal?.divisao === item.divisao && opcaoDoTotal.intervalado === origem;
  const intervalado = fase !== 'leve' && (intervaladoPrincipal || (origem === 'E' && fase === 'consolidacao'));
  const nomes = grupo
    ? DIVIDIDO_A_MAIS[origem]
    : { letra: origem, nome: `Treino ${origem}`, foco: focoDoTreino(item.divisao, origem) };

  return {
    id,
    ...nomes,
    ...montarConteudo(origem, { divisao: item.divisao, versao: grupo ? 4 : total, dias: total, fase, intervalado }),
    extra: { semana, posicao, grupo, origem, divisao: item.divisao },
  };
}

// Nomes da ordem dos dias a mais, para mostrar na tela do ciclo.
export function ordemDosDiasAMais(diasPorSemana) {
  return (DIAS_A_MAIS[diasPorSemana] ?? []).map((item) => {
    if (GRUPOS_A_MAIS[item.id]) return item.id === 'inferior' ? 'Inferior' : 'Superior';
    if (item.divisao === 'dividido') return focoDoTreino('dividido', item.id);
    return `Treino ${item.id}`;
  });
}

// Exercícios, séries, aquecimento e cardio de um treino.
// - versao: dias por semana cujas linhas valem (com 5 ou 6, as linhas "so4" saem).
// - dias: dias por semana que decidem o aquecimento e os minutos do cardio no fim.
function montarConteudo(id, { divisao, versao, dias, fase, intervalado }) {
  const diaDeCardio = divisao === 'dividido' ? DIAS_DE_CARDIO[id] : null;
  const linhas = linhasDoTreino(divisao, id).filter((linha) => !(linha.so4 && versao >= 5));
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

  return {
    tipo: diaDeCardio && exercicios.length === 0 ? 'cardio' : 'musculacao',
    formato: 'series',
    voltas: null,
    descanso: DESCANSO,
    aquecimento: diaDeCardio ? null : dias <= 3 ? 10 : 5,
    cardio: {
      chave: diaDeCardio?.chave ?? 'fim',
      minutos: diaDeCardio?.minutos ?? OPCOES[dias].cardio,
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
