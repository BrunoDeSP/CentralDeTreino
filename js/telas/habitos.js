import { html } from '../ui/html.js';
import { habitoDosTreinos, textoDaMeta } from '../habitos/regras-dos-habitos.js';

// Lista dos hábitos, com acesso para criar e editar. O hábito Treinos fica
// sempre em primeiro: os dias vêm dos treinos, mas a meta é ela que define.

export const titulo = 'Hábitos';


export function render(_params, { estado }) {
  const treinos = habitoDosTreinos(estado);
  return html`
    <h1>Hábitos</h1>
    <p class="texto-apoio pagina-intro">Os hábitos aparecem no Início, com os quadradinhos das últimas semanas e a meta de cada um.</p>
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
    <a class="botao botao--margem" href="#/habito/novo">Novo hábito</a>`;
}

function seta() {
  return html`<svg class="lista-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>`;
}
