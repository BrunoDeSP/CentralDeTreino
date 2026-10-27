import { html } from '../ui/html.js';
import { cabecalhoDoTreino, ficha, detalhesDoTreino } from '../ui/componentes.js';
import { cicloAtivo, buscarTreino, proximoTreino } from '../treino/regras-do-ciclo.js';
import { concluirComAviso } from './comum.js';

// Ficha de qualquer treino do ciclo (aberta pela lista na tela Ciclo).

export const titulo = 'Treino';

export function render([treinoId], { estado }) {
  const ciclo = cicloAtivo(estado);
  const treino = ciclo ? buscarTreino(ciclo, treinoId) : null;

  if (!treino) {
    return html`
      <a class="voltar" href="#/ciclo" data-acao="voltar">Voltar</a>
      <h1>Treino não encontrado</h1>
      <p class="texto-apoio">Este treino não faz parte do ciclo atual.</p>
      <a class="botao" href="#/ciclo">Ver o ciclo</a>`;
  }

  const proximo = proximoTreino(ciclo);

  return html`
    <a class="voltar" href="#/ciclo" data-acao="voltar">Voltar</a>
    <section class="treino-do-dia treino-do-dia--pagina" data-anilha="${treino.id.toLowerCase()}">
      ${cabecalhoDoTreino(treino, 'h1')}
      ${ficha(treino)}
      ${detalhesDoTreino(treino)}
      ${proximo.id === treino.id
        ? ''
        : html`<p class="nota">O próximo da fila é o ${proximo.nome}. Se você fizer este agora, a fila continua a partir dele.</p>`}
      <button class="botao botao--anilha" type="button" data-acao="concluir" data-treino="${treino.id}">
        Concluir treino ${treino.id}
      </button>
    </section>`;
}

export const acoes = {
  concluir: ({ treino }, ctx) => concluirComAviso(treino, ctx),
};
