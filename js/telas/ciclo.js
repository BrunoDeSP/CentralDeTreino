import { html } from '../ui/html.js';
import { anilha, semanasDoCiclo } from '../ui/componentes.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { buscarExercicio } from '../dados/exercicios.js';
import { usaCarga } from '../treino/progressao.js';
import {
  cicloAtivo,
  ciclosEncerrados,
  encerrarCiclo,
  semanaDoCiclo,
  fimPrevisto,
  cicloConcluido,
} from '../treino/regras-do-ciclo.js';
import { dataCurta, dataComDiaDaSemana } from '../util/datas.js';
import { plural, kg } from '../util/texto.js';
import { telaSemCiclo } from './comum.js';

// Visão do ciclo: treinos da divisão, semanas, histórico, cargas atuais e ações.

export const titulo = 'Ciclo';

export function render(_params, { estado }) {
  const ciclo = cicloAtivo(estado);
  const anteriores = ciclosEncerrados(estado).reverse();

  if (!ciclo) {
    return html`${telaSemCiclo(estado)} ${cargasAtuais(estado)} ${listaDeAnteriores(anteriores)}`;
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

    ${cargasAtuais(estado)}

    <section class="secao acoes">
      <a class="botao botao--secundario" href="#/novo-ciclo">Mudar dias por semana</a>
      <button class="botao botao--texto" type="button" data-acao="encerrar">Encerrar ciclo</button>
    </section>

    ${listaDeAnteriores(anteriores)}`;
}

function historico(ciclo) {
  if (ciclo.sessoes.length === 0) {
    return html`<p class="texto-apoio">Os treinos que você concluir aparecem aqui.</p>`;
  }
  const recentesPrimeiro = [...ciclo.sessoes].reverse();
  return html`
    <ul class="lista">
      ${recentesPrimeiro.map((sessao) => {
        const series = (sessao.series ?? []).reduce((total, item) => total + item.series.length, 0);
        return html`
          <li class="lista-item lista-item--fixo">
            ${anilha(sessao.treinoId, { tamanho: 'p' })}
            <span class="lista-texto">
              <span class="lista-titulo">Treino ${sessao.treinoId}</span>
              <span class="lista-sub">
                ${dataComDiaDaSemana(sessao.data)}${series ? `, ${plural(series, 'série registrada', 'séries registradas')}` : ''}
              </span>
            </span>
          </li>`;
      })}
    </ul>`;
}

// Carga atual de cada exercício já feito. Vale para qualquer treino e ciclo.
function cargasAtuais(estado) {
  const registros = Object.entries(estado.progressao ?? {})
    .map(([id, registro]) => ({ exercicio: buscarExercicio(id), registro }))
    .filter(({ exercicio }) => exercicio)
    .sort((a, b) => a.exercicio.nome.localeCompare(b.exercicio.nome, 'pt-BR'));
  if (registros.length === 0) return '';

  return html`
    <section class="secao">
      <h2>Cargas atuais</h2>
      <p class="texto-apoio secao-ajuda">Valem para qualquer treino e ciclo, e mudam quando você finaliza um treino.</p>
      <ul class="lista">
        ${registros.map(({ exercicio, registro }) => html`
          <li class="lista-item lista-item--fixo">
            <span class="lista-texto">
              <span class="lista-titulo">${exercicio.nome}</span>
              <span class="lista-sub">${melhorMarca(registro)}</span>
            </span>
            <span class="lista-valor">${valorAtual(exercicio, registro)}</span>
          </li>`)}
      </ul>
    </section>`;
}

function valorAtual(exercicio, registro) {
  if (Number.isFinite(registro.carga)) return kg(registro.carga);
  if (usaCarga(exercicio)) return '— kg'; // fez sem informar a carga
  return exercicio.requer.includes('elastico') ? 'Elástico' : 'Peso do corpo';
}

function melhorMarca({ recorde, ultima }) {
  if (!recorde) return '';
  const unidade = ultima?.alvo?.medida === 'segundos' ? 's' : 'reps';
  const marca = recorde.carga === null ? `${recorde.reps} ${unidade}` : `${kg(recorde.carga)} × ${recorde.reps}`;
  return `Melhor marca: ${marca}, em ${dataCurta(recorde.data)}`;
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

export const acoes = {
  async encerrar(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Encerrar ciclo?',
      texto: 'O histórico e as cargas continuam salvos. Depois é só montar um novo ciclo.',
      botao: 'Encerrar ciclo',
    });
    if (!ok) return;
    await ctx.alterar((estado) => encerrarCiclo(estado));
    ctx.render();
    avisar('Ciclo encerrado');
  },
};
