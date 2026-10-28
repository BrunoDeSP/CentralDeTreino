import { html, cru } from './html.js';
import { hojeISO, inicioDaSemana, somarDias, diferencaDias, dataPorExtenso, diasDoMes, diaDaSemana, nomeDoMes, mesDe, somarMeses } from '../util/datas.js';
import { progressoAtual, periodosDourados, textoDaMeta } from '../habitos/regras-dos-habitos.js';
import { plural } from '../util/texto.js';

// Visual dos hábitos:
// - semanaDeTreino: a semana atual no Início, com os dias de treino pintados
//   e o contador da meta (ex.: 2/3).
// - cartaoDeHabito: Início. Calendário do mês com os números dos dias; as
//   semanas com a meta batida ficam douradas e os dias feitos continuam na
//   cor do hábito. O dourado aparece só no Início.
// - cartaoDeQuadrados: aba Hábitos. Vários meses em quadradinhos, como no
//   GitHub (colunas são semanas, linhas vão de segunda a domingo), dias feitos
//   em verde e sem dourado.

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ICONE_FEITO = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>');
const SETA_ESQUERDA = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>');
const SETA_DIREITA = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>');

// --- Semana atual do treino (Início) -----------------------------------------

export function semanaDeTreino(habito, hoje, { recemFeito = false } = {}) {
  const segunda = inicioDaSemana(hoje);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const feitos = new Set(habito.dias);
  const { feitas, meta, periodo } = progressoAtual(habito, hoje);
  const bateu = feitas >= meta;
  const legenda = [periodo === 'mes' ? 'no mês' : '', bateu ? 'meta batida' : ''].filter(Boolean).join(', ');

  return html`
    <div class="semana-treino ${bateu ? 'semana-treino--ouro' : ''}">
      <div class="semana-treino-cabeca">
        <h2 class="semana-treino-titulo">Esta semana</h2>
        <p class="semana-treino-meta">
          <strong>${feitas}/${meta}</strong>
          ${legenda ? html`<span>${legenda}</span>` : ''}
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

// --- Navegação de mês (Início e aba Hábitos) ----------------------------------

export function navegacaoDeMes(mes, { rotulo = null } = {}) {
  const noMesAtual = mesmoMes(mes, mesDe(hojeISO()));
  return html`
    <div class="mes">
      <button class="mes-botao" type="button" data-acao="mes" data-delta="-1" data-foco="mes-anterior" aria-label="Mês anterior">${SETA_ESQUERDA}</button>
      <span class="mes-nome" aria-live="polite">${rotulo ?? capitalizar(nomeDoMes(mes))}</span>
      <button class="mes-botao" type="button" data-acao="mes" data-delta="1" data-foco="mes-seguinte" aria-label="Mês seguinte" ${noMesAtual ? cru('disabled') : ''}>${SETA_DIREITA}</button>
    </div>`;
}

// Anda um mês para trás ou para frente, sem passar do mês atual.
export function moverMes(mes, delta) {
  const destino = somarMeses(mes, delta);
  const atual = mesDe(hojeISO());
  return destino.ano * 12 + destino.mes > atual.ano * 12 + atual.mes ? mes : destino;
}

export function mesmoMes(a, b) {
  return a.ano === b.ano && a.mes === b.mes;
}

// --- Cartão de hábito do Início: calendário do mês com dourado ----------------

export function cartaoDeHabito(habito, { hoje, mes, destaque = null }) {
  const noMesAtual = mesmoMes(mes, mesDe(hoje));
  const feitos = new Set(habito.dias);
  const dias = diasDoMes(mes);
  const dourados = periodosDourados(habito, dias[0], dias.at(-1));
  const progresso = noMesAtual ? progressoAtual(habito, hoje) : null;
  const bateuMeta = Boolean(progresso) && progresso.feitas >= progresso.meta;

  return html`
    <article class="habito" data-cor="${habito.cor}">
      <header class="habito-cabeca">
        <div>
          <h3 class="habito-nome">${habito.nome}</h3>
          <p class="habito-meta">${textoDaMeta(habito.meta)}${habito.automatico ? ', marcado pelos treinos' : ''}</p>
        </div>
        ${!habito.automatico && noMesAtual ? botaoDeHoje(habito, hoje, feitos.has(hoje)) : ''}
      </header>
      ${progresso ? contador(progresso, bateuMeta) : ''}
      ${calendarioDoMes(habito, dias, feitos, dourados.datas, hoje, destaque)}
      ${resumoDoMes(habito, dias, mes, noMesAtual, dourados.quantidade)}
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

// Calendário do mês (semana começando na segunda). Cada semana com a meta
// batida ganha uma faixa dourada atrás dos dias.
function calendarioDoMes(habito, dias, feitos, dourados, hoje, destaque) {
  const deslocamento = diaDaSemana(dias[0]);
  const posicao = (i) => ({ linha: Math.floor((deslocamento + i) / 7) + 2, coluna: ((deslocamento + i) % 7) + 1 });
  const partes = LETRAS.map((letra, i) => html`<span class="calendario-letra" style="grid-column: ${i + 1}" aria-hidden="true">${letra}</span>`);

  const linhas = new Map(); // linha -> primeira e última coluna do mês nessa semana
  dias.forEach((data, i) => {
    const { linha, coluna } = posicao(i);
    const faixa = linhas.get(linha) ?? { inicio: coluna, fim: coluna, dourada: dourados.has(data) };
    faixa.fim = coluna;
    linhas.set(linha, faixa);
  });
  for (const [linha, { inicio, fim, dourada }] of linhas) {
    if (dourada) {
      partes.push(html`<span class="calendario-ouro" style="grid-row: ${linha}; grid-column: ${inicio} / ${fim + 1}" aria-hidden="true"></span>`);
    }
  }

  dias.forEach((data, i) => {
    const { linha, coluna } = posicao(i);
    partes.push(dia(habito, data, {
      feito: feitos.has(data),
      dourado: dourados.has(data),
      hoje,
      novo: destaque === `${habito.id}:${data}`,
      estilo: `grid-row: ${linha}; grid-column: ${coluna}`,
    }));
  });

  return html`<div class="calendario">${partes}</div>`;
}

function dia(habito, data, { feito, dourado, hoje, novo, estilo }) {
  const classes = [
    'dia',
    feito ? 'dia--feito' : '',
    dourado ? 'dia--ouro' : '',
    data === hoje ? 'dia--hoje' : '',
    data > hoje ? 'dia--futuro' : '',
    novo && feito ? 'dia--novo' : '',
  ].join(' ');
  const rotulo = `${dataPorExtenso(data)}${feito ? ', feito' : ''}${dourado ? ', meta batida' : ''}`;
  const numero = Number(data.slice(8));

  // Treinos são marcados sozinhos e dias futuros ainda não podem ser marcados.
  if (habito.automatico || data > hoje) {
    return html`<span class="${classes}" style="${estilo}" role="img" aria-label="${rotulo}">${numero}</span>`;
  }
  return html`<button class="${classes}" style="${estilo}" type="button" data-acao="dia" data-habito="${habito.id}" data-data="${data}" data-foco="dia-${habito.id}-${data}" aria-pressed="${feito ? 'true' : 'false'}" aria-label="${rotulo}">${numero}</button>`;
}

function resumoDoMes(habito, dias, mes, noMesAtual, quantidadeDourada) {
  const total = habito.dias.filter((data) => data >= dias[0] && data <= dias.at(-1)).length;
  const nomeMes = nomeDoMes(mes, { comAno: false });
  if (total === 0) {
    if (!noMesAtual) return '';
    const dica = habito.automatico
      ? 'Os treinos concluídos aparecem aqui.'
      : 'Toque num dia do calendário para marcar um dia anterior.';
    return html`<p class="habito-resumo">${dica}</p>`;
  }
  const partes = [habito.automatico ? `${plural(total, 'treino')} em ${nomeMes}` : `${plural(total, 'vez', 'vezes')} em ${nomeMes}`];
  if (quantidadeDourada > 0) {
    partes.push(habito.meta.periodo === 'semana' ? `meta batida em ${plural(quantidadeDourada, 'semana')}` : 'meta do mês batida');
  }
  return html`<p class="habito-resumo">${partes.join(', ')}</p>`;
}

// --- Quadradinhos da aba Hábitos: vários meses lado a lado, como no GitHub ----

export const MESES_NOS_QUADRADINHOS = 4;

// Primeiro e último dia dos meses mostrados, terminando em mesFinal.
export function periodoDosQuadradinhos(mesFinal) {
  const primeiroMes = somarMeses(mesFinal, -(MESES_NOS_QUADRADINHOS - 1));
  return { primeiroMes, inicio: diasDoMes(primeiroMes)[0], fim: diasDoMes(mesFinal).at(-1) };
}

// "Julho a outubro de 2026"
export function rotuloDoPeriodo(mesFinal) {
  const { primeiroMes } = periodoDosQuadradinhos(mesFinal);
  const inicio = nomeDoMes(primeiroMes, { comAno: primeiroMes.ano !== mesFinal.ano });
  return capitalizar(`${inicio} a ${nomeDoMes(mesFinal)}`);
}

// Colunas são semanas e linhas vão de segunda a domingo. Os dias feitos ficam
// verdes em todos os hábitos, e os quadradinhos ocupam a largura toda.
export function cartaoDeQuadrados(habito, { hoje, mesFinal }) {
  const { inicio, fim } = periodoDosQuadradinhos(mesFinal);
  const primeiraSegunda = inicioDaSemana(inicio);
  const semanas = Math.ceil((diferencaDias(primeiraSegunda, fim) + 1) / 7);
  const feitos = new Set(habito.dias);
  const partes = [['seg', 0], ['qua', 2], ['sex', 4]].map(([nome, linha]) => html`<span class="quadros-letra" style="grid-row: ${linha + 2}" aria-hidden="true">${nome}</span>`);
  let total = 0;

  for (let coluna = 0; coluna < semanas; coluna++) {
    const segunda = somarDias(primeiraSegunda, coluna * 7);
    for (let linha = 0; linha < 7; linha++) {
      const data = somarDias(segunda, linha);
      if (data < inicio || data > fim) continue;
      if (data.endsWith('-01')) {
        partes.push(html`<span class="quadros-mes" style="grid-column: ${coluna + 2}" aria-hidden="true">${MESES[mesDe(data).mes]}</span>`);
      }
      const feito = feitos.has(data);
      if (feito) total += 1;
      const classes = ['quadro', feito ? 'quadro--feito' : '', data === hoje ? 'quadro--hoje' : '', data > hoje ? 'quadro--futuro' : ''].join(' ');
      partes.push(html`<span class="${classes}" style="grid-row: ${linha + 2}; grid-column: ${coluna + 2}" role="img" aria-label="${dataPorExtenso(data)}${feito ? ', feito' : ''}"></span>`);
    }
  }

  const unidade = habito.automatico ? (total === 1 ? 'treino' : 'treinos') : (total === 1 ? 'vez' : 'vezes');
  return html`
    <article class="habito">
      <header class="quadros-cabeca">
        <div>
          <h3 class="habito-nome">${habito.nome}</h3>
          <p class="habito-meta">${textoDaMeta(habito.meta)}${habito.automatico ? ', marcado pelos treinos' : ''}</p>
        </div>
        <p class="quadros-total"><strong>${total}</strong><span>${unidade}</span></p>
      </header>
      <div class="quadros" style="--semanas: ${semanas}" role="group" aria-label="${habito.nome}: ${total} ${unidade} no período">${partes}</div>
    </article>`;
}

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
