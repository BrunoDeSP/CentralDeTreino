import { html } from '../ui/html.js';
import { cartaoDeHabito, semanaDeTreino, navegacaoDeMes, moverMes } from '../ui/calendario.js';
import { avisar } from '../ui/avisos.js';
import { cicloAtivo, proximoTreino, cicloConcluido } from '../treino/regras-do-ciclo.js';
import { progresso } from '../treino/sessao.js';
import { habitoDosTreinos, buscarHabito, alternarDia, progressoAtual } from '../habitos/regras-dos-habitos.js';
import { hojeISO, dataPorExtenso, mesDe } from '../util/datas.js';
import { plural } from '../util/texto.js';
import { concluirComAviso, iniciarOuContinuar } from './comum.js';

// Tela inicial (rota #/hoje): a semana de treino com o botão de começar e os
// hábitos com o calendário do mês. O dourado das metas batidas fica aqui.

export const titulo = 'Início';

let mesVisivel = null; // mês mostrado nos calendários dos hábitos

export function render(_params, { estado, extras }) {
  const hoje = hojeISO();
  mesVisivel ??= mesDe(hoje);
  const treinos = habitoDosTreinos(estado);

  return html`
    <div class="inicio-topo">
      <h1 class="inicio-data">${capitalizar(dataPorExtenso(hoje))}</h1>
      <a class="inicio-ajustes" href="#/configuracoes" aria-label="Configurações">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /><circle cx="12" cy="12" r="6.6" /></svg>
      </a>
    </div>

    <section class="painel-treino" aria-label="Treino">
      ${avisoDeFimDoCiclo(estado)}
      ${semanaDeTreino(treinos, hoje, { recemFeito: Boolean(extras.destaque) })}
      ${acoesDoTreino(estado)}
    </section>

    <section class="secao" aria-labelledby="titulo-habitos">
      <h2 id="titulo-habitos">Hábitos</h2>
      ${navegacaoDeMes(mesVisivel)}
      ${[treinos, ...estado.habitos].map((habito) => cartaoDeHabito(habito, { hoje, mes: mesVisivel, destaque: extras.marcado }))}
      ${estado.habitos.length === 0
        ? html`
          <div class="convite">
            <p>Crie hábitos para acompanhar aqui, como beber água ou caminhar, cada um com a meta que você quiser: por semana ou por mês.</p>
            <a class="botao botao--secundario" href="#/habito/novo">Criar hábito</a>
          </div>`
        : ''}
    </section>`;
}

export function aoSair() {
  mesVisivel = null; // ao voltar, o calendário abre no mês atual
}

function avisoDeFimDoCiclo(estado) {
  const ciclo = cicloAtivo(estado);
  if (!ciclo || !cicloConcluido(ciclo)) return '';
  return html`
    <div class="faixa">
      <p><strong>O ciclo de ${plural(ciclo.semanas, 'semana')} terminou.</strong> Bom momento para refazer a bioimpedância e montar o próximo.</p>
      <a class="botao botao--secundario" href="#/novo-ciclo">Montar novo ciclo</a>
    </div>`;
}

function acoesDoTreino(estado) {
  const sessao = estado.sessaoEmAndamento;
  if (sessao) {
    const { feitas, total } = progresso(sessao);
    return html`
      <div class="treino-acoes" data-anilha="${sessao.treinoId.toLowerCase()}">
        <a class="botao botao--anilha" href="#/sessao">Continuar treino ${sessao.treinoId}</a>
        <p class="treino-acoes-nota">${total ? `${feitas} de ${total} séries feitas` : 'Cardio em andamento'}</p>
      </div>`;
  }

  const ciclo = cicloAtivo(estado);
  if (!ciclo) {
    return html`
      <div class="treino-acoes">
        <p class="painel-convite">Monte seu ciclo de treinos: escolha quantos dias por semana quer treinar e o app organiza o resto.</p>
        <a class="botao" href="#/novo-ciclo/treinar">Criar ciclo</a>
      </div>`;
  }

  const treino = proximoTreino(ciclo);
  return html`
    <div class="treino-acoes" data-anilha="${treino.id.toLowerCase()}">
      <button class="botao botao--anilha" type="button" data-acao="iniciar" data-treino="${treino.id}">Começar treino ${treino.id}</button>
      <p class="treino-acoes-nota">${treino.foco}${treino.exercicios.length ? `, ${plural(treino.exercicios.length, 'exercício')}` : `, ${treino.cardio.minutos[0]} a ${treino.cardio.minutos[1]} min`}</p>
      <button class="botao botao--texto" type="button" data-acao="concluir" data-treino="${treino.id}">Já fiz, só marcar como feito</button>
    </div>`;
}

export const acoes = {
  iniciar: ({ treino }, ctx) => iniciarOuContinuar(treino, ctx),
  concluir: ({ treino }, ctx) => concluirComAviso(treino, ctx),
  dia: ({ habito, data }, ctx) => marcar(habito, data, ctx),
  mes({ delta }, ctx) {
    mesVisivel = moverMes(mesVisivel, Number(delta));
    ctx.render();
  },
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
