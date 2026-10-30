import { html, cru } from '../ui/html.js';
import { anilha } from '../ui/componentes.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { buscarExercicio, ehDePerna } from '../dados/exercicios.js';
import { lerEstado } from '../estado.js';
import { usaCarga, registroDe, descreverSeries } from '../treino/progressao.js';
import { buscarTreino } from '../treino/regras-do-ciclo.js';
import { buscarFase } from '../dados/modelos.js';
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
  trocarExercicio,
  encerrarPorJoelho,
  retomarExercicio,
  iniciarIntervalado,
  pararIntervalado,
  momentoDoIntervalado,
  intervaladoAtivo,
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
import { kg, numero, tempo, plural } from '../util/texto.js';
import { finalizarComAviso } from './comum.js';
import { tiposDeCardio, buscarCardio, MINUTOS_DE_CARDIO, NIVEL_DE_CARDIO, INTERVALADO, SINAIS_PARA_PARAR } from '../dados/regioes.js';

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
  const ciclo = estado.ciclos.find((c) => c.id === sessao.cicloId) ?? null;
  const treino = ciclo ? buscarTreino(ciclo, sessao.treinoId) : null;
  const cardioPrimeiro = Boolean(treino?.cardio?.primeiro);

  return html`
    <div class="sessao" data-anilha="${sessao.treinoId.toLowerCase()}">
      <a class="voltar" href="#/hoje" data-acao="voltar">Voltar</a>
      <header class="sessao-cabeca">
        ${anilha(sessao.treinoId, { tamanho: 'g' })}
        <div>
          <h1>Treino ${sessao.treinoId}</h1>
          ${treino?.foco ? html`<p class="treino-foco">${treino.foco}</p>` : ''}
          <p class="sessao-contagem">${total ? `${feitas} de ${total} ${total === 1 ? 'série feita' : 'séries feitas'}` : 'Só cardio hoje'}</p>
        </div>
      </header>
      <div class="sessao-progresso" role="progressbar" aria-label="Séries feitas" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${feitas}">
        <span style="width: ${porcentagem}%"></span>
      </div>

      ${orientacoes(sessao, treino, ciclo)}

      ${sessao.cardio && cardioPrimeiro ? cartaoDeCardio(sessao, atual, true) : ''}

      ${sessao.circuito ? porVolta(sessao, atual, estado) : porExercicio(sessao, atual, estado)}

      ${sessao.cardio && !cardioPrimeiro ? cartaoDeCardio(sessao, atual, false) : ''}

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
        ${apoioDoExercicio(item, exercicio, i, terminado)}
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
  const aviso = avisoDaProgressao(registro);
  if (aviso) linhas.push(aviso);
  return html`<div class="exercicio-info ${naSerie ? 'exercicio-info--na-serie' : ''}">${linhas}</div>`;
}

// Lembretes do plano no topo do treino: aquecimento e carga certa da fase.
function orientacoes(sessao, treino, ciclo) {
  if (!treino) return '';
  const fase = ciclo?.fase ? buscarFase(ciclo.fase) : null;
  const linhas = [];
  if (treino.aquecimento) {
    linhas.push(html`<p><strong>Aquecimento (${treino.aquecimento} min):</strong> bike leve, mobilidade de quadril e tornozelo e uma série leve do primeiro exercício.</p>`);
  }
  if (fase && sessao.itens.length) {
    linhas.push(html`<p><strong>${fase.nome}:</strong> a última repetição sai com ${fase.sobrando} sobrando (esforço ${10 - fase.sobrando} de 10).${fase.id === 'leve' ? ' Mesmas cargas, metade das séries.' : ''}</p>`);
  }
  return linhas.length ? html`<div class="orientacoes">${linhas}</div>` : '';
}

// Dica de execução, troca pela alternativa e o botão do joelho.
function apoioDoExercicio(item, exercicio, i, terminado) {
  const base = buscarExercicio(item.base ?? item.exercicioId);
  const trocado = Boolean(item.base) && item.exercicioId !== item.base;
  const alternativa = trocado ? base : buscarExercicio(exercicio?.alternativa);
  const comecou = item.series.some((serie) => serie.feita);
  const partes = [];
  if (trocado) partes.push(html`<p class="exercicio-troca">No lugar de ${base?.nome}, que estava ocupado.</p>`);
  if (exercicio?.dica) partes.push(html`<p class="exercicio-dica">${exercicio.dica}</p>`);
  if (item.joelho) {
    partes.push(html`
      <div class="joelho-aviso" role="status">
        <p><strong>Encerrado hoje: o joelho incomodou.</strong> No próximo treino este exercício volta com uns 15% menos carga; se precisar, diminua a amplitude. Se a dor passar de 5 de 10 ou piorar de uma semana para outra, pare os exercícios de perna e procure um fisioterapeuta ou ortopedista.</p>
        <button class="botao botao--texto" type="button" data-acao="retomar" data-item="${i}">Desfazer</button>
      </div>`);
  }
  const botoes = [];
  if (alternativa && !comecou && !item.joelho) {
    botoes.push(html`<button class="exercicio-acao" type="button" data-acao="trocar" data-item="${i}">${trocado ? `Voltar para ${base?.nome}` : `Aparelho ocupado? Trocar por ${alternativa.nome}`}</button>`);
  }
  if (ehDePerna(exercicio) && !item.joelho && !terminado) {
    botoes.push(html`<button class="exercicio-acao exercicio-acao--joelho" type="button" data-acao="joelho" data-item="${i}">Joelho incomodou</button>`);
  }
  if (botoes.length) partes.push(html`<div class="exercicio-acoes">${botoes}</div>`);
  return partes;
}

function avisoDaProgressao(registro) {
  if (registro?.decisao === 'baixar') {
    return html`<p class="nota nota--atencao nota--compacta">A carga baixou uns 10%: foram 3 treinos seguidos abaixo da meta.</p>`;
  }
  if (registro?.decisao === 'joelho') {
    return html`<p class="nota nota--atencao nota--compacta">Voltou com uns 15% menos carga porque o joelho incomodou. Se precisar, diminua a amplitude.</p>`;
  }
  if (registro?.decisao === 'segurar' && registro.abaixoSeguidas > 0) {
    return html`<p class="nota nota--compacta">Carga mantida: ${plural(registro.abaixoSeguidas, 'treino')} abaixo da meta. Na 3ª vez seguida, ela baixa uns 10%.</p>`;
  }
  return null;
}

// Cardio: aparelho, como fazer nele, minutos sugeridos, nível (opcional) e,
// nos dias de intervalado, o cronômetro dos tiros.
function cartaoDeCardio(sessao, atual, primeiro) {
  const cardio = sessao.cardio;
  const { minutos, sugerido, meta, feito } = cardio;
  const tipoAtual = buscarCardio(cardio.tipo);
  const opcoes = tiposDeCardio(cardio.chave ?? 'fim');
  const [minimo, maximo] = meta.minutos;
  const daVez = !feito && (primeiro || !atual);
  const titulo = cardio.chave === 'longo' ? 'Cardio longo' : primeiro ? 'Cardio' : 'Cardio no final';
  return html`
    <section class="exercicio exercicio--cardio ${daVez ? 'exercicio--atual' : ''} ${feito ? 'exercicio--feito' : ''}" ${feito ? '' : cru('id="cardio-atual"')}>
      <header class="exercicio-cabeca">
        <span class="exercicio-numero">${feito ? ICONE_FEITO : primeiro ? 1 : sessao.itens.length + 1}</span>
        <div>
          <h2 class="exercicio-nome">${titulo}</h2>
          <p class="exercicio-alvo">Meta de hoje: ${sugerido ?? minimo} min em ritmo ${meta.ritmo} (faixa de ${minimo} a ${maximo})</p>
        </div>
      </header>
      ${feito
        ? html`
          <ol class="series">
            <li class="serie serie--feita serie--nomeada">
              <span class="serie-rotulo">${tipoAtual?.nome ?? 'Cardio'}</span>
              <span class="serie-valores">${resumoDoCardio(cardio)}</span>
              <button class="serie-marca" type="button" data-acao="cardio-concluir" data-foco="cardio-marca" aria-pressed="true" aria-label="Cardio feito. Toque para desmarcar.">${ICONE_FEITO}</button>
            </li>
          </ol>`
        : html`
          <div class="cardio">
            ${meta.como ? html`<p class="cardio-nota">${meta.como}</p>` : ''}
            <fieldset class="cardio-tipos">
              <legend class="passo-rotulo">Aparelho</legend>
              <div class="chips">
                ${opcoes.map((opcao) => html`
                  <label class="chip">
                    <input type="radio" name="cardio-tipo" value="${opcao.id}" ${opcao.id === cardio.tipo ? cru('checked') : ''}>
                    <span>${opcao.nome}</span>
                  </label>`)}
              </div>
            </fieldset>
            ${comoFazer(tipoAtual)}
            ${intervaladoAtivo(cardio) ? blocoIntervalado(cardio) : ''}
            ${cardio.semCheckup
              ? html`<p class="nota nota--compacta">Hoje seria dia de intervalado. Ele entra depois do check-up médico: marque em <a href="#/configuracoes">Configurações</a> quando fizer.</p>`
              : ''}
            <div class="cardio-campos">
              ${campoDoCardio('minutos', 'Minutos', minutos, MINUTOS_DE_CARDIO, 'Menos minutos', 'Mais minutos')}
              ${campoDoCardio('nivel', 'Nível (opcional)', cardio.nivel ?? '', NIVEL_DE_CARDIO, 'Nível menor', 'Nível maior')}
            </div>
            <p class="cardio-sinais">${SINAIS_PARA_PARAR}</p>
            <button class="botao botao--anilha" type="button" data-acao="cardio-concluir" data-foco="cardio-concluir">Concluir cardio</button>
          </div>`}
    </section>`;
}

function resumoDoCardio(cardio) {
  const partes = [`${cardio.minutos} min`];
  if (Number.isFinite(cardio.nivel)) partes.push(`nível ${cardio.nivel}`);
  if (intervaladoAtivo(cardio)) partes.push(plural(cardio.tiros, 'tiro'));
  return partes.join(', ');
}

function comoFazer(tipo) {
  if (!tipo?.dicas?.length) return '';
  return html`
    <details class="cardio-como" open>
      <summary>Como fazer: ${tipo.nome}</summary>
      <dl>
        ${tipo.dicas.map(([titulo, texto]) => html`<div><dt>${titulo}</dt><dd>${texto}</dd></div>`)}
      </dl>
    </details>`;
}

function campoDoCardio(nome, rotulo, valor, limites, menos, mais) {
  const id = `cardio-${nome}`;
  return html`
    <div class="passo passo--cardio">
      <label class="passo-rotulo" for="${id}">${rotulo}</label>
      <div class="passo-controle">
        <button class="passo-botao" type="button" data-acao="cardio-ajustar" data-campo="${nome}" data-delta="-1" data-foco="${id}-menos" aria-label="${menos}">−</button>
        <input class="passo-valor" id="${id}" name="${id}" type="number" inputmode="numeric" min="${limites.min}" max="${limites.max}" step="1" value="${valor}">
        <button class="passo-botao" type="button" data-acao="cardio-ajustar" data-campo="${nome}" data-delta="1" data-foco="${id}-mais" aria-label="${mais}">+</button>
      </div>
    </div>`;
}

function blocoIntervalado(cardio) {
  const { forte, leve } = INTERVALADO;
  if (!cardio.timer) {
    const duracao = Math.round((cardio.tiros * (forte + leve)) / 60);
    return html`
      <div class="intervalado">
        <p class="intervalado-titulo">Hoje tem intervalado: ${cardio.tiros} tiros</p>
        <p class="intervalado-texto">${forte} s forte, sem conseguir conversar, e ${leve} s leve, ${cardio.tiros} vezes (cerca de ${duracao} min). O resto do tempo é moderado. O app avisa com som e vibração a cada troca.</p>
        <button class="botao botao--secundario" type="button" data-acao="intervalado-iniciar" data-foco="intervalado-iniciar">Começar intervalado</button>
      </div>`;
  }
  const momento = momentoDoIntervalado(cardio);
  return html`
    <div class="intervalado intervalado--rodando" id="intervalado" data-fase="${momento.fase}">
      <p class="intervalado-fase" id="intervalado-fase">${rotuloDaFase(momento)}</p>
      <p class="intervalado-relogio" id="intervalado-relogio">${tempo(momento.restante)}</p>
      <p class="intervalado-tiro" id="intervalado-tiro">${textoDoTiro(momento)}</p>
      <button class="botao botao--texto" type="button" data-acao="intervalado-parar">Parar intervalado</button>
    </div>`;
}

function rotuloDaFase(momento) {
  return { forte: 'Forte', leve: 'Leve', fim: 'Intervalado concluído' }[momento.fase];
}

function textoDoTiro(momento) {
  return momento.fase === 'fim' ? 'Agora complete o tempo em ritmo moderado.' : `Tiro ${momento.tiro} de ${momento.tiros}`;
}

// Relógio do intervalado: atualiza a tela e avisa com som e vibração a cada troca.
let relogioDoIntervalado = null;
let ultimoMomento = null;

function acompanharIntervalado() {
  clearInterval(relogioDoIntervalado);
  relogioDoIntervalado = null;
  const cardio = sessaoAtual(lerEstado())?.cardio;
  if (!cardio?.timer || cardio.feito || !intervaladoAtivo(cardio)) {
    ultimoMomento = null;
    return;
  }
  const atualizar = () => {
    const atual = sessaoAtual(lerEstado())?.cardio;
    if (!atual?.timer) {
      clearInterval(relogioDoIntervalado);
      relogioDoIntervalado = null;
      return;
    }
    const momento = momentoDoIntervalado(atual);
    const caixa = document.getElementById('intervalado');
    if (caixa) {
      caixa.dataset.fase = momento.fase;
      document.getElementById('intervalado-fase').textContent = rotuloDaFase(momento);
      document.getElementById('intervalado-relogio').textContent = tempo(momento.restante);
      document.getElementById('intervalado-tiro').textContent = textoDoTiro(momento);
    }
    if (ultimoMomento !== null && momento.chave !== ultimoMomento && lerEstado().configuracoes.alertaFimDaPausa) {
      agendarBipe(Date.now());
      vibrar();
    }
    ultimoMomento = momento.chave;
    if (momento.fase === 'fim') {
      clearInterval(relogioDoIntervalado);
      relogioDoIntervalado = null;
    }
  };
  atualizar();
  relogioDoIntervalado = setInterval(atualizar, 250);
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
  clearInterval(relogioDoIntervalado);
  relogioDoIntervalado = null;
}

export function depoisDeRenderizar(extras) {
  acompanharIntervalado();
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

  async 'cardio-ajustar'({ campo: nome = 'minutos', delta }, ctx) {
    await ctx.alterar((estado) => {
      const sessao = sessaoAtual(estado);
      if (nome === 'nivel') {
        const atual = Number.isFinite(sessao.cardio.nivel) ? sessao.cardio.nivel : NIVEL_DE_CARDIO.min - 1;
        const novo = atual + Number(delta);
        definirCardio(sessao, { nivel: novo < NIVEL_DE_CARDIO.min ? null : novo });
      } else {
        definirCardio(sessao, { minutos: sessao.cardio.minutos + Number(delta) * MINUTOS_DE_CARDIO.passo });
      }
    });
    ctx.render();
  },

  async trocar({ item }, ctx) {
    const i = Number(item);
    const trocou = await ctx.alterar((estado) => trocarExercicio(estado, sessaoAtual(estado), i));
    ctx.render();
    if (trocou) avisar(`Agora: ${buscarExercicio(sessaoAtual(lerEstado())?.itens[i]?.exercicioId)?.nome ?? 'exercício trocado'}`);
  },

  async joelho({ item }, ctx) {
    const ok = await confirmar({
      titulo: 'Encerrar este exercício hoje?',
      texto: 'Dor acima de 3 de 10 ou o joelho falhar encerram o exercício no dia. No próximo treino ele volta com uns 15% menos carga.',
      botao: 'Encerrar exercício',
    });
    if (!ok) return;
    await ctx.alterar((estado) => encerrarPorJoelho(sessaoAtual(estado), Number(item)));
    ctx.render({ rolar: true });
  },

  async retomar({ item }, ctx) {
    await ctx.alterar((estado) => retomarExercicio(sessaoAtual(estado), Number(item)));
    ctx.render();
  },

  async 'intervalado-iniciar'(_dados, ctx) {
    if (ctx.estado.configuracoes.alertaFimDaPausa) prepararAudio(); // ainda dentro do toque
    await ctx.alterar((estado) => iniciarIntervalado(sessaoAtual(estado)));
    ctx.render();
  },

  async 'intervalado-parar'(_dados, ctx) {
    await ctx.alterar((estado) => pararIntervalado(sessaoAtual(estado)));
    ctx.render();
  },

  async 'cardio-concluir'(_dados, ctx) {
    const feito = await ctx.alterar((estado) => {
      const sessao = sessaoAtual(estado);
      sessao.cardio.feito = !sessao.cardio.feito;
      if (sessao.cardio.feito) sessao.cardio.timer = null;
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
  if (['cardio-tipo', 'cardio-minutos', 'cardio-nivel'].includes(campoAlterado.name)) {
    const valor = campoAlterado.value;
    const campos = campoAlterado.name === 'cardio-tipo'
      ? { tipo: valor }
      : campoAlterado.name === 'cardio-minutos'
        ? { minutos: Number(valor) }
        : { nivel: valor === '' ? null : Number(valor) };
    await ctx.alterar((estado) => definirCardio(sessaoAtual(estado), campos, estado));
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
