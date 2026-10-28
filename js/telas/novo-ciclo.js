import { html, cru } from '../ui/html.js';
import { anilha } from '../ui/componentes.js';
import { avisar } from '../ui/avisos.js';
import { CONFIG } from '../config.js';
import { cicloAtivo, criarCiclo } from '../treino/regras-do-ciclo.js';
import { iniciarSessao } from '../treino/sessao.js';
import { resumoDoModelo } from '../treino/gerador.js';
import { dataCurta } from '../util/datas.js';

// Ela escolhe quantos dias por semana quer treinar e por quantas semanas.
// O gerador escolhe a divisão e monta os treinos. Vindo do botão "Criar
// ciclo" do Início (rota #/novo-ciclo/treinar), o primeiro treino já começa.

export const titulo = 'Novo ciclo';

let rascunho = null; // escolhas feitas na tela, antes de montar
let comecarDepois = false;

export function render([destino], { estado }) {
  comecarDepois = destino === 'treinar';
  const ativo = cicloAtivo(estado);
  rascunho ??= {
    dias: ativo?.diasPorSemana ?? CONFIG.diasPorSemana.padrao,
    semanas: ativo?.semanas ?? CONFIG.semanasPorCiclo.padrao,
  };

  const { min, max } = CONFIG.diasPorSemana;
  const opcoesDias = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return html`
    <a class="voltar" href="#/hoje" data-acao="voltar">Voltar</a>
    <h1>Novo ciclo</h1>

    <form class="formulario" novalidate>
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
        <p class="ajuda">Os exercícios ficam os mesmos até o fim do ciclo, para dar para aumentar a carga aos poucos.</p>
      </fieldset>

      ${ativo
        ? html`<p class="nota nota--atencao">Montar um novo ciclo encerra o atual, que começou em ${dataCurta(ativo.inicio)}.</p>`
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
  return html`
    <div class="previa-anilhas">
      ${modelo.treinos.map((treino) => anilha(treino.id, { tamanho: 'p' }))}
    </div>
    <p class="previa-nome">${modelo.nome}</p>
    <p class="previa-texto">${modelo.descricao}</p>`;
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
}

export async function aoEnviar(dados, ctx) {
  const diasPorSemana = Number(dados.get('dias'));
  const semanas = Number(dados.get('semanas'));
  const ciclo = await ctx.alterar((estado) => criarCiclo(estado, { diasPorSemana, semanas }));
  rascunho = null;

  if (comecarDepois) {
    await ctx.alterar((estado) => iniciarSessao(estado, ciclo.treinos[0].id));
    ctx.ir('#/sessao');
    avisar('Ciclo montado. Bom treino!');
    return;
  }
  ctx.ir('#/hoje');
  avisar('Ciclo montado');
}

export function aoSair() {
  rascunho = null;
}
