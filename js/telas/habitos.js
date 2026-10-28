import { html } from '../ui/html.js';
import { textoDaMeta } from '../habitos/regras-dos-habitos.js';

// Lista dos hábitos, com acesso para criar e editar.

export const titulo = 'Hábitos';

export function render(_params, { estado }) {
  return html`
    <h1>Hábitos</h1>
    <p class="texto-apoio pagina-intro">Os hábitos aparecem no Início, com o calendário do mês e a meta de cada um.</p>
    <ul class="lista">
      <li class="lista-item lista-item--fixo">
        <span class="habito-ponto" data-cor="tinta" aria-hidden="true"></span>
        <span class="lista-texto">
          <span class="lista-titulo">Treinos</span>
          <span class="lista-sub">Automático: marcado quando você conclui um treino</span>
        </span>
      </li>
      ${estado.habitos.map((habito) => html`
        <li>
          <a class="lista-item" href="#/habito/${habito.id}">
            <span class="habito-ponto" data-cor="${habito.cor}" aria-hidden="true"></span>
            <span class="lista-texto">
              <span class="lista-titulo">${habito.nome}</span>
              <span class="lista-sub">${textoDaMeta(habito.meta)}</span>
            </span>
            <svg class="lista-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </a>
        </li>`)}
    </ul>
    <a class="botao botao--margem" href="#/habito/novo">Novo hábito</a>`;
}
