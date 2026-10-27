import { html } from '../ui/html.js';
import { anilha, semanasDoCiclo } from '../ui/componentes.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { apagarTudo } from '../estado.js';
import {
  cicloAtivo,
  ciclosEncerrados,
  encerrarCiclo,
  semanaDoCiclo,
  fimPrevisto,
  cicloConcluido,
} from '../treino/regras-do-ciclo.js';
import { dataCurta, dataComDiaDaSemana } from '../util/datas.js';
import { plural } from '../util/texto.js';
import { telaSemCiclo } from './comum.js';

// Visão do ciclo: treinos da divisão, semanas, histórico e ações.

export const titulo = 'Ciclo';

export function render(_params, { estado }) {
  const ciclo = cicloAtivo(estado);
  const anteriores = ciclosEncerrados(estado).reverse();

  if (!ciclo) {
    return html`${telaSemCiclo(estado)} ${listaDeAnteriores(anteriores)} ${opcoesAvancadas()}`;
  }

  const semana = semanaDoCiclo(ciclo);
  const terminou = cicloConcluido(ciclo);

  return html`
    <h1>Seu ciclo</h1>
    <p class="ciclo-resumo">${plural(ciclo.diasPorSemana, 'dia')} por semana, durante ${ciclo.semanas} semanas</p>
    <p class="contexto">
      De ${dataCurta(ciclo.inicio)} a ${dataCurta(fimPrevisto(ciclo))},
      ${terminou ? 'já concluído' : `semana ${semana.numero} de ${ciclo.semanas}`}
    </p>
    ${semanasDoCiclo(ciclo.semanas, semana.numero)}

    <section class="secao">
      <h2>Treinos</h2>
      <ul class="lista">
        ${ciclo.treinos.map((treino) => html`
          <li>
            <a class="lista-item" href="#/treino/${treino.id}">
              ${anilha(treino.id, { tamanho: 'p' })}
              <span class="lista-texto">
                <span class="lista-titulo">${treino.nome}</span>
                <span class="lista-sub">${treino.foco}, ${plural(treino.exercicios.length, 'exercício')}</span>
              </span>
              <svg class="lista-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </a>
          </li>`)}
      </ul>
    </section>

    <section class="secao">
      <h2>Histórico</h2>
      ${historico(ciclo)}
    </section>

    <section class="secao acoes">
      <a class="botao botao--secundario" href="#/novo-ciclo">Mudar dias por semana</a>
      <button class="botao botao--texto" type="button" data-acao="encerrar">Encerrar ciclo</button>
    </section>

    ${listaDeAnteriores(anteriores)}
    ${opcoesAvancadas()}`;
}

function historico(ciclo) {
  if (ciclo.sessoes.length === 0) {
    return html`<p class="texto-apoio">Os treinos que você concluir aparecem aqui.</p>`;
  }
  const recentesPrimeiro = [...ciclo.sessoes].reverse();
  return html`
    <ul class="lista">
      ${recentesPrimeiro.map((sessao) => html`
        <li class="lista-item lista-item--fixo">
          ${anilha(sessao.treinoId, { tamanho: 'p' })}
          <span class="lista-texto">
            <span class="lista-titulo">Treino ${sessao.treinoId}</span>
            <span class="lista-sub">${dataComDiaDaSemana(sessao.data)}</span>
          </span>
        </li>`)}
    </ul>`;
}

function listaDeAnteriores(anteriores) {
  if (anteriores.length === 0) return '';
  return html`
    <section class="secao">
      <h2>Ciclos anteriores</h2>
      <ul class="lista">
        ${anteriores.map((ciclo) => html`
          <li class="lista-item lista-item--fixo">
            <span class="lista-texto">
              <span class="lista-titulo">${plural(ciclo.diasPorSemana, 'dia')} por semana</span>
              <span class="lista-sub">De ${dataCurta(ciclo.inicio)} a ${dataCurta(ciclo.fim)}, ${plural(ciclo.sessoes.length, 'treino feito', 'treinos feitos')}</span>
            </span>
          </li>`)}
      </ul>
    </section>`;
}

function opcoesAvancadas() {
  return html`
    <details class="avancado">
      <summary>Opções avançadas</summary>
      <p>Apaga ciclos e histórico guardados neste celular. Não dá para desfazer.</p>
      <button class="botao botao--perigo" type="button" data-acao="apagar-tudo">Apagar todos os dados</button>
    </details>`;
}

export const acoes = {
  async encerrar(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Encerrar ciclo?',
      texto: 'O histórico continua salvo. Depois é só montar um novo ciclo.',
      botao: 'Encerrar ciclo',
    });
    if (!ok) return;
    await ctx.alterar((estado) => encerrarCiclo(estado));
    ctx.render();
    avisar('Ciclo encerrado');
  },

  async 'apagar-tudo'(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Apagar todos os dados?',
      texto: 'Ciclos e histórico deste celular serão apagados. Não dá para desfazer.',
      botao: 'Apagar tudo',
      perigo: true,
    });
    if (!ok) return;
    await apagarTudo();
    ctx.ir('#/hoje');
    avisar('Dados apagados');
  },
};
