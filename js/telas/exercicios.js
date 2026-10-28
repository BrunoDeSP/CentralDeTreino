import { html } from '../ui/html.js';
import { exerciciosPorRegiao } from '../treino/historico.js';
import { dataCurta } from '../util/datas.js';
import { plural } from '../util/texto.js';

// Aba Exercícios: cada exercício já feito, separado por região do corpo, com
// a carga atual e quantas vezes ela já fez. Vale para qualquer treino e ciclo.

export const titulo = 'Exercícios';

export function render(_params, { estado }) {
  const grupos = exerciciosPorRegiao(estado);
  const comExercicios = grupos.filter((grupo) => grupo.itens.length > 0);

  if (comExercicios.length === 0) {
    return html`
      <h1>Exercícios</h1>
      <p class="texto-apoio pagina-intro">Os exercícios aparecem aqui depois que você finaliza um treino marcando as séries. Cada um mostra a carga atual, quantas vezes você já fez e a evolução.</p>
      <a class="botao" href="#/hoje">Ir para o Início</a>`;
  }

  const semCardio = grupos.find((grupo) => grupo.regiao.id === 'cardio').itens.length === 0;
  return html`
    <h1>Exercícios</h1>
    <p class="texto-apoio pagina-intro">Carga atual e quantas vezes você já fez cada exercício, em qualquer treino ou ciclo.</p>
    ${comExercicios.map(({ regiao, itens }) => html`
      <section class="secao" aria-labelledby="regiao-${regiao.id}">
        <h2 id="regiao-${regiao.id}">${regiao.nome}</h2>
        <p class="texto-apoio secao-ajuda">${regiao.descricao}</p>
        <ul class="lista">${itens.map(linha)}</ul>
      </section>`)}
    ${semCardio ? html`<p class="texto-apoio nota-final">O cardio aparece aqui quando você registra no fim do treino.</p>` : ''}`;
}

function linha(item) {
  const { resumo } = item;
  return html`
    <li>
      <a class="lista-item" href="#/exercicio/${item.id}">
        <span class="lista-texto">
          <span class="lista-titulo">${item.nome}</span>
          <span class="lista-sub">${plural(resumo.vezes, 'vez', 'vezes')}, a última em ${dataCurta(resumo.ultima.data)}</span>
        </span>
        <span class="lista-valor">${item.valor}</span>
        <svg class="lista-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </a>
    </li>`;
}
