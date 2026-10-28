import { html, cru } from '../ui/html.js';
import { anilha } from '../ui/componentes.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { buscarExercicio } from '../dados/exercicios.js';
import { lerEstado } from '../estado.js';
import { usaCarga, registroDe, descreverSeries, LIMITE_SEM_EVOLUIR } from '../treino/progressao.js';
import {
  sessaoAtual,
  serieAtual,
  progresso,
  alternarSerie,
  definirValor,
  passoDoCampo,
  iniciarPausa,
  ajustarPausa,
  encerrarPausa,
  pausaAtiva,
  cancelarSessao,
  definirCardio,
} from '../treino/sessao.js';
import {
  prepararAudio,
  agendarBipe,
  cancelarBipe,
  vibrar,
  acompanharPausa,
  pararAcompanhamento,
  manterTelaLigada,
} from '../ui/cronometro.js';
import { kg, numero, tempo } from '../util/texto.js';
import { finalizarComAviso } from './comum.js';
import { TIPOS_DE_CARDIO, MINUTOS_DE_CARDIO } from '../dados/regioes.js';

// Treino em andamento: uma série por vez, com a carga sugerida, o registro do
// que ela fez e o cronômetro de pausa. Tudo é salvo a cada toque.

export const titulo = 'Treino em andamento';

const ICONE_FEITO = cru('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>');

export function render(_params, { estado }) {
  const sessao = sessaoAtual(estado);
  if (!sessao) {
    return html`
      <section class="vazio">
        <h1>Nenhum treino em andamento</h1>
        <p>Comece um treino pela tela Hoje.</p>
        <a class="botao" href="#/hoje">Ir para Hoje</a>
      </section>`;
  }

  const { feitas, total } = progresso(sessao);
  const atual = serieAtual(sessao);
  const porcentagem = total ? Math.round((feitas / total) * 100) : 0;

  return html`
    <div class="sessao" data-anilha="${sessao.treinoId.toLowerCase()}">
      <a class="voltar" href="#/hoje" data-acao="voltar">Voltar</a>
      <header class="sessao-cabeca">
        ${anilha(sessao.treinoId, { tamanho: 'g' })}
        <div>
          <h1>Treino ${sessao.treinoId}</h1>
          <p class="sessao-contagem">${feitas} de ${total} ${total === 1 ? 'série feita' : 'séries feitas'}</p>
        </div>
      </header>
      <div class="sessao-progresso" role="progressbar" aria-label="Séries feitas" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${feitas}">
        <span style="width: ${porcentagem}%"></span>
      </div>

      ${sessao.circuito ? porVolta(sessao, atual, estado) : porExercicio(sessao, atual, estado)}

      ${sessao.cardio ? cartaoDeCardio(sessao, atual) : ''}

      <div class="sessao-fim" id="fim-do-treino">
        <button class="botao botao--anilha" type="button" data-acao="finalizar" data-foco="finalizar">Finalizar treino</button>
        <button class="botao botao--texto" type="button" data-acao="cancelar">Cancelar treino</button>
      </div>
    </div>
    ${barraDePausa(sessao, estado.configuracoes)}`;
}

// Treino comum: um cartão por exercício, séries em sequência.
function porExercicio(sessao, atual, estado) {
  return sessao.itens.map((item, i) => {
    const exercicio = buscarExercicio(item.exercicioId);
    const ehAtual = atual?.[0] === i;
    const terminado = item.series.every((serie) => serie.feita);
    return html`
      <section class="exercicio ${ehAtual ? 'exercicio--atual' : ''} ${terminado ? 'exercicio--feito' : ''}">
        <header class="exercicio-cabeca">
          <span class="exercicio-numero">${terminado ? ICONE_FEITO : i + 1}</span>
          <div>
            <h2 class="exercicio-nome">${exercicio?.nome ?? 'Exercício removido do banco'}</h2>
            <p class="exercicio-alvo">${meta(item, exercicio)}</p>
          </div>
        </header>
        ${infoDeCarga(exercicio, registroDe(estado, item.exercicioId))}
        <ol class="series">
          ${item.series.map((_, s) =>
            ehAtual && atual[1] === s
              ? serieAtiva(item, exercicio, i, s, `Série ${s + 1} de ${item.series.length}`)
              : serieCompacta(item, exercicio, i, s, `Série ${s + 1}`, false),
          )}
        </ol>
      </section>`;
  });
}

// Circuito: um cartão por volta, com todos os exercícios em sequência.
function porVolta(sessao, atual, estado) {
  const voltas = Math.max(...sessao.itens.map((item) => item.series.length));
  return Array.from({ length: voltas }, (_, v) => {
    const terminada = sessao.itens.every((item) => v >= item.series.length || item.series[v].feita);
    return html`
      <section class="exercicio ${atual?.[1] === v ? 'exercicio--atual' : ''} ${terminada ? 'exercicio--feito' : ''}">
        <header class="exercicio-cabeca">
          <span class="exercicio-numero">${terminada ? ICONE_FEITO : v + 1}</span>
          <div>
            <h2 class="exercicio-nome">Volta ${v + 1} de ${voltas}</h2>
            <p class="exercicio-alvo">Um exercício atrás do outro. A pausa vem no fim da volta.</p>
          </div>
        </header>
        <ol class="series">
          ${sessao.itens.map((item, i) => {
            if (v >= item.series.length) return '';
            const exercicio = buscarExercicio(item.exercicioId);
            const nome = exercicio?.nome ?? 'Exercício removido do banco';
            return atual?.[0] === i && atual?.[1] === v
              ? serieAtiva(item, exercicio, i, v, nome, registroDe(estado, item.exercicioId))
              : serieCompacta(item, exercicio, i, v, nome, true);
          })}
        </ol>
      </section>`;
  });
}

function serieCompacta(item, exercicio, i, s, rotulo, nomeada) {
  const serie = item.series[s];
  const classes = ['serie', serie.feita ? 'serie--feita' : 'serie--pendente', nomeada ? 'serie--nomeada' : ''].join(' ');
  return html`
    <li class="${classes}">
      <span class="serie-rotulo">${rotulo}</span>
      <span class="serie-valores">${valores(serie, exercicio, item.alvo)}</span>
      ${serie.feita
        ? html`<button class="serie-marca" type="button" data-acao="serie" data-item="${i}" data-serie="${s}" data-foco="marca-${i}-${s}" aria-pressed="true" aria-label="${rotulo} feita. Toque para desmarcar.">${ICONE_FEITO}</button>`
        : html`<span class="serie-marca" aria-hidden="true"></span>`}
    </li>`;
}

// A série da vez: carga e repetições ajustáveis e o botão de concluir.
function serieAtiva(item, exercicio, i, s, rotulo, registroDaVolta) {
  const serie = item.series[s];
  const comCarga = usaCarga(exercicio);
  const segundos = item.alvo.medida === 'segundos';
  const naVolta = registroDaVolta !== undefined;
  return html`
    <li class="serie serie--atual" id="serie-atual">
      <span class="serie-rotulo">${rotulo}</span>
      ${naVolta ? html`<p class="serie-meta">${meta(item, exercicio)}</p>${infoDeCarga(exercicio, registroDaVolta, true)}` : ''}
      <div class="serie-campos ${comCarga ? '' : 'serie-campos--um'}">
        ${comCarga
          ? campo({ nome: 'carga', rotulo: 'Carga (kg)', valor: serie.carga, i, s, menos: 'Diminuir a carga', mais: 'Aumentar a carga' })
          : ''}
        ${campo({
          nome: 'reps',
          rotulo: segundos ? 'Segundos' : 'Repetições',
          valor: serie.reps,
          i,
          s,
          menos: segundos ? 'Menos segundos' : 'Menos repetições',
          mais: segundos ? 'Mais segundos' : 'Mais repetições',
        })}
      </div>
      <button class="botao botao--anilha" type="button" data-acao="serie" data-item="${i}" data-serie="${s}" data-foco="concluir-serie">Concluir série</button>
    </li>`;
}

function campo({ nome, rotulo, valor, i, s, menos, mais }) {
  const id = `${nome}-${i}-${s}`;
  return html`
    <div class="passo">
      <label class="passo-rotulo" for="${id}">${rotulo}</label>
      <div class="passo-controle">
        <button class="passo-botao" type="button" data-acao="ajustar" data-campo="${nome}" data-item="${i}" data-serie="${s}" data-delta="-1" data-foco="${id}-menos" aria-label="${menos}">−</button>
        <input class="passo-valor" id="${id}" name="${nome}" type="number" inputmode="decimal" min="0" step="any" data-item="${i}" data-serie="${s}" value="${Number.isFinite(valor) ? valor : ''}" placeholder="0">
        <button class="passo-botao" type="button" data-acao="ajustar" data-campo="${nome}" data-item="${i}" data-serie="${s}" data-delta="1" data-foco="${id}-mais" aria-label="${mais}">+</button>
      </div>
    </div>`;
}

function valores(serie, exercicio, alvo) {
  const quantidade = `${numero(serie.reps ?? 0)} ${alvo.medida === 'segundos' ? 's' : 'reps'}`;
  if (!usaCarga(exercicio)) return quantidade;
  return `${Number.isFinite(serie.carga) ? kg(serie.carga) : '— kg'} × ${quantidade}`;
}

function meta(item, exercicio) {
  const { min, max, medida } = item.alvo;
  const faixa = min === max ? `${min}` : `${min} a ${max}`;
  const unidade = medida === 'segundos' ? 'segundos' : 'repetições';
  return `Meta: ${faixa} ${unidade}${exercicio?.porLado ? ' de cada lado' : ''}`;
}

// Carga sugerida, última vez e avisos da progressão.
function infoDeCarga(exercicio, registro, naSerie = false) {
  const linhas = [];
  if (usaCarga(exercicio)) {
    if (Number.isFinite(registro?.carga)) {
      const antes = registro.ultima ? Math.max(0, ...registro.ultima.cargas.map((c) => c ?? 0)) : null;
      const subiu = antes !== null && registro.carga > antes;
      linhas.push(html`<p>Carga sugerida: <strong>${kg(registro.carga)}</strong>${subiu ? `, ${kg(registro.carga - antes)} a mais que na última vez` : ''}</p>`);
    } else {
      linhas.push(html`<p>${registro
        ? 'Ainda sem carga registrada. Informe a carga para o app acompanhar a evolução.'
        : 'Primeira vez: escolha uma carga que dê para cumprir a meta com boa execução.'}</p>`);
    }
  } else {
    linhas.push(html`<p>${exercicio?.requer?.includes('elastico') ? 'Com elástico' : 'Peso do corpo'}</p>`);
  }
  if (registro?.ultima) {
    linhas.push(html`<p class="exercicio-ultima">Última vez: ${descreverSeries(registro.ultima)}</p>`);
  }
  if (registro?.decisao === 'dificultar') {
    linhas.push(html`<p class="nota nota--compacta">Na última vez você bateu o topo da meta. Dá para tentar uma variação mais difícil.</p>`);
  }
  if ((registro?.semEvoluir ?? 0) >= LIMITE_SEM_EVOLUIR) {
    const dica = usaCarga(exercicio) ? 'Vale baixar um pouco a carga ou trocar o exercício.' : 'Vale trocar por uma variação do exercício.';
    linhas.push(html`<p class="nota nota--atencao nota--compacta">${registro.semEvoluir} treinos seguidos sem evoluir. ${dica}</p>`);
  }
  return html`<div class="exercicio-info ${naSerie ? 'exercicio-info--na-serie' : ''}">${linhas}</div>`;
}

// Cardio no fim do treino: tipo e minutos. É opcional e não conta nas séries.
function cartaoDeCardio(sessao, atual) {
  const { tipo, minutos, meta, feito } = sessao.cardio;
  const nomeDoTipo = TIPOS_DE_CARDIO.find((opcao) => opcao.id === tipo)?.nome ?? 'Cardio';
  const [minimo, maximo] = meta.minutos;
  const daVez = !feito && !atual;
  return html`
    <section class="exercicio exercicio--cardio ${daVez ? 'exercicio--atual' : ''} ${feito ? 'exercicio--feito' : ''}" ${feito ? '' : cru('id="cardio-atual"')}>
      <header class="exercicio-cabeca">
        <span class="exercicio-numero">${feito ? ICONE_FEITO : sessao.itens.length + 1}</span>
        <div>
          <h2 class="exercicio-nome">Cardio no final</h2>
          <p class="exercicio-alvo">Meta: ${minimo} a ${maximo} minutos, ritmo ${meta.ritmo}</p>
        </div>
      </header>
      ${feito
        ? html`
          <ol class="series">
            <li class="serie serie--feita serie--nomeada">
              <span class="serie-rotulo">${nomeDoTipo}</span>
              <span class="serie-valores">${minutos} min</span>
              <button class="serie-marca" type="button" data-acao="cardio-concluir" data-foco="cardio-marca" aria-pressed="true" aria-label="Cardio feito. Toque para desmarcar.">${ICONE_FEITO}</button>
            </li>
          </ol>`
        : html`
          <div class="cardio">
            <fieldset class="cardio-tipos">
              <legend class="passo-rotulo">Tipo</legend>
              <div class="chips">
                ${TIPOS_DE_CARDIO.map((opcao) => html`
                  <label class="chip">
                    <input type="radio" name="cardio-tipo" value="${opcao.id}" ${opcao.id === tipo ? cru('checked') : ''}>
                    <span>${opcao.nome}</span>
                  </label>`)}
              </div>
            </fieldset>
            <div class="passo passo--cardio">
              <label class="passo-rotulo" for="cardio-minutos">Minutos</label>
              <div class="passo-controle">
                <button class="passo-botao" type="button" data-acao="cardio-ajustar" data-delta="-1" data-foco="cardio-menos" aria-label="Menos minutos">−</button>
                <input class="passo-valor" id="cardio-minutos" name="cardio-minutos" type="number" inputmode="numeric" min="${MINUTOS_DE_CARDIO.min}" max="${MINUTOS_DE_CARDIO.max}" step="1" value="${minutos}">
                <button class="passo-botao" type="button" data-acao="cardio-ajustar" data-delta="1" data-foco="cardio-mais" aria-label="Mais minutos">+</button>
              </div>
            </div>
            <button class="botao botao--anilha" type="button" data-acao="cardio-concluir" data-foco="cardio-concluir">Concluir cardio</button>
          </div>`}
    </section>`;
}

// Barra fixa no rodapé: botão de pausa ou o cronômetro rodando.
function barraDePausa(sessao, configuracoes) {
  if (pausaAtiva(sessao)) {
    return html`
      <div class="pausa pausa--rodando" role="region" aria-label="Pausa">
        <div class="pausa-interno">
          <div class="pausa-tempo">
            <span class="pausa-rotulo">Pausa</span>
            <span class="pausa-relogio" data-cronometro>${tempo((sessao.pausa.fimEm - Date.now()) / 1000)}</span>
          </div>
          <div class="pausa-botoes">
            <button type="button" data-acao="pausa-ajustar" data-delta="-15" data-foco="pausa-menos" aria-label="Tirar 15 segundos">−15</button>
            <button type="button" data-acao="pausa-ajustar" data-delta="15" data-foco="pausa-mais" aria-label="Somar 15 segundos">+15</button>
            <button class="pausa-pular" type="button" data-acao="pausa-parar" data-foco="pausa-parar">Pular</button>
          </div>
        </div>
      </div>`;
  }
  return html`
    <div class="pausa" role="region" aria-label="Pausa">
      <div class="pausa-interno">
        <button class="pausa-iniciar" type="button" data-acao="pausa-iniciar" data-foco="pausa-iniciar">
          <span>Iniciar pausa</span>
          <span class="pausa-duracao">${tempo(configuracoes.pausaSegundos)}</span>
        </button>
      </div>
    </div>`;
}

// --- Ciclo de vida da tela -------------------------------------------------

export function aoEntrar(ctx) {
  if (lerEstado().configuracoes.telaLigada) manterTelaLigada(true);
  seguirPausa(ctx);
}

export function aoSair() {
  manterTelaLigada(false);
  pararAcompanhamento();
}

export function depoisDeRenderizar(extras) {
  if (!extras.rolar) return;
  const alvo = document.getElementById('serie-atual')
    ?? document.getElementById('cardio-atual')
    ?? document.getElementById('fim-do-treino');
  const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  alvo?.scrollIntoView({ block: 'center', behavior: semAnimacao ? 'auto' : 'smooth' });
}

function seguirPausa(ctx) {
  if (!pausaAtiva(sessaoAtual(lerEstado()))) {
    pararAcompanhamento();
    return;
  }
  acompanharPausa(
    () => sessaoAtual(lerEstado())?.pausa?.fimEm ?? null,
    async () => {
      if (lerEstado().configuracoes.alertaFimDaPausa) vibrar();
      await ctx.alterar((estado) => {
        const sessao = sessaoAtual(estado);
        if (sessao) encerrarPausa(sessao);
      });
      if (location.hash === '#/sessao') ctx.render();
      avisar('Pausa encerrada. Próxima série!');
    },
  );
}

function comecarPausa(ctx) {
  const sessao = sessaoAtual(lerEstado());
  if (!pausaAtiva(sessao)) {
    cancelarBipe();
    pararAcompanhamento();
    return;
  }
  if (lerEstado().configuracoes.alertaFimDaPausa) agendarBipe(sessao.pausa.fimEm);
  seguirPausa(ctx);
}

// --- Ações -------------------------------------------------------------------

export const acoes = {
  async serie({ item, serie }, ctx) {
    const i = Number(item);
    const s = Number(serie);
    const sessao = sessaoAtual(ctx.estado);
    const { feitas, total } = progresso(sessao);
    const marcando = !sessao.itens[i].series[s].feita;
    const { pausaAutomatica, pausaSegundos, alertaFimDaPausa } = ctx.estado.configuracoes;
    const comPausa = marcando && pausaAutomatica && feitas + 1 < total;
    if (comPausa && alertaFimDaPausa) prepararAudio(); // ainda dentro do toque

    await ctx.alterar((estado) => {
      const atual = sessaoAtual(estado);
      alternarSerie(atual, i, s);
      if (comPausa) iniciarPausa(atual, pausaSegundos);
    });
    if (comPausa) comecarPausa(ctx);
    ctx.render({ rolar: marcando });
  },

  async ajustar({ item, serie, campo: nomeDoCampo, delta }, ctx) {
    const i = Number(item);
    const s = Number(serie);
    await ctx.alterar((estado) => {
      const sessao = sessaoAtual(estado);
      const alvoItem = sessao.itens[i];
      const passo = passoDoCampo(nomeDoCampo, buscarExercicio(alvoItem.exercicioId), alvoItem.alvo);
      const atual = alvoItem.series[s][nomeDoCampo];
      const base = Number.isFinite(atual) ? atual : 0;
      definirValor(sessao, i, s, nomeDoCampo, base + Number(delta) * passo);
    });
    ctx.render();
  },

  async 'pausa-iniciar'(_dados, ctx) {
    const { pausaSegundos, alertaFimDaPausa } = ctx.estado.configuracoes;
    if (alertaFimDaPausa) prepararAudio(); // ainda dentro do toque
    await ctx.alterar((estado) => iniciarPausa(sessaoAtual(estado), pausaSegundos));
    comecarPausa(ctx);
    ctx.render();
  },

  async 'pausa-ajustar'({ delta }, ctx) {
    await ctx.alterar((estado) => ajustarPausa(sessaoAtual(estado), Number(delta)));
    comecarPausa(ctx);
    ctx.render();
  },

  async 'pausa-parar'(_dados, ctx) {
    cancelarBipe();
    pararAcompanhamento();
    await ctx.alterar((estado) => encerrarPausa(sessaoAtual(estado)));
    ctx.render();
  },

  async 'cardio-ajustar'({ delta }, ctx) {
    await ctx.alterar((estado) => {
      const sessao = sessaoAtual(estado);
      definirCardio(sessao, { minutos: sessao.cardio.minutos + Number(delta) * MINUTOS_DE_CARDIO.passo });
    });
    ctx.render();
  },

  async 'cardio-concluir'(_dados, ctx) {
    const feito = await ctx.alterar((estado) => {
      const sessao = sessaoAtual(estado);
      sessao.cardio.feito = !sessao.cardio.feito;
      return sessao.cardio.feito;
    });
    ctx.render({ rolar: feito });
  },

  async finalizar(_dados, ctx) {
    const { feitas, total } = progresso(sessaoAtual(ctx.estado));
    if (feitas < total) {
      const faltam = total - feitas;
      const ok = await confirmar({
        titulo: 'Finalizar o treino?',
        texto: feitas === 0
          ? 'Nenhuma série foi marcada. O treino conta como feito, mas nenhuma carga é registrada.'
          : `${faltam === 1 ? 'Falta 1 série' : `Faltam ${faltam} séries`}. Só as séries marcadas entram na progressão de carga.`,
        botao: 'Finalizar treino',
      });
      if (!ok) return;
    }
    await finalizarComAviso(ctx);
  },

  async cancelar(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Cancelar o treino?',
      texto: 'As séries marcadas neste treino serão descartadas.',
      botao: 'Cancelar treino',
      perigo: true,
    });
    if (!ok) return;
    cancelarBipe();
    pararAcompanhamento();
    await ctx.alterar((estado) => cancelarSessao(estado));
    ctx.ir('#/hoje');
    avisar('Treino cancelado');
  },
};

// Carga ou repetições digitadas direto no campo.
export async function aoMudar(evento, ctx) {
  const campoAlterado = evento.target;
  if (campoAlterado.name === 'cardio-tipo' || campoAlterado.name === 'cardio-minutos') {
    const campos = campoAlterado.name === 'cardio-tipo' ? { tipo: campoAlterado.value } : { minutos: Number(campoAlterado.value) };
    await ctx.alterar((estado) => definirCardio(sessaoAtual(estado), campos));
    ctx.render();
    return;
  }
  if (!['carga', 'reps'].includes(campoAlterado.name)) return;
  const texto = String(campoAlterado.value).replace(',', '.');
  const valor = texto === '' ? null : Number(texto);
  await ctx.alterar((estado) =>
    definirValor(sessaoAtual(estado), Number(campoAlterado.dataset.item), Number(campoAlterado.dataset.serie), campoAlterado.name, valor),
  );
  ctx.render();
}
