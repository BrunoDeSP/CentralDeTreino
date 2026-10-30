import { html } from '../ui/html.js';
import { cabecalhoDoTreino, ficha, detalhesDoTreino } from '../ui/componentes.js';
import { cicloAtivo, buscarTreino, proximoTreino } from '../treino/regras-do-ciclo.js';
import { concluirComAviso, iniciarOuContinuar, botoesDoTreino, faixaDeSessao } from './comum.js';

// Ficha de qualquer treino do ciclo (aberta pela lista na tela Ciclo).
// Um dia a mais não mexe na fila, por isso não leva o aviso da fila.

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
    ${faixaDeSessao(estado, treino.id)}
    <section class="treino-do-dia treino-do-dia--pagina" data-anilha="${treino.id.toLowerCase()}">
      ${cabecalhoDoTreino(treino, 'h1')}
      ${ficha(treino, estado.progressao)}
      ${detalhesDoTreino(treino, estado.configuracoes)}
      ${proximo.id === treino.id || treino.extra
        ? ''
        : html`<p class="nota">O próximo da fila é o ${proximo.nome}. Se você fizer este agora, a fila continua a partir dele.</p>`}
      ${botoesDoTreino(treino, estado)}
    </section>`;
}

export const acoes = {
  iniciar: ({ treino }, ctx) => iniciarOuContinuar(treino, ctx),
  concluir: ({ treino }, ctx) => concluirComAviso(treino, ctx),
};
