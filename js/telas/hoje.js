import { html, cru } from '../ui/html.js';
import { barraDaSemana, barraVazia } from '../ui/componentes.js';
import { cartaoDeHabito } from '../ui/calendario.js';
import { avisar } from '../ui/avisos.js';
import { cicloAtivo, proximoTreino, resumoDaSemana, cicloConcluido } from '../treino/regras-do-ciclo.js';
import { progresso } from '../treino/sessao.js';
import { habitoDosTreinos, buscarHabito, alternarDia, progressoAtual } from '../habitos/regras-dos-habitos.js';
import { hojeISO, dataCurta, dataPorExtenso, mesDe, somarMeses, mesmoMes, nomeDoMes } from '../util/datas.js';
import { plural } from '../util/texto.js';
import { concluirComAviso, iniciarOuContinuar } from './comum.js';

// Tela inicial (rota #/hoje): o botão do treino, com a semana, e o
// rastreador de hábitos com o calendário do mês.

export const titulo = 'Início';

let mesVisivel = null; // mês mostrado nos calendários dos hábitos

const SETA_ESQUERDA = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>');
const SETA_DIREITA = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>');

export function render(_params, { estado, extras }) {
  const hoje = hojeISO();
  mesVisivel ??= mesDe(hoje);
  return html`
    <h1 class="inicio-data">${capitalizar(dataPorExtenso(hoje))}</h1>
    ${painelDoTreino(estado, extras)}
    ${secaoDeHabitos(estado, hoje, extras)}`;
}

export function aoSair() {
  mesVisivel = null; // ao voltar, o calendário abre no mês atual
}

// --- Treino ------------------------------------------------------------------

function painelDoTreino(estado, extras) {
  const ciclo = cicloAtivo(estado);
  const sessao = estado.sessaoEmAndamento;

  if (sessao) {
    const { feitas, total } = progresso(sessao);
    return html`
      <section class="painel-treino" data-anilha="${sessao.treinoId.toLowerCase()}" aria-label="Treino">
        ${ciclo ? semana(ciclo, extras) : ''}
        <div class="treino-acoes">
          <a class="botao botao--anilha" href="#/sessao">Continuar treino ${sessao.treinoId}</a>
          <p class="treino-acoes-nota">${feitas} de ${total} séries feitas</p>
        </div>
      </section>`;
  }

  if (!ciclo) {
    return html`
      <section class="painel-treino" aria-label="Treino">
        ${barraVazia()}
        <p class="painel-convite">Monte seu ciclo de treinos: escolha quantos dias por semana quer treinar e o app organiza o resto.</p>
        <div class="treino-acoes">
          <a class="botao" href="#/novo-ciclo/treinar">Criar ciclo</a>
        </div>
      </section>`;
  }

  const treino = proximoTreino(ciclo);
  return html`
    <section class="painel-treino" data-anilha="${treino.id.toLowerCase()}" aria-label="Treino">
      ${semana(ciclo, extras)}
      <div class="treino-acoes">
        <button class="botao botao--anilha" type="button" data-acao="iniciar" data-treino="${treino.id}">Começar treino ${treino.id}</button>
        <p class="treino-acoes-nota">${treino.foco}, ${plural(treino.exercicios.length, 'exercício')}</p>
        <button class="botao botao--texto" type="button" data-acao="concluir" data-treino="${treino.id}">Já fiz, só marcar como feito</button>
      </div>
    </section>`;
}

function semana(ciclo, extras) {
  const resumo = resumoDaSemana(ciclo);
  return html`
    ${cicloConcluido(ciclo)
      ? html`
        <div class="faixa">
          <p><strong>O ciclo de ${ciclo.semanas} semanas terminou.</strong> Bom momento para refazer a bioimpedância e montar o próximo.</p>
          <a class="botao botao--secundario" href="#/novo-ciclo">Montar novo ciclo</a>
        </div>`
      : html`<p class="contexto">Semana ${resumo.semana.numero} de ${ciclo.semanas}, de ${dataCurta(resumo.semana.inicio)} a ${dataCurta(resumo.semana.fim)}</p>`}
    ${barraDaSemana(resumo, { destaque: extras.destaque })}
    <p class="semana-legenda">${legenda(resumo)}</p>`;
}

function legenda({ feitos, meta }) {
  if (feitos < meta) {
    return html`<strong>${feitos} de ${meta}</strong> ${meta === 1 ? 'treino' : 'treinos'} nesta semana`;
  }
  if (feitos === meta) {
    return html`<strong>Semana completa:</strong> ${feitos} de ${meta} ${meta === 1 ? 'treino' : 'treinos'}`;
  }
  return html`<strong>Semana completa,</strong> com ${plural(feitos - meta, 'treino extra', 'treinos extras')}`;
}

// --- Hábitos -----------------------------------------------------------------

function secaoDeHabitos(estado, hoje, extras) {
  const mesAtual = mesmoMes(mesVisivel, mesDe(hoje));
  const habitos = [habitoDosTreinos(estado), ...estado.habitos];
  return html`
    <section class="secao" aria-labelledby="titulo-habitos">
      <h2 id="titulo-habitos">Hábitos</h2>
      <div class="mes">
        <button class="mes-botao" type="button" data-acao="mes" data-delta="-1" data-foco="mes-anterior" aria-label="Mês anterior">${SETA_ESQUERDA}</button>
        <span class="mes-nome" aria-live="polite">${capitalizar(nomeDoMes(mesVisivel))}</span>
        <button class="mes-botao" type="button" data-acao="mes" data-delta="1" data-foco="mes-seguinte" aria-label="Mês seguinte" ${mesAtual ? cru('disabled') : ''}>${SETA_DIREITA}</button>
      </div>
      ${habitos.map((habito) => cartaoDeHabito(habito, { hoje, mes: mesVisivel, mesAtual, destaque: extras.marcado }))}
      ${estado.habitos.length === 0
        ? html`
          <div class="convite">
            <p>Crie hábitos para acompanhar aqui, como beber água ou caminhar, cada um com a meta que você quiser: por semana ou por mês.</p>
            <a class="botao botao--secundario" href="#/habito/novo">Criar hábito</a>
          </div>`
        : ''}
    </section>`;
}

export const acoes = {
  iniciar: ({ treino }, ctx) => iniciarOuContinuar(treino, ctx),
  concluir: ({ treino }, ctx) => concluirComAviso(treino, ctx),

  mes({ delta }, ctx) {
    const destino = somarMeses(mesVisivel, Number(delta));
    const atual = mesDe(hojeISO());
    if (destino.ano * 12 + destino.mes > atual.ano * 12 + atual.mes) return;
    mesVisivel = destino;
    ctx.render();
  },

  dia: ({ habito, data }, ctx) => marcar(habito, data, ctx),
  'marcar-hoje': ({ habito }, ctx) => marcar(habito, hojeISO(), ctx),
};

async function marcar(id, data, ctx) {
  const habito = buscarHabito(ctx.estado, id);
  if (!habito || data > hojeISO()) return;

  const antes = progressoAtual(habito).feitas;
  const marcou = await ctx.alterar(() => alternarDia(habito, data));
  const { feitas, meta, periodo } = progressoAtual(habito);
  ctx.render({ marcado: marcou ? `${id}:${data}` : null });

  if (marcou && antes < meta && feitas >= meta) {
    avisar(`Meta ${periodo === 'semana' ? 'da semana' : 'do mês'} batida: ${habito.nome}`);
  }
}

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
