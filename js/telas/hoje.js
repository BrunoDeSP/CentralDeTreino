import { html } from '../ui/html.js';
import { cartaoDeHabito, semanaDeTreino, navegacaoDeMes, moverMes } from '../ui/calendario.js';
import { avisar } from '../ui/avisos.js';
import { cicloAtivo, proximoTreino, cicloConcluido, resumoDaSemana, adicionarTreino, removerTreinoAdicionado } from '../treino/regras-do-ciclo.js';
import { progresso, rotuloDaSessao } from '../treino/sessao.js';
import { habitoDosTreinos, buscarHabito, alternarDia, progressoAtual } from '../habitos/regras-dos-habitos.js';
import { hojeISO, dataPorExtenso, dataComDiaDaSemana, mesDe, somarDias } from '../util/datas.js';
import { plural, nomeNaFrase } from '../util/texto.js';
import { concluirComAviso, iniciarOuContinuar } from './comum.js';

// Tela inicial (rota #/hoje): a semana de treino com o botão de começar e os
// hábitos com o calendário do mês. O dourado das metas batidas fica aqui.
// Quando os treinos da semana do ciclo estão feitos, o botão vira
// "Adicionar treino", com o próximo da ordem dos dias a mais.

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
    const { letra, nome } = rotuloDaSessao(sessao);
    return html`
      <div class="treino-acoes" data-anilha="${letra.toLowerCase()}">
        <a class="botao botao--anilha" href="#/sessao">Continuar ${nomeNaFrase(nome)}</a>
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

  const semana = resumoDaSemana(ciclo);
  if (!semana.completa) return botaoDoTreino(proximoTreino(ciclo));
  if (semana.pendente) return botaoDoTreino(semana.pendente, { aMais: true });
  return semanaFeita(semana, ciclo);
}

function botaoDoTreino(treino, { aMais = false } = {}) {
  const letra = treino.letra ?? treino.id;
  const nome = treino.nome ?? `Treino ${treino.id}`;
  const detalhe = treino.exercicios.length
    ? plural(treino.exercicios.length, 'exercício')
    : `${treino.cardio.minutos[0]} a ${treino.cardio.minutos[1]} min`;
  return html`
    <div class="treino-acoes" data-anilha="${letra.toLowerCase()}">
      <button class="botao botao--anilha" type="button" data-acao="iniciar" data-treino="${treino.id}">Começar ${nomeNaFrase(nome)}</button>
      <p class="treino-acoes-nota">${treino.foco}, ${detalhe}${aMais ? ', a mais nesta semana' : ''}</p>
      <button class="botao botao--texto" type="button" data-acao="concluir" data-treino="${treino.id}">Já fiz, só marcar como feito</button>
    </div>`;
}

// Treinos da semana do ciclo feitos: oferece o próximo da ordem dos dias a
// mais ou, com 6 treinos, lembra do descanso.
function semanaFeita(semana, ciclo) {
  const feitos = semana.meta === 1 ? 'O treino da semana está feito' : `Os ${semana.meta} treinos da semana estão feitos`;
  const alem = semana.alemDaMeta ? `, e mais ${semana.alemDaMeta}` : '';
  const proxima = semana.semana.numero < ciclo.semanas
    ? ` A próxima semana do ciclo começa ${dataComDiaDaSemana(somarDias(semana.semana.fim, 1))}.`
    : '';

  if (!semana.podeAdicionar) {
    return html`
      <div class="treino-acoes">
        <p class="semana-feita"><strong>Semana cheia: ${plural(semana.feitos, 'treino')}.</strong> O 7º dia é descanso.${proxima}</p>
      </div>`;
  }

  const treino = semana.proximoAdicional;
  return html`
    <div class="treino-acoes">
      <p class="semana-feita"><strong>${feitos}${alem}.</strong>${proxima}</p>
      <button class="botao botao--secundario" type="button" data-acao="adicionar">Adicionar treino</button>
      <p class="treino-acoes-nota">Próximo da ordem: ${treino.nome}, ${treino.foco.toLowerCase()}</p>
    </div>`;
}

// Põe o próximo da ordem na semana, com "Desfazer" para um toque sem querer.
async function adicionarComAviso(ctx) {
  const treino = await ctx.alterar((estado) => adicionarTreino(cicloAtivo(estado)));
  ctx.render();
  avisar(`${treino.nome} adicionado à semana`, {
    acao: 'Desfazer',
    aoClicar: async () => {
      const tirou = await ctx.alterar((estado) => {
        const ciclo = cicloAtivo(estado);
        if (!ciclo || estado.sessaoEmAndamento?.treinoId === treino.id) return false;
        return removerTreinoAdicionado(ciclo, treino.id);
      });
      ctx.render();
      avisar(tirou ? 'Treino tirado da semana' : 'O treino já começou, então continua na semana');
    },
  });
}

export const acoes = {
  iniciar: ({ treino }, ctx) => iniciarOuContinuar(treino, ctx),
  concluir: ({ treino }, ctx) => concluirComAviso(treino, ctx),
  adicionar: (_dados, ctx) => adicionarComAviso(ctx),
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
