import { html, cru } from '../ui/html.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { apagarTudo } from '../estado.js';
import { CONFIG } from '../config.js';
import { cancelarBipe, pararAcompanhamento } from '../ui/cronometro.js';
import { duracao } from '../util/texto.js';

// Configurações: tempo de pausa, comportamento durante o treino e dados.

export const titulo = 'Configurações';

const INTERRUPTORES = [
  {
    nome: 'pausaAutomatica',
    titulo: 'Começar a pausa sozinha',
    ajuda: 'Ao concluir uma série, o cronômetro já começa.',
  },
  {
    nome: 'alertaFimDaPausa',
    titulo: 'Som e vibração no fim da pausa',
    ajuda: 'Funciona com o app aberto. Em alguns celulares, só o som.',
  },
  {
    nome: 'telaLigada',
    titulo: 'Manter a tela ligada no treino',
    ajuda: 'Evita que o celular bloqueie no meio da pausa.',
  },
  {
    nome: 'checkupFeito',
    titulo: 'Check-up médico feito',
    ajuda: 'Libera o intervalado no cardio. O plano pede o check-up antes do esforço forte.',
  },
];

export function render(_params, { estado }) {
  const { configuracoes } = estado;
  const { min, max } = CONFIG.pausa;

  return html`
    <a class="voltar" href="#/hoje" data-acao="voltar">Voltar</a>
    <h1>Configurações</h1>

    <section class="secao secao--primeira">
      <h2>Tempo de pausa</h2>
      <div class="ajuste">
        <button class="passo-botao passo-botao--grande" type="button" data-acao="pausa" data-delta="-1" data-foco="pausa-menos" aria-label="Diminuir a pausa" ${configuracoes.pausaSegundos <= min ? cru('disabled') : ''}>−</button>
        <output class="ajuste-valor" aria-live="polite">${duracao(configuracoes.pausaSegundos)}</output>
        <button class="passo-botao passo-botao--grande" type="button" data-acao="pausa" data-delta="1" data-foco="pausa-mais" aria-label="Aumentar a pausa" ${configuracoes.pausaSegundos >= max ? cru('disabled') : ''}>+</button>
      </div>
      <p class="ajuda">Usado pelo botão de pausa durante o treino. Muda de 15 em 15 segundos.</p>
    </section>

    <section class="secao">
      <h2>Durante o treino</h2>
      <ul class="lista">
        ${INTERRUPTORES.map((interruptor) => html`<li>${chave(interruptor, configuracoes[interruptor.nome])}</li>`)}
      </ul>
    </section>

    <section class="secao">
      <h2>Dados</h2>
      <p class="texto-apoio secao-ajuda">Ciclos, histórico, cargas e hábitos ficam guardados neste celular.</p>
      <button class="botao botao--perigo" type="button" data-acao="apagar-tudo">Apagar todos os dados</button>
    </section>`;
}

function chave({ nome, titulo: tituloDaChave, ajuda }, ligada) {
  return html`
    <label class="chave">
      <span class="chave-texto">
        <span class="chave-titulo">${tituloDaChave}</span>
        <span class="chave-ajuda">${ajuda}</span>
      </span>
      <input type="checkbox" role="switch" name="${nome}" ${ligada ? cru('checked') : ''}>
      <span class="chave-trilho" aria-hidden="true"></span>
    </label>`;
}

export async function aoMudar(evento, ctx) {
  const campo = evento.target;
  if (campo.type !== 'checkbox') return;
  await ctx.alterar((estado) => {
    estado.configuracoes[campo.name] = campo.checked;
  });
}

export const acoes = {
  async pausa({ delta }, ctx) {
    const { min, max, passo } = CONFIG.pausa;
    await ctx.alterar((estado) => {
      const atual = estado.configuracoes.pausaSegundos;
      estado.configuracoes.pausaSegundos = Math.min(max, Math.max(min, atual + Number(delta) * passo));
    });
    ctx.render();
  },

  async 'apagar-tudo'(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Apagar todos os dados?',
      texto: 'Ciclos, histórico, cargas, hábitos e configurações deste celular serão apagados. Não dá para desfazer.',
      botao: 'Apagar tudo',
      perigo: true,
    });
    if (!ok) return;
    cancelarBipe();
    pararAcompanhamento();
    await apagarTudo();
    ctx.ir('#/hoje');
    avisar('Dados apagados');
  },
};
