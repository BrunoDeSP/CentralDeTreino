import { html, cru } from '../ui/html.js';
import { avisar, confirmar } from '../ui/avisos.js';
import {
  CORES,
  LIMITE_DA_META,
  SUGESTOES,
  buscarHabito,
  criarHabito,
  editarHabito,
  excluirHabito,
  corLivre,
} from '../habitos/regras-dos-habitos.js';

// Criar ou editar um hábito: nome, meta (vezes por semana ou por mês) e cor.
// Rotas: #/habito/novo e #/habito/<id>.

export const titulo = 'Hábito';

let rascunho = null; // { id, nome, cor, vezes, periodo }, antes de salvar

export function render([id], { estado }) {
  const novo = !id || id === 'novo';
  const habito = novo ? null : buscarHabito(estado, id);

  if (!novo && !habito) {
    return html`
      <a class="voltar" href="#/habitos" data-acao="voltar">Voltar</a>
      <h1>Hábito não encontrado</h1>
      <p class="texto-apoio">Ele pode ter sido excluído.</p>
      <a class="botao botao--margem" href="#/habitos">Ver hábitos</a>`;
  }

  const chave = habito?.id ?? 'novo';
  if (!rascunho || rascunho.id !== chave) {
    rascunho = habito
      ? { id: chave, nome: habito.nome, cor: habito.cor, vezes: habito.meta.vezes, periodo: habito.meta.periodo }
      : { id: chave, nome: '', cor: corLivre(estado), vezes: 3, periodo: 'semana' };
  }
  const maximo = LIMITE_DA_META[rascunho.periodo];

  return html`
    <a class="voltar" href="#/habitos" data-acao="voltar">Voltar</a>
    <h1>${novo ? 'Novo hábito' : 'Editar hábito'}</h1>

    <form class="formulario" novalidate>
      <div class="campo">
        <label class="campo-rotulo" for="habito-nome">Nome</label>
        <input class="campo-texto" id="habito-nome" name="nome" type="text" maxlength="40" autocomplete="off" placeholder="Ex.: beber 2 L de água" value="${rascunho.nome}">
        ${novo
          ? html`<div class="sugestoes">${SUGESTOES.map((sugestao) => html`<button class="sugestao" type="button" data-acao="sugestao" data-nome="${sugestao}">${sugestao}</button>`)}</div>`
          : ''}
      </div>

      <fieldset class="escolha">
        <legend>Meta</legend>
        <div class="escolha-opcoes escolha-opcoes--texto" style="--colunas: 2">
          ${opcao('periodo', 'semana', 'Por semana', rascunho.periodo === 'semana')}
          ${opcao('periodo', 'mes', 'Por mês', rascunho.periodo === 'mes')}
        </div>
        <div class="ajuste ajuste--meta">
          <button class="passo-botao passo-botao--grande" type="button" data-acao="vezes" data-delta="-1" data-foco="vezes-menos" aria-label="Menos vezes" ${rascunho.vezes <= 1 ? cru('disabled') : ''}>−</button>
          <output class="ajuste-valor" aria-live="polite">${rascunho.vezes} ${rascunho.vezes === 1 ? 'vez' : 'vezes'}</output>
          <button class="passo-botao passo-botao--grande" type="button" data-acao="vezes" data-delta="1" data-foco="vezes-mais" aria-label="Mais vezes" ${rascunho.vezes >= maximo ? cru('disabled') : ''}>+</button>
        </div>
      </fieldset>

      <fieldset class="escolha">
        <legend>Cor</legend>
        <div class="cores">
          ${CORES.map((cor) => html`
            <label class="cor">
              <input type="radio" name="cor" value="${cor.id}" aria-label="${cor.nome}" ${rascunho.cor === cor.id ? cru('checked') : ''}>
              <span data-cor="${cor.id}"></span>
            </label>`)}
        </div>
      </fieldset>

      <button class="botao" type="submit">${novo ? 'Criar hábito' : 'Salvar alterações'}</button>
      ${novo ? '' : html`<button class="botao botao--texto botao--texto-perigo" type="button" data-acao="excluir">Excluir hábito</button>`}
    </form>`;
}

function opcao(nome, valor, rotulo, marcada) {
  return html`
    <label class="escolha-opcao">
      <input type="radio" name="${nome}" value="${valor}" ${marcada ? cru('checked') : ''}>
      <span>${rotulo}</span>
    </label>`;
}

export function aoSair() {
  rascunho = null;
}

export function aoMudar(evento, ctx) {
  const campo = evento.target;
  if (campo.name === 'nome') rascunho.nome = campo.value;
  if (campo.name === 'cor') rascunho.cor = campo.value;
  if (campo.name === 'periodo') {
    rascunho.periodo = campo.value;
    rascunho.vezes = Math.min(rascunho.vezes, LIMITE_DA_META[rascunho.periodo]);
    ctx.render();
  }
}

export const acoes = {
  sugestao({ nome }, ctx) {
    rascunho.nome = nome;
    ctx.render();
  },

  vezes({ delta }, ctx) {
    const nomeDigitado = document.getElementById('habito-nome')?.value;
    if (nomeDigitado !== undefined) rascunho.nome = nomeDigitado;
    rascunho.vezes = Math.min(LIMITE_DA_META[rascunho.periodo], Math.max(1, rascunho.vezes + Number(delta)));
    ctx.render();
  },

  async excluir(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Excluir o hábito?',
      texto: 'Os dias marcados nele também serão apagados. Não dá para desfazer.',
      botao: 'Excluir hábito',
      perigo: true,
    });
    if (!ok) return;
    const id = rascunho.id;
    await ctx.alterar((estado) => excluirHabito(estado, id));
    rascunho = null;
    ctx.ir('#/habitos');
    avisar('Hábito excluído');
  },
};

export async function aoEnviar(dados, ctx) {
  const nome = String(dados.get('nome') ?? '').trim();
  if (!nome) {
    avisar('Dê um nome para o hábito.');
    document.getElementById('habito-nome')?.focus();
    return;
  }
  const valores = {
    nome,
    cor: dados.get('cor') ?? rascunho.cor,
    periodo: dados.get('periodo') ?? rascunho.periodo,
    vezes: rascunho.vezes,
  };
  const novo = rascunho.id === 'novo';
  const id = rascunho.id;
  await ctx.alterar((estado) => (novo ? criarHabito(estado, valores) : editarHabito(buscarHabito(estado, id), valores)));
  rascunho = null;
  ctx.ir('#/habitos');
  avisar(novo ? 'Hábito criado. Ele já aparece no Início.' : 'Hábito salvo');
}
