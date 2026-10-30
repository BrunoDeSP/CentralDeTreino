import { html } from '../ui/html.js';
import { graficoDeEvolucao } from '../ui/grafico.js';
import { buscarExercicio } from '../dados/exercicios.js';
import { REGIOES } from '../dados/regioes.js';
import { historicoDeForca, historicoDeCardio, resumoDeForca, resumoDeCardio } from '../treino/historico.js';
import { descreverSeries } from '../treino/progressao.js';
import { dataCurta, dataComDiaDaSemana } from '../util/datas.js';
import { kg, numero, plural } from '../util/texto.js';

// Página de um exercício: carga atual, evolução treino a treino, quantas
// vezes ela fez com cada carga e o histórico. Rotas: #/exercicio/<id> e
// #/exercicio/cardio-<tipo>.

export const titulo = 'Exercício';

export function render([id], { estado }) {
  if (id?.startsWith('cardio-')) return paginaDeCardio(id.slice('cardio-'.length), estado);

  const exercicio = buscarExercicio(id);
  const registros = historicoDeForca(estado).get(id);
  if (!exercicio || !registros) return naoEncontrado();

  const resumo = resumoDeForca(id, registros, estado.progressao?.[id]);
  const regiao = REGIOES.find((item) => item.id === resumo.regiao);
  const segundos = resumo.medida === 'segundos';
  const unidade = resumo.comCarga ? 'kg' : segundos ? 's' : 'reps';
  const semCarga = resumo.comCarga ? 'Sem carga' : exercicio.requer.includes('elastico') ? 'Elástico' : 'Peso do corpo';
  const grafico = graficoDeEvolucao(resumo.evolucao, {
    unidade,
    descricao: descricaoDaEvolucao(resumo.evolucao, unidade),
  });
  const maisVezes = Math.max(...resumo.cargas.map((carga) => carga.vezes));

  return html`
    <a class="voltar" href="#/exercicios" data-acao="voltar">Voltar</a>
    <h1>${exercicio.nome}</h1>
    <p class="contexto">${regiao?.nome ?? ''}: ${exercicio.grupo}</p>

    <dl class="destaques">
      ${resumo.comCarga
        ? destaque('Carga atual', Number.isFinite(resumo.cargaAtual) ? kg(resumo.cargaAtual) : '— kg')
        : destaque('Melhor série', `${numero(resumo.recorde.reps)} ${unidade}`)}
      ${destaque('Feito', plural(resumo.vezes, 'vez', 'vezes'))}
      ${resumo.comCarga
        ? destaque('Melhor marca', Number.isFinite(resumo.recorde?.carga) ? `${kg(resumo.recorde.carga)} × ${resumo.recorde.reps}` : '—')
        : destaque('Última vez', dataCurta(resumo.ultima.data))}
    </dl>

    <section class="secao">
      <h2>${resumo.comCarga ? 'Evolução da carga' : segundos ? 'Evolução do tempo' : 'Evolução das repetições'}</h2>
      <div class="cartao">${grafico ?? html`<p class="texto-apoio">O gráfico aparece a partir do segundo treino com este exercício.</p>`}</div>
    </section>

    <section class="secao">
      <h2>${resumo.comCarga ? 'Vezes com cada carga' : 'Vezes feitas'}</h2>
      <ul class="cargas">
        ${resumo.cargas.map((carga) => linhaDeContagem({
          rotulo: carga.carga === null ? semCarga : kg(carga.carga),
          vezes: carga.vezes,
          series: carga.series,
          maisVezes,
        }))}
      </ul>
    </section>

    <section class="secao">
      <h2>Histórico</h2>
      <ul class="lista">
        ${resumo.historico.map((registro) => html`
          <li class="lista-item lista-item--fixo">
            <span class="lista-texto">
              <span class="lista-titulo">${capitalizar(dataComDiaDaSemana(registro.data))}</span>
              <span class="lista-sub">${descreverSeries({
                cargas: registro.series.map((serie) => (resumo.comCarga ? serie.carga ?? null : null)),
                reps: registro.series.map((serie) => serie.reps),
                alvo: registro.alvo,
              })}</span>
            </span>
          </li>`)}
      </ul>
    </section>`;
}

function paginaDeCardio(tipoId, estado) {
  const registros = historicoDeCardio(estado).get(tipoId);
  const resumo = registros ? resumoDeCardio(tipoId, registros) : null;
  if (!resumo?.tipo) return naoEncontrado();

  const grafico = graficoDeEvolucao(resumo.evolucao, { unidade: 'min', descricao: descricaoDaEvolucao(resumo.evolucao, 'min') });
  const maisVezes = Math.max(...resumo.duracoes.map((duracao) => duracao.vezes));

  return html`
    <a class="voltar" href="#/exercicios" data-acao="voltar">Voltar</a>
    <h1>${resumo.tipo.nome}</h1>
    <p class="contexto">Cardio</p>

    <dl class="destaques">
      ${destaque('Última vez', `${resumo.ultima.minutos} min`)}
      ${destaque('Feito', plural(resumo.vezes, 'vez', 'vezes'))}
      ${destaque('Total', `${numero(resumo.totalMinutos)} min`)}
    </dl>

    <section class="secao">
      <h2>Minutos por treino</h2>
      <div class="cartao">${grafico ?? html`<p class="texto-apoio">O gráfico aparece a partir do segundo cardio deste tipo.</p>`}</div>
    </section>

    <section class="secao">
      <h2>Vezes com cada duração</h2>
      <ul class="cargas">
        ${resumo.duracoes.map((duracao) => linhaDeContagem({ rotulo: `${duracao.minutos} min`, vezes: duracao.vezes, maisVezes }))}
      </ul>
    </section>

    <section class="secao">
      <h2>Histórico</h2>
      <ul class="lista">
        ${resumo.historico.map((registro) => html`
          <li class="lista-item lista-item--fixo">
            <span class="lista-texto">
              <span class="lista-titulo">${capitalizar(dataComDiaDaSemana(registro.data))}</span>
              <span class="lista-sub">${registro.minutos} min${Number.isFinite(registro.nivel) ? `, nível ${registro.nivel}` : ''}</span>
            </span>
          </li>`)}
      </ul>
    </section>`;
}

function destaque(rotulo, valor) {
  return html`<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`;
}

// "22 kg" | barra proporcional | "3 treinos, 9 séries"
function linhaDeContagem({ rotulo, vezes, series = null, maisVezes }) {
  const largura = Math.max(6, Math.round((vezes / maisVezes) * 100));
  return html`
    <li class="carga-linha">
      <span class="carga-valor">${rotulo}</span>
      <span class="carga-barra" aria-hidden="true"><span style="width: ${largura}%"></span></span>
      <span class="carga-vezes">${plural(vezes, 'treino')}${series ? html`<small>${plural(series, 'série')}</small>` : ''}</span>
    </li>`;
}

function descricaoDaEvolucao(pontos, unidade) {
  if (pontos.length < 2) return '';
  return `De ${numero(pontos[0].valor)} ${unidade} para ${numero(pontos.at(-1).valor)} ${unidade} em ${pontos.length} treinos`;
}

function naoEncontrado() {
  return html`
    <a class="voltar" href="#/exercicios" data-acao="voltar">Voltar</a>
    <h1>Exercício não encontrado</h1>
    <p class="texto-apoio pagina-intro">Ainda não existe registro deste exercício.</p>
    <a class="botao" href="#/exercicios">Ver exercícios</a>`;
}

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
