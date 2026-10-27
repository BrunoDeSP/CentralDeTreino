import { html } from './html.js';
import { buscarExercicio } from '../dados/exercicios.js';

// Cada treino tem a cor de uma anilha olímpica: A vermelha, B azul,
// C amarela, D verde, E branca. A cor acompanha o treino no app inteiro.

// Anilha com a letra do treino.
// tamanho: 'p' | 'm' | 'g' | 'xg'
// estado:  'cheio' | 'feito' | 'proximo' | 'depois'
export function anilha(letra, { tamanho = 'm', estado = 'cheio', nova = false } = {}) {
  const classes = ['anilha', `anilha--${tamanho}`, `anilha--${estado}`, nova ? 'anilha--nova' : ''].join(' ');
  return html`
    <span class="${classes}" data-anilha="${letra.toLowerCase()}" aria-hidden="true">
      ${letra}
      ${estado === 'feito' ? html`<svg class="anilha-marca" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" /><path d="M4.6 8.3l2.2 2.2 4.6-4.8" /></svg>` : ''}
    </span>`;
}

// A semana como uma barra carregada: anilhas cheias são treinos feitos,
// a com contorno é o próximo e as vazadas ainda vêm pela fila.
export function barraDaSemana(resumo, { destaque = null } = {}) {
  const descricao = `${resumo.feitos} de ${resumo.meta} treinos feitos nesta semana`;
  return html`
    <div class="barra" role="img" aria-label="${descricao}">
      <span class="barra-haste" aria-hidden="true"></span>
      <span class="barra-anilhas">
        ${resumo.plano.map((item) =>
          anilha(item.treinoId, {
            tamanho: item.status === 'proximo' ? 'g' : 'm',
            estado: item.status,
            nova: Boolean(destaque) && item.sessaoId === destaque,
          }),
        )}
      </span>
    </div>`;
}

export function barraVazia() {
  return html`<div class="barra barra--vazia" aria-hidden="true"><span class="barra-haste"></span></div>`;
}

// Cabeçalho com a anilha grande e o nome do treino.
export function cabecalhoDoTreino(treino, nivelTitulo = 'h2') {
  const titulo = nivelTitulo === 'h1'
    ? html`<h1 class="treino-nome">${treino.nome}</h1>`
    : html`<h2 class="treino-nome">${treino.nome}</h2>`;
  return html`
    <header class="treino-cabeca">
      ${anilha(treino.id, { tamanho: 'xg' })}
      <div>
        ${titulo}
        <p class="treino-foco">${treino.foco}</p>
      </div>
    </header>`;
}

// A ficha de treino: exercícios na ordem em que devem ser feitos.
export function ficha(treino) {
  return html`
    <ol class="ficha">
      ${treino.exercicios.map((item, indice) => linhaDaFicha(item, indice, treino.formato))}
    </ol>`;
}

function linhaDaFicha(item, indice, formato) {
  const exercicio = buscarExercicio(item.exercicioId);
  const nome = exercicio?.nome ?? 'Sem exercício para este local';
  const grupo = exercicio?.grupo ?? 'Adicione um exercício deste tipo ao banco';
  return html`
    <li class="ficha-linha">
      <span class="ficha-numero">${indice + 1}</span>
      <span class="ficha-exercicio">
        <span class="ficha-nome">${nome}</span>
        <span class="ficha-grupo">${grupo}</span>
      </span>
      <span class="ficha-dose">${dose(item, exercicio, formato)}</span>
    </li>`;
}

function dose(item, exercicio, formato) {
  const { min, max, medida } = item.alvo;
  const faixa = min === max ? `${min}` : `${min}–${max}`;
  const unidade = medida === 'segundos' ? ' s' : '';
  const principal = formato === 'circuito' ? `${faixa}${unidade}` : `${item.series} × ${faixa}${unidade}`;
  return html`
    <strong>${principal}</strong>
    ${exercicio?.porLado ? html`<span class="ficha-lado">cada lado</span>` : ''}`;
}

// Como fazer, descanso e cardio.
export function detalhesDoTreino(treino) {
  const circuito = treino.formato === 'circuito';
  const linhas = [];

  if (circuito) {
    linhas.push(['Como fazer', `Um exercício atrás do outro, ${treino.voltas} voltas`]);
  }
  if (treino.descanso) {
    const [min, max] = treino.descanso.segundos;
    linhas.push(['Descanso', `${min}–${max} s entre ${circuito ? 'voltas' : 'séries'}`]);
  }
  if (treino.cardio) {
    const [min, max] = treino.cardio.minutos;
    linhas.push(['Cardio no final', `${min}–${max} min, ritmo ${treino.cardio.ritmo}`]);
  }
  if (linhas.length === 0) return '';

  return html`
    <dl class="detalhes">
      ${linhas.map(([titulo, valor]) => html`<div><dt>${titulo}</dt><dd>${valor}</dd></div>`)}
    </dl>`;
}

// Semanas do ciclo como segmentos: feitas, atual e futuras.
export function semanasDoCiclo(total, atual) {
  const segmentos = Array.from({ length: total }, (_, i) => {
    const numero = i + 1;
    const classe = numero < atual ? 'feita' : numero === atual ? 'atual' : '';
    return html`<span class="${classe}"></span>`;
  });
  const descricao = atual > total ? 'Todas as semanas do ciclo passaram' : `Semana ${atual} de ${total}`;
  return html`<div class="semanas" role="img" aria-label="${descricao}">${segmentos}</div>`;
}
