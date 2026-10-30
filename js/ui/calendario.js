import { html, cru } from './html.js';
import { inicioDaSemana, somarDias, dataPorExtenso, mesDe } from '../util/datas.js';
import { progressoAtual, periodosDourados, textoDaMeta } from '../habitos/regras-dos-habitos.js';
import { plural } from '../util/texto.js';

// Visual dos hábitos:
// - semanaDeTreino: a semana atual no Início, com os dias de treino pintados
//   e o contador da meta (ex.: 1/5).
// - cartaoDeHabito: o mapa de quadradinhos das últimas semanas (colunas são
//   semanas, linhas são os dias de segunda a domingo). Os dias feitos ficam na
//   cor do hábito e os períodos com a meta batida ficam dourados.

export const SEMANAS_NO_MAPA = 13; // cerca de 3 meses

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ICONE_FEITO = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>');

// --- Semana atual do treino (Início) -----------------------------------------

export function semanaDeTreino(habito, hoje, { recemFeito = false } = {}) {
  const segunda = inicioDaSemana(hoje);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const feitos = new Set(habito.dias);
  const { feitas, meta, periodo } = progressoAtual(habito, hoje);
  const bateu = feitas >= meta;
  const faltam = meta - feitas;
  const situacao = bateu ? 'meta batida' : `${faltam === 1 ? 'falta 1' : `faltam ${faltam}`}`;

  return html`
    <div class="semana-treino ${bateu ? 'semana-treino--ouro' : ''}">
      <div class="semana-treino-cabeca">
        <h2 class="semana-treino-titulo">Esta semana</h2>
        <p class="semana-treino-meta">
          <strong>${feitas}/${meta}</strong>
          <span>${periodo === 'mes' ? 'no mês, ' : ''}${situacao}</span>
        </p>
      </div>
      <ol class="semana-dias">
        ${dias.map((data, i) => {
          const feito = feitos.has(data);
          const classes = [
            'semana-dia',
            feito ? 'semana-dia--feito' : '',
            data === hoje ? 'semana-dia--hoje' : '',
            data > hoje ? 'semana-dia--futuro' : '',
            feito && recemFeito && data === hoje ? 'semana-dia--novo' : '',
          ].join(' ');
          return html`
            <li class="${classes}" aria-label="${dataPorExtenso(data)}${feito ? ', treinou' : ''}">
              <span class="semana-dia-nome" aria-hidden="true">${DIAS[i]}</span>
              <span class="semana-dia-numero" aria-hidden="true">${Number(data.slice(8))}</span>
            </li>`;
        })}
      </ol>
    </div>`;
}

// --- Cartão de hábito --------------------------------------------------------

export function cartaoDeHabito(habito, { hoje, destaque = null }) {
  const feitos = new Set(habito.dias);
  const progresso = progressoAtual(habito, hoje);
  const bateuMeta = progresso.feitas >= progresso.meta;
  const primeiraSegunda = somarDias(inicioDaSemana(hoje), -7 * (SEMANAS_NO_MAPA - 1));
  const ultimoDia = somarDias(inicioDaSemana(hoje), 6);
  const dourados = periodosDourados(habito, primeiraSegunda, ultimoDia);

  return html`
    <article class="habito" data-cor="${habito.cor}">
      <header class="habito-cabeca">
        <div>
          <h3 class="habito-nome">${habito.nome}</h3>
          <p class="habito-meta">${textoDaMeta(habito.meta)}${habito.automatico ? ', marcado pelos treinos' : ''}</p>
        </div>
        ${habito.automatico ? '' : botaoDeHoje(habito, hoje, feitos.has(hoje))}
      </header>
      ${contador(progresso, bateuMeta)}
      ${mapa(habito, feitos, dourados.datas, primeiraSegunda, hoje, destaque)}
      ${resumo(habito, dourados.quantidade)}
    </article>`;
}

function botaoDeHoje(habito, hoje, feitoHoje) {
  const rotulo = feitoHoje ? `${habito.nome}: feito hoje. Toque para desmarcar.` : `Marcar ${habito.nome} como feito hoje`;
  return html`
    <button class="habito-check ${feitoHoje ? 'habito-check--feito' : ''}" type="button" data-acao="dia" data-habito="${habito.id}" data-data="${hoje}" data-foco="hoje-${habito.id}" aria-pressed="${feitoHoje ? 'true' : 'false'}" aria-label="${rotulo}">${ICONE_FEITO}</button>`;
}

// Bolinhas para metas semanais e barra para metas do mês.
function contador({ feitas, meta, periodo }, bateuMeta) {
  const quando = periodo === 'semana' ? 'nesta semana' : 'neste mês';
  const visual = periodo === 'semana'
    ? html`<span class="pips" aria-hidden="true">${Array.from({ length: meta }, (_, i) => html`<span class="pip ${i < feitas ? 'pip--cheio' : ''}"></span>`)}</span>`
    : html`<span class="meta-barra" aria-hidden="true"><span style="width: ${Math.min(100, Math.round((feitas / meta) * 100))}%"></span></span>`;
  return html`
    <div class="habito-progresso">
      ${visual}
      <p class="habito-contagem"><strong>${feitas} de ${meta}</strong> ${quando}</p>
      ${bateuMeta ? html`<span class="habito-selo">${ICONE_FEITO}Meta batida</span>` : ''}
    </div>`;
}

// Mapa de quadradinhos: uma grade só, com rótulos dos dias à esquerda, meses
// em cima e uma faixa dourada atrás das semanas com a meta batida.
function mapa(habito, feitos, dourados, primeiraSegunda, hoje, destaque) {
  const semanal = habito.meta.periodo === 'semana';
  const partes = [];

  LETRAS.forEach((letra, linha) => {
    partes.push(html`<span class="mapa-rotulo" style="grid-row: ${linha + 2}" aria-hidden="true">${letra}</span>`);
  });

  for (let coluna = 0; coluna < SEMANAS_NO_MAPA; coluna++) {
    const segunda = somarDias(primeiraSegunda, coluna * 7);
    const datas = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
    const comecoDeMes = datas.find((data) => data.endsWith('-01'));
    if (comecoDeMes) {
      partes.push(html`<span class="mapa-mes" style="grid-column: ${coluna + 2}" aria-hidden="true">${MESES[mesDe(comecoDeMes).mes]}</span>`);
    }
    if (semanal && dourados.has(segunda)) {
      partes.push(html`<span class="mapa-ouro" style="grid-column: ${coluna + 2}" aria-hidden="true"></span>`);
    }
    datas.forEach((data, linha) => {
      partes.push(quadro(habito, data, {
        feito: feitos.has(data),
        dourado: dourados.has(data),
        hoje,
        novo: destaque === `${habito.id}:${data}`,
        posicao: `grid-column: ${coluna + 2}; grid-row: ${linha + 2}`,
      }));
    });
  }

  return html`<div class="mapa" style="--semanas: ${SEMANAS_NO_MAPA}" role="group" aria-label="Últimas ${SEMANAS_NO_MAPA} semanas">${partes}</div>`;
}

function quadro(habito, data, { feito, dourado, hoje, novo, posicao }) {
  const classes = [
    'quadro',
    feito ? 'quadro--feito' : '',
    dourado ? 'quadro--ouro' : '',
    data === hoje ? 'quadro--hoje' : '',
    data > hoje ? 'quadro--futuro' : '',
    novo && feito ? 'quadro--novo' : '',
  ].join(' ');
  const rotulo = `${dataPorExtenso(data)}${feito ? ', feito' : ''}${dourado ? ', meta batida' : ''}`;

  // Treinos são marcados sozinhos e dias futuros ainda não podem ser marcados.
  if (habito.automatico || data > hoje) {
    return html`<span class="${classes}" style="${posicao}" role="img" aria-label="${rotulo}"></span>`;
  }
  return html`<button class="${classes}" style="${posicao}" type="button" data-acao="dia" data-habito="${habito.id}" data-data="${data}" data-foco="dia-${habito.id}-${data}" aria-pressed="${feito ? 'true' : 'false'}" aria-label="${rotulo}"></button>`;
}

function resumo(habito, quantidadeDourada) {
  if (quantidadeDourada > 0) {
    const periodos = habito.meta.periodo === 'semana' ? plural(quantidadeDourada, 'semana') : plural(quantidadeDourada, 'mês', 'meses');
    return html`<p class="habito-resumo">Meta batida em ${periodos} nos últimos 3 meses</p>`;
  }
  if (habito.dias.length === 0) {
    const dica = habito.automatico
      ? 'Os treinos concluídos aparecem aqui.'
      : 'Toque num quadradinho para marcar um dia anterior.';
    return html`<p class="habito-resumo">${dica}</p>`;
  }
  return '';
}
