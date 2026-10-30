import { html, cru } from '../ui/html.js';
import { anilha } from '../ui/componentes.js';
import { avisar } from '../ui/avisos.js';
import { CONFIG } from '../config.js';
import { FASES, buscarFase } from '../dados/modelos.js';
import { cicloAtivo, criarCiclo, sugerirProximoCiclo } from '../treino/regras-do-ciclo.js';
import { iniciarSessao } from '../treino/sessao.js';
import { resumoDoModelo } from '../treino/gerador.js';
import { dataCurta } from '../util/datas.js';

// Ela escolhe a fase, quantos dias por semana quer treinar e por quantas
// semanas. O app já deixa marcada a fase que o plano sugere (regra dos 80%).
// Vindo do botão "Criar ciclo" do Início (rota #/novo-ciclo/treinar), o
// primeiro treino já começa.

export const titulo = 'Novo ciclo';

let rascunho = null; // escolhas feitas na tela, antes de montar
let comecarDepois = false;

export function render([destino], { estado }) {
  comecarDepois = destino === 'treinar';
  const ativo = cicloAtivo(estado);
  const sugestao = sugerirProximoCiclo(estado);
  rascunho ??= {
    fase: sugestao.fase,
    dias: sugestao.dias ?? ativo?.diasPorSemana ?? CONFIG.diasPorSemana.padrao,
    semanas: sugestao.semanas,
  };
  const { min, max } = CONFIG.diasPorSemana;
  const opcoesDias = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return html`
    <a class="voltar" href="#/hoje" data-acao="voltar">Voltar</a>
    <h1>Novo ciclo</h1>
    <form class="formulario" novalidate>
      <fieldset class="escolha">
        <legend>Qual fase?</legend>
        <div class="fases">
          ${FASES.map((fase) => html`
            <label class="fase-opcao">
              <input type="radio" name="fase" value="${fase.id}" ${fase.id === rascunho.fase ? cru('checked') : ''}>
              <span>
                <strong>${fase.nome}${fase.id === sugestao.fase ? html` <em class="fase-sugerida">sugerida</em>` : ''}</strong>
                <small>${fase.resumo}</small>
              </span>
            </label>`)}
        </div>
        <div class="nota nota--compacta fase-sugestao">
          <p>${sugestao.motivo}</p>
          ${sugestao.lembretes.map((lembrete) => html`<p>${lembrete}</p>`)}
          ${!estado.configuracoes.checkupFeito
            ? html`<p>O intervalado só entra depois do check-up médico. Marque em Configurações quando fizer.</p>`
            : ''}
        </div>
      </fieldset>

      <fieldset class="escolha">
        <legend>Quantos dias por semana?</legend>
        <div class="escolha-opcoes" style="--colunas: ${opcoesDias.length}">
          ${opcoesDias.map((n) => opcao('dias', n, n === rascunho.dias))}
        </div>
      </fieldset>
      <div class="previa" id="previa" aria-live="polite">${previa(rascunho.dias)}</div>

      <fieldset class="escolha">
        <legend>Por quantas semanas?</legend>
        <div class="escolha-opcoes" style="--colunas: ${CONFIG.semanasPorCiclo.opcoes.length}">
          ${CONFIG.semanasPorCiclo.opcoes.map((n) => opcao('semanas', n, n === rascunho.semanas))}
        </div>
        <p class="ajuda">Cada fase dura 4 semanas, e a semana leve, 1. Os exercícios ficam os mesmos até o fim do ciclo, para a carga subir aos poucos.</p>
      </fieldset>
      ${ativo
        ? html`<p class="nota nota--atencao">Montar um novo ciclo encerra o atual, que começou em ${dataCurta(ativo.inicio)}. O histórico e as cargas continuam salvos.</p>`
        : ''}
      <button class="botao" type="submit">${comecarDepois ? 'Montar ciclo e começar' : 'Montar ciclo'}</button>
    </form>`;
}

function opcao(nome, valor, marcada) {
  return html`
    <label class="escolha-opcao">
      <input type="radio" name="${nome}" value="${valor}" ${marcada ? cru('checked') : ''}>
      <span>${valor}</span>
    </label>`;
}

function previa(dias) {
  const modelo = resumoDoModelo(dias);
  if (!modelo) return '';
  const [minimo, maximo] = modelo.cardio;
  return html`
    <div class="previa-anilhas">
      ${modelo.treinos.map((treino) => anilha(treino.id, { tamanho: 'p' }))}
    </div>
    <p class="previa-nome">${modelo.nome}</p>
    <p class="previa-texto">${modelo.descricao}</p>
    <p class="previa-texto">Cerca de ${modelo.tempo} por treino, com ${minimo} a ${maximo} min de cardio no fim.</p>`;
}

export function aoMudar(evento) {
  const campo = evento.target;
  if (campo.name === 'dias') {
    rascunho.dias = Number(campo.value);
    document.getElementById('previa').innerHTML = String(previa(rascunho.dias));
  }
  if (campo.name === 'semanas') {
    rascunho.semanas = Number(campo.value);
  }
  if (campo.name === 'fase') {
    rascunho.fase = campo.value;
    rascunho.semanas = buscarFase(campo.value).semanas;
    const semanas = document.querySelector(`input[name="semanas"][value="${rascunho.semanas}"]`);
    if (semanas) semanas.checked = true;
  }
}

export async function aoEnviar(dados, ctx) {
  const diasPorSemana = Number(dados.get('dias'));
  const semanas = Number(dados.get('semanas'));
  const fase = String(dados.get('fase') || 'construcao');
  const ciclo = await ctx.alterar((estado) => criarCiclo(estado, { diasPorSemana, semanas, fase }));
  rascunho = null;
  const nomeDaFase = buscarFase(fase).nome;
  if (comecarDepois) {
    await ctx.alterar((estado) => iniciarSessao(estado, ciclo.treinos[0].id));
    ctx.ir('#/sessao');
    avisar(`Ciclo de ${nomeDaFase} montado. Bom treino!`);
    return;
  }
  ctx.ir('#/hoje');
  avisar(`Ciclo de ${nomeDaFase} montado`);
}

export function aoSair() {
  rascunho = null;
}
