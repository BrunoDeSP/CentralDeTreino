import { html } from '../ui/html.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { barraVazia } from '../ui/componentes.js';
import { cancelarBipe, pararAcompanhamento } from '../ui/cronometro.js';
import { cicloAtivo, ciclosEncerrados, concluirTreino, desfazerSessao, buscarTreino, nomeDoTreino } from '../treino/regras-do-ciclo.js';
import { iniciarSessao, finalizarSessao, desfazerFinalizacao, progresso, rotuloDaSessao } from '../treino/sessao.js';
import { dataCurta } from '../util/datas.js';
import { plural, nomeNaFrase } from '../util/texto.js';

// Nome de um treino do ciclo atual ("Treino A", "Inferior A"...).
function nomeDe(estado, treinoId) {
  const ciclo = cicloAtivo(estado);
  return nomeDoTreino(ciclo ? buscarTreino(ciclo, treinoId) : null, treinoId);
}

// Marca o treino como feito sem registrar séries (o "Já fiz"), volta para
// "Hoje" (onde a anilha encaixa na barra) e oferece "Desfazer".
export async function concluirComAviso(treinoId, ctx) {
  const sessao = await ctx.alterar((estado) => concluirTreino(cicloAtivo(estado), treinoId));
  ctx.ir('#/hoje', { destaque: sessao.id });

  avisar(`${nomeDe(ctx.estado, treinoId)} concluído`, {
    acao: 'Desfazer',
    aoClicar: async () => {
      await ctx.alterar((estado) => {
        const ciclo = cicloAtivo(estado);
        if (ciclo) desfazerSessao(ciclo, sessao.id);
      });
      ctx.render();
      avisar('Conclusão desfeita');
    },
  });
}

// Começa o treino, ou volta para ele se já estiver em andamento.
export async function iniciarOuContinuar(treinoId, ctx) {
  const atual = ctx.estado.sessaoEmAndamento;
  if (atual && atual.treinoId !== treinoId) {
    const nome = nomeDe(ctx.estado, treinoId);
    const ok = await confirmar({
      titulo: `Começar o ${nome}?`,
      texto: `O ${rotuloDaSessao(atual).nome} está em andamento. As séries marcadas nele serão descartadas.`,
      botao: `Começar ${nomeNaFrase(nome)}`,
      perigo: true,
    });
    if (!ok) return;
    cancelarBipe();
    pararAcompanhamento();
  }
  if (!atual || atual.treinoId !== treinoId) {
    await ctx.alterar((estado) => iniciarSessao(estado, treinoId));
  }
  ctx.ir('#/sessao');
}

// Fecha o treino em andamento, atualiza as cargas e oferece "Desfazer"
// (que reabre o treino do jeito que estava).
export async function finalizarComAviso(ctx) {
  cancelarBipe();
  pararAcompanhamento();
  const resultado = await ctx.alterar((estado) => finalizarSessao(estado));
  const { nome } = rotuloDaSessao(resultado.sessao);
  const subiram = resultado.mudancas.filter((mudanca) => mudanca.decisao === 'subir').length;
  ctx.ir('#/hoje', { destaque: resultado.registro?.id ?? null });

  const texto = subiram
    ? `${nome} concluído. ${plural(subiram, 'exercício sobe', 'exercícios sobem')} de carga.`
    : `${nome} concluído`;
  avisar(texto, {
    acao: 'Desfazer',
    duracao: 8000,
    aoClicar: async () => {
      await ctx.alterar((estado) => desfazerFinalizacao(estado, resultado));
      ctx.ir('#/sessao');
      avisar('Treino reaberto');
    },
  });
}

// Botões do card de treino (tela Hoje e página do treino).
export function botoesDoTreino(treino, estado) {
  const sessao = estado.sessaoEmAndamento;
  const nome = nomeNaFrase(nomeDoTreino(treino));
  if (sessao?.treinoId === treino.id) {
    const { feitas, total } = progresso(sessao);
    return html`
      <div class="treino-acoes">
        <a class="botao botao--anilha" href="#/sessao">Continuar ${nome}</a>
        <p class="treino-acoes-nota">${feitas} de ${total} séries feitas</p>
      </div>`;
  }
  return html`
    <div class="treino-acoes">
      <button class="botao botao--anilha" type="button" data-acao="iniciar" data-treino="${treino.id}">Iniciar ${nome}</button>
      <button class="botao botao--texto" type="button" data-acao="concluir" data-treino="${treino.id}">Já fiz, só marcar como feito</button>
    </div>`;
}

// Aviso de treino em andamento, quando ele não é o treino mostrado na tela.
export function faixaDeSessao(estado, treinoMostradoId = null) {
  const sessao = estado.sessaoEmAndamento;
  if (!sessao || sessao.treinoId === treinoMostradoId) return '';
  const { feitas, total } = progresso(sessao);
  const { letra, nome } = rotuloDaSessao(sessao);
  return html`
    <div class="faixa faixa--treino" data-anilha="${letra.toLowerCase()}">
      <p><strong>${nome} em andamento:</strong> ${feitas} de ${total} séries feitas.</p>
      <a class="botao botao--anilha" href="#/sessao">Continuar ${nomeNaFrase(nome)}</a>
    </div>`;
}

// O que aparece quando não existe ciclo ativo.
export function telaSemCiclo(estado) {
  const anterior = ciclosEncerrados(estado).at(-1);
  const titulo = anterior ? 'Monte o próximo ciclo' : 'Monte seus treinos';
  const texto = anterior
    ? `O ciclo anterior terminou em ${dataCurta(anterior.fim)}. Escolha quantos dias quer treinar nas próximas semanas.`
    : 'Escolha quantos dias por semana você quer treinar. O app divide os treinos e organiza a semana para você.';

  return html`
    <section class="vazio">
      ${barraVazia()}
      <h1>${titulo}</h1>
      <p>${texto}</p>
      <a class="botao" href="#/novo-ciclo">Montar ciclo</a>
    </section>`;
}
