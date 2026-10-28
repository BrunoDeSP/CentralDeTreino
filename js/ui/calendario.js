import { html, cru } from './html.js';
import { diasDoMes, diaDaSemana, dataPorExtenso, nomeDoMes } from '../util/datas.js';
import { progressoAtual, resumoDoMes, textoDaMeta } from '../habitos/regras-dos-habitos.js';
import { plural } from '../util/texto.js';

// Cartão de hábito: calendário do mês, contador da meta e botão de marcar.
// Os dias feitos ficam cheios, na cor do hábito. Os outros ficam neutros,
// sem marca de falha: o destaque é sempre o que ela já fez.

const LETRAS_DA_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const ICONE_FEITO = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>');

export function cartaoDeHabito(habito, { hoje, mes, mesAtual, destaque = null }) {
  const feitos = new Set(habito.dias);
  const progresso = mesAtual && habito.meta ? progressoAtual(habito, hoje) : null;
  const bateuMeta = Boolean(progresso) && progresso.feitas >= progresso.meta;

  return html`
    <article class="habito" data-cor="${habito.cor}">
      <header class="habito-cabeca">
        <div>
          <h3 class="habito-nome">${habito.nome}</h3>
          <p class="habito-meta">${habito.automatico ? 'Marcado quando você conclui um treino' : textoDaMeta(habito.meta)}</p>
        </div>
        ${bateuMeta ? html`<span class="habito-selo">${ICONE_FEITO}Meta batida</span>` : ''}
      </header>
      ${progresso ? contador(progresso, mes) : ''}
      ${calendario(habito, feitos, mes, hoje, destaque)}
      ${resumo(habito, mes, mesAtual)}
      ${!habito.automatico && mesAtual ? marcarHoje(habito, feitos.has(hoje)) : ''}
    </article>`;
}

// Bolinhas para metas semanais (até 7) e barra para metas do mês.
function contador({ feitas, meta, periodo }, mes) {
  const quando = periodo === 'semana' ? 'nesta semana' : `em ${nomeDoMes(mes, { comAno: false })}`;
  const visual = periodo === 'semana'
    ? html`<span class="pips" aria-hidden="true">${Array.from({ length: meta }, (_, i) => html`<span class="pip ${i < feitas ? 'pip--cheio' : ''}"></span>`)}</span>`
    : html`<span class="meta-barra" aria-hidden="true"><span style="width: ${Math.min(100, Math.round((feitas / meta) * 100))}%"></span></span>`;
  return html`
    <div class="habito-progresso">
      ${visual}
      <p class="habito-contagem"><strong>${feitas} de ${meta}</strong> ${quando}</p>
    </div>`;
}

function calendario(habito, feitos, mes, hoje, destaque) {
  const dias = diasDoMes(mes);
  const antes = diaDaSemana(dias[0]);
  return html`
    <div class="calendario">
      <div class="calendario-semana" aria-hidden="true">${LETRAS_DA_SEMANA.map((letra) => html`<span>${letra}</span>`)}</div>
      <div class="calendario-dias">
        ${Array.from({ length: antes }, () => html`<span class="dia dia--vazio" aria-hidden="true"></span>`)}
        ${dias.map((data) => dia(habito, data, feitos.has(data), hoje, destaque === `${habito.id}:${data}`))}
      </div>
    </div>`;
}

function dia(habito, data, feito, hoje, recemMarcado) {
  const classes = [
    'dia',
    feito ? 'dia--feito' : '',
    data === hoje ? 'dia--hoje' : '',
    data > hoje ? 'dia--futuro' : '',
    recemMarcado && feito ? 'dia--novo' : '',
  ].join(' ');
  const rotulo = `${dataPorExtenso(data)}${feito ? ', feito' : ''}`;
  const numero = Number(data.slice(8));

  // Treinos são marcados sozinhos e dias futuros ainda não podem ser marcados.
  if (habito.automatico || data > hoje) {
    return html`<span class="${classes}" role="img" aria-label="${rotulo}">${numero}</span>`;
  }
  return html`<button class="${classes}" type="button" data-acao="dia" data-habito="${habito.id}" data-data="${data}" data-foco="dia-${habito.id}-${data}" aria-pressed="${feito ? 'true' : 'false'}" aria-label="${rotulo}">${numero}</button>`;
}

function resumo(habito, mes, mesAtual) {
  const { total, semanasComMeta, metaDoMes } = resumoDoMes(habito, mes);
  const nomeMes = nomeDoMes(mes, { comAno: false });
  if (total === 0) {
    if (!mesAtual) return '';
    const convite = habito.automatico
      ? 'Os treinos concluídos aparecem aqui.'
      : 'Os dias marcados ficam em destaque no calendário.';
    return html`<p class="habito-resumo">${convite}</p>`;
  }
  const partes = [habito.automatico ? `${plural(total, 'treino')} em ${nomeMes}` : `${plural(total, 'vez', 'vezes')} em ${nomeMes}`];
  if (semanasComMeta > 0) partes.push(`meta batida em ${plural(semanasComMeta, 'semana')}`);
  if (metaDoMes) partes.push('meta do mês batida');
  return html`<p class="habito-resumo">${partes.join(', ')}</p>`;
}

function marcarHoje(habito, feitoHoje) {
  if (feitoHoje) return html`<p class="habito-hoje">${ICONE_FEITO}Feito hoje</p>`;
  return html`<button class="botao botao--habito" type="button" data-acao="marcar-hoje" data-habito="${habito.id}" data-foco="hoje-${habito.id}">Marcar hoje</button>`;
}
