import { html } from '../ui/html.js';
import { cartaoDeQuadrados, navegacaoDeMes, moverMes } from '../ui/calendario.js';
import { habitoDosTreinos, textoDaMeta } from '../habitos/regras-dos-habitos.js';
import { hojeISO, mesDe } from '../util/datas.js';

// Aba Hábitos: configurar cada hábito (o Treinos fica sempre em primeiro) e,
// abaixo, o calendário do mês em quadradinhos, com troca de mês.

export const titulo = 'Hábitos';

let mesVisivel = null;

export function render(_params, { estado }) {
  const hoje = hojeISO();
  mesVisivel ??= mesDe(hoje);
  const treinos = habitoDosTreinos(estado);

  return html`
    <h1>Hábitos</h1>
    <p class="texto-apoio pagina-intro">Toque num hábito para ajustar o nome, a meta e a cor.</p>
    <ul class="lista">
      <li>
        <a class="lista-item" href="#/habito/treinos">
          <span class="habito-ponto" data-cor="tinta" aria-hidden="true"></span>
          <span class="lista-texto">
            <span class="lista-titulo">Treinos</span>
            <span class="lista-sub">${textoDaMeta(treinos.meta)}, marcado pelos treinos</span>
          </span>
          ${seta()}
        </a>
      </li>
      ${estado.habitos.map((habito) => html`
        <li>
          <a class="lista-item" href="#/habito/${habito.id}">
            <span class="habito-ponto" data-cor="${habito.cor}" aria-hidden="true"></span>
            <span class="lista-texto">
              <span class="lista-titulo">${habito.nome}</span>
              <span class="lista-sub">${textoDaMeta(habito.meta)}</span>
            </span>
            ${seta()}
          </a>
        </li>`)}
    </ul>
    <a class="botao botao--margem" href="#/habito/novo">Novo hábito</a>

    <section class="secao" aria-labelledby="titulo-calendario">
      <h2 id="titulo-calendario">Calendário</h2>
      ${navegacaoDeMes(mesVisivel)}
      ${[treinos, ...estado.habitos].map((habito) => cartaoDeQuadrados(habito, { hoje, mes: mesVisivel }))}
    </section>`;
}

export function aoSair() {
  mesVisivel = null;
}

export const acoes = {
  mes({ delta }, ctx) {
    mesVisivel = moverMes(mesVisivel, Number(delta));
    ctx.render();
  },
};

function seta() {
  return html`<svg class="lista-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>`;
}
