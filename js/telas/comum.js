import { html } from '../ui/html.js';
import { avisar } from '../ui/avisos.js';
import { barraVazia } from '../ui/componentes.js';
import { cicloAtivo, ciclosEncerrados, concluirTreino, desfazerSessao } from '../treino/regras-do-ciclo.js';
import { dataCurta } from '../util/datas.js';

// Conclui o treino, volta para "Hoje" (onde a anilha encaixa na barra) e
// oferece "Desfazer" caso tenha sido um toque sem querer.
export async function concluirComAviso(treinoId, ctx) {
  const sessao = await ctx.alterar((estado) => concluirTreino(cicloAtivo(estado), treinoId));
  ctx.ir('#/hoje', { destaque: sessao.id });

  avisar(`Treino ${treinoId} concluído`, {
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
