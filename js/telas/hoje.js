import { html } from '../ui/html.js';
import { barraDaSemana, cabecalhoDoTreino, ficha, detalhesDoTreino } from '../ui/componentes.js';
import { cicloAtivo, proximoTreino, resumoDaSemana, cicloConcluido } from '../treino/regras-do-ciclo.js';
import { dataCurta } from '../util/datas.js';
import { plural } from '../util/texto.js';
import { concluirComAviso, telaSemCiclo } from './comum.js';

// Tela principal: como está a semana e qual é o treino de hoje.

export const titulo = 'Hoje';

export function render(_params, { estado, extras }) {
  const ciclo = cicloAtivo(estado);
  if (!ciclo) return telaSemCiclo(estado);

  const resumo = resumoDaSemana(ciclo);
  const treino = proximoTreino(ciclo);

  return html`
    <h1 class="visualmente-oculto">Hoje</h1>
    ${cicloConcluido(ciclo)
      ? avisoFimDoCiclo(ciclo)
      : html`<p class="contexto">Semana ${resumo.semana.numero} de ${ciclo.semanas}, de ${dataCurta(resumo.semana.inicio)} a ${dataCurta(resumo.semana.fim)}</p>`}

    <section class="semana" aria-label="Sua semana">
      ${barraDaSemana(resumo, { destaque: extras.destaque })}
      <p class="semana-legenda">${legenda(resumo)}</p>
    </section>

    <section class="treino-do-dia" data-anilha="${treino.id.toLowerCase()}">
      ${cabecalhoDoTreino(treino)}
      ${resumo.completa
        ? html`<p class="nota">A meta da semana já foi batida. Se quiser treinar mais, este é o próximo da fila.</p>`
        : ''}
      ${ficha(treino)}
      ${detalhesDoTreino(treino)}
      <button class="botao botao--anilha" type="button" data-acao="concluir" data-treino="${treino.id}">
        Concluir treino ${treino.id}
      </button>
    </section>`;
}

export const acoes = {
  concluir: ({ treino }, ctx) => concluirComAviso(treino, ctx),
};

function legenda({ feitos, meta }) {
  if (feitos < meta) {
    return html`<strong>${feitos} de ${meta}</strong> ${meta === 1 ? 'treino' : 'treinos'} nesta semana`;
  }
  if (feitos === meta) {
    return html`<strong>Semana completa:</strong> ${feitos} de ${meta} ${meta === 1 ? 'treino' : 'treinos'}`;
  }
  return html`<strong>Semana completa,</strong> com ${plural(feitos - meta, 'treino extra', 'treinos extras')}`;
}

function avisoFimDoCiclo(ciclo) {
  return html`
    <div class="faixa">
      <p><strong>O ciclo de ${ciclo.semanas} semanas terminou.</strong> Bom momento para refazer a bioimpedância e montar o próximo.</p>
      <a class="botao botao--secundario" href="#/novo-ciclo">Montar novo ciclo</a>
    </div>`;
}
