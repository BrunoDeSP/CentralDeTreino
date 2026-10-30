import { html, cru } from '../ui/html.js';
import { avisar, confirmar } from '../ui/avisos.js';
import { apagarTudo, lerEstado } from '../estado.js';
import { CONFIG } from '../config.js';
import { cancelarBipe, pararAcompanhamento } from '../ui/cronometro.js';
import { duracao, plural } from '../util/texto.js';
import { dataEHora } from '../util/datas.js';
import { limparEndereco, mensagemDoErro } from '../armazenamento/planilha.js';
import { resumoDosDados } from '../armazenamento/tabelas.js';
import {
  statusDaPlanilha,
  aoMudarStatus,
  conectar,
  restaurar,
  substituirPlanilha,
  enviarAgora,
  desconectar,
} from '../armazenamento/sincronizacao.js';

// Configurações: tempo de pausa, comportamento durante o treino, cópia na
// planilha e dados.

export const titulo = 'Configurações';

let escolha = null; // { nova, remoto } quando a planilha e o celular têm dados
let pararDeOuvir = null;

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

    ${secaoDaPlanilha()}

    <section class="secao">
      <h2>Dados</h2>
      <p class="texto-apoio secao-ajuda">Ciclos, histórico, cargas e hábitos ficam guardados neste celular${statusDaPlanilha().conectada ? ', com cópia na planilha' : ''}.</p>
      <button class="botao botao--perigo" type="button" data-acao="apagar-tudo">Apagar todos os dados</button>
    </section>`;
}

// --- Cópia na planilha ---------------------------------------------------------

function secaoDaPlanilha() {
  const status = statusDaPlanilha();
  let conteudo;
  if (escolha) conteudo = blocoDeEscolha(escolha);
  else if (status.conectada) conteudo = blocoConectado(status);
  else conteudo = formularioDaPlanilha();
  return html`
    <section class="secao" aria-labelledby="titulo-planilha">
      <h2 id="titulo-planilha">Cópia na planilha</h2>
      ${conteudo}
    </section>`;
}

function formularioDaPlanilha() {
  return html`
    <p class="texto-apoio secao-ajuda">Guarda uma cópia dos dados numa planilha do Google. O app continua salvando neste celular e manda a cópia sozinho. Cole o endereço e a chave que aparecem ao configurar a planilha (passo a passo no README do projeto).</p>
    <form class="formulario formulario--planilha" novalidate>
      <div class="campo">
        <label class="campo-rotulo" for="planilha-endereco">Endereço do app da Web</label>
        <input class="campo-texto" id="planilha-endereco" name="endereco" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec">
      </div>
      <div class="campo">
        <label class="campo-rotulo" for="planilha-chave">Chave</label>
        <input class="campo-texto" id="planilha-chave" name="chave" type="text" autocomplete="off" autocapitalize="off" spellcheck="false">
      </div>
      <button class="botao" type="submit">Conectar planilha</button>
    </form>`;
}

function blocoConectado(status) {
  let texto;
  let tipo = 'espera';
  if (status.enviando) texto = 'Enviando a cópia…';
  else if (status.erro) {
    texto = mensagemDoErro(status.erro);
    tipo = 'erro';
  } else if (status.pendente) texto = 'Há mudanças esperando para ir para a planilha.';
  else if (status.enviadoEm) {
    texto = `Cópia em dia. Último envio: ${dataEHora(status.enviadoEm)}.`;
    tipo = 'ok';
  } else texto = 'Planilha conectada. A primeira cópia vai assim que houver dados.';

  const outroAparelho = status.bloqueada && status.erro === 'outro-aparelho';
  return html`
    <p class="planilha-status planilha-status--${tipo}" role="status">${texto}</p>
    ${status.erro && status.enviadoEm ? html`<p class="texto-apoio secao-ajuda">Último envio que deu certo: ${dataEHora(status.enviadoEm)}.</p>` : ''}
    <div class="planilha-acoes">
      ${outroAparelho
        ? html`
          <button class="botao botao--secundario" type="button" data-acao="trazer-planilha">Trazer os dados da planilha</button>
          <button class="botao botao--secundario" type="button" data-acao="manter-celular">Ficar com os deste celular</button>`
        : ''}
      ${!status.bloqueada
        ? html`<button class="botao botao--secundario" type="button" data-acao="enviar-planilha" ${status.enviando ? cru('disabled') : ''}>Enviar agora</button>`
        : ''}
      <button class="botao botao--texto" type="button" data-acao="desconectar-planilha">Desconectar</button>
    </div>`;
}

function blocoDeEscolha({ remoto }) {
  const local = resumoDosDados(lerEstado());
  const naPlanilha = remoto.resumo?.treinos ?? 0;
  return html`
    <div class="nota nota--atencao">
      <p><strong>A planilha e este celular têm dados.</strong> A planilha tem ${plural(naPlanilha, 'treino')}, com último envio ${remoto.enviadoEm ? dataEHora(remoto.enviadoEm) : 'sem data'}. Este celular tem ${plural(local.treinos, 'treino')}. Qual manter?</p>
    </div>
    <div class="planilha-acoes">
      <button class="botao botao--secundario" type="button" data-acao="trazer-planilha">Trazer os dados da planilha</button>
      <button class="botao botao--secundario" type="button" data-acao="manter-celular">Ficar com os deste celular</button>
      <button class="botao botao--texto" type="button" data-acao="cancelar-planilha">Cancelar</button>
    </div>`;
}

// Redesenha quando a cópia termina de ir (o formulário não muda sozinho).
export function aoEntrar(ctx) {
  pararDeOuvir = aoMudarStatus(() => {
    if (!escolha && statusDaPlanilha().conectada) ctx.render();
  });
}

export function aoSair() {
  pararDeOuvir?.();
  pararDeOuvir = null;
  escolha = null;
}

export async function aoEnviar(dados, ctx) {
  const url = limparEndereco(dados.get('endereco'));
  const chave = String(dados.get('chave') ?? '').trim();
  if (!url) {
    avisar('Cole o endereço do app da Web. Ele começa com https://script.google.com e termina em /exec.');
    document.getElementById('planilha-endereco')?.focus();
    return;
  }
  if (!chave) {
    avisar('Cole a chave que aparece ao rodar "configurar" no Apps Script.');
    document.getElementById('planilha-chave')?.focus();
    return;
  }

  const botao = document.querySelector('.formulario--planilha [type="submit"]');
  if (botao) {
    botao.disabled = true;
    botao.textContent = 'Conectando…';
  }
  try {
    const resultado = await conectar({ url, chave });
    if (resultado.situacao === 'escolher') {
      escolha = resultado;
      ctx.render();
      return;
    }
    if (resultado.situacao === 'restaurado') {
      ctx.ir('#/hoje');
      avisar(`Dados trazidos da planilha: ${plural(resumoDosDados(lerEstado()).treinos, 'treino')}`);
      return;
    }
    ctx.render();
    avisar('Planilha conectada');
  } catch (erro) {
    if (botao) {
      botao.disabled = false;
      botao.textContent = 'Conectar planilha';
    }
    avisar(mensagemDoErro(erro.codigo));
  }
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
  async 'enviar-planilha'(_dados, ctx) {
    try {
      await enviarAgora();
      avisar('Cópia enviada');
    } catch (erro) {
      avisar(mensagemDoErro(erro.codigo));
    }
    ctx.render();
  },

  async 'trazer-planilha'(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Trazer os dados da planilha?',
      texto: 'Os dados deste celular serão trocados pelos da planilha, e este celular passa a ser o que salva nela. Não dá para desfazer.',
      botao: 'Trazer dados',
      perigo: true,
    });
    if (!ok) return;
    try {
      await restaurar(escolha?.nova);
      escolha = null;
      ctx.ir('#/hoje');
      avisar(`Dados trazidos da planilha: ${plural(resumoDosDados(lerEstado()).treinos, 'treino')}`);
    } catch (erro) {
      avisar(mensagemDoErro(erro.codigo));
      ctx.render();
    }
  },

  async 'manter-celular'(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Ficar com os dados deste celular?',
      texto: 'A cópia que está na planilha será trocada pelos dados deste celular, e ele passa a ser o que salva nela.',
      botao: 'Trocar a cópia',
      perigo: true,
    });
    if (!ok) return;
    const nova = escolha?.nova;
    escolha = null;
    try {
      await substituirPlanilha(nova);
      avisar('Cópia da planilha trocada pelos dados deste celular');
    } catch (erro) {
      avisar(mensagemDoErro(erro.codigo));
    }
    ctx.render();
  },

  'cancelar-planilha'(_dados, ctx) {
    escolha = null;
    ctx.render();
  },

  async 'desconectar-planilha'(_dados, ctx) {
    const ok = await confirmar({
      titulo: 'Desconectar a planilha?',
      texto: 'O app para de mandar a cópia. O que já está na planilha continua lá.',
      botao: 'Desconectar',
    });
    if (!ok) return;
    desconectar();
    ctx.render();
    avisar('Planilha desconectada');
  },

  async pausa({ delta }, ctx) {
    const { min, max, passo } = CONFIG.pausa;
    await ctx.alterar((estado) => {
      const atual = estado.configuracoes.pausaSegundos;
      estado.configuracoes.pausaSegundos = Math.min(max, Math.max(min, atual + Number(delta) * passo));
    });
    ctx.render();
  },

  async 'apagar-tudo'(_dados, ctx) {
    const conectada = statusDaPlanilha().conectada;
    const ok = await confirmar({
      titulo: 'Apagar todos os dados?',
      texto: conectada
        ? 'Ciclos, histórico, cargas, hábitos e configurações deste celular serão apagados. A cópia na planilha continua lá, e o app se desconecta dela.'
        : 'Ciclos, histórico, cargas, hábitos e configurações deste celular serão apagados. Não dá para desfazer.',
      botao: 'Apagar tudo',
      perigo: true,
    });
    if (!ok) return;
    cancelarBipe();
    pararAcompanhamento();
    // Este celular vira "novo": ao conectar de novo, ele traz os dados da
    // planilha em vez de mandar os dados vazios por cima deles.
    desconectar({ esquecerAparelho: true });
    await apagarTudo();
    ctx.ir('#/hoje');
    avisar('Dados apagados');
  },
};
