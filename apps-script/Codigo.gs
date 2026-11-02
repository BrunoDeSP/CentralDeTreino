/**
 * Central de Treino: cópia dos dados do app nesta planilha.
 *
 * O app, no celular, continua sendo o dono dos dados. Ele salva tudo no
 * celular primeiro e manda uma cópia para cá de tempos em tempos. É daqui que
 * ele traz os dados de volta num celular novo.
 *
 * - Aba "Backup" (escondida): a cópia completa, em pedaços. Não edite.
 * - Abas Treinos, Séries, Cargas, Hábitos e Ciclos: só para ver. Elas são
 *   reescritas a cada envio, então o que for mudado nelas se perde.
 *
 * Só um aparelho salva na planilha. Outro só passa a salvar se assumir de
 * propósito (trazendo os dados ou trocando a cópia), para um celular de teste
 * ou antigo não apagar a cópia boa.
 *
 * Instalação: README do projeto, seção "Cópia na planilha".
 *
 * @OnlyCurrentDoc
 */

const ABA_BACKUP = 'Backup';
const ABAS_PARA_VER = ['Treinos', 'Séries', 'Cargas', 'Hábitos', 'Ciclos'];
const TAMANHO_DO_PEDACO = 40000; // cada célula aceita até 50.000 caracteres
const PREFIXO = 'p:'; // impede a planilha de ler um pedaço como fórmula, número ou data

// Rode uma vez pelo editor (botão Executar) antes de implantar. Cria a chave
// do app e as abas. Rodar de novo só mostra a mesma chave.
function configurar() {
  const propriedades = PropertiesService.getScriptProperties();
  let chave = propriedades.getProperty('CHAVE');
  if (!chave) {
    chave = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
    propriedades.setProperty('CHAVE', chave);
  }
  prepararAbas(SpreadsheetApp.getActiveSpreadsheet());
  Logger.log('Chave do app: ' + chave);
  Logger.log('Agora implante como app da Web e cole o endereço e esta chave em Configurações, no app.');
}

// Se a chave vazar, rode esta função e conecte o app de novo com a chave nova.
function trocarChave() {
  PropertiesService.getScriptProperties().deleteProperty('CHAVE');
  configurar();
}

// Abrir o endereço no navegador só confirma que a implantação funciona.
function doGet() {
  return ContentService.createTextOutput('Central de Treino: esta planilha recebe a cópia dos dados do app.');
}

function doPost(evento) {
  try {
    const pedido = JSON.parse(evento.postData.contents);
    const propriedades = PropertiesService.getScriptProperties();
    const chave = propriedades.getProperty('CHAVE');
    if (!chave || pedido.chave !== chave) return responder({ ok: false, erro: 'chave' });

    if (pedido.acao === 'status') return responder(Object.assign({ ok: true }, situacao(propriedades)));
    if (pedido.acao === 'baixar') return responder(Object.assign({ ok: true, dados: lerBackup() }, situacao(propriedades)));
    if (pedido.acao === 'enviar') return enviar(pedido, propriedades);
    return responder({ ok: false, erro: 'acao' });
  } catch (erro) {
    return responder({ ok: false, erro: 'servidor', detalhe: String((erro && erro.message) || erro) });
  }
}

function enviar(pedido, propriedades) {
  if (typeof pedido.dados !== 'string' || !pedido.dados) return responder({ ok: false, erro: 'dados' });

  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    const dono = propriedades.getProperty('DISPOSITIVO');
    if (dono && dono !== pedido.dispositivo && !pedido.assumir) {
      return responder(Object.assign({ ok: false, erro: 'outro-aparelho' }, situacao(propriedades)));
    }

    // A cópia completa vai primeiro: se algo falhar depois, ela já está salva.
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const backup = gravarBackup(planilha, pedido.dados);
    const tabelas = pedido.tabelas || {};
    Object.keys(tabelas).forEach(function (nome) {
      gravarTabela(planilha, nome, tabelas[nome]);
    });
    esconder(backup);

    propriedades.setProperties({
      DISPOSITIVO: String(pedido.dispositivo || ''),
      REVISAO: String(Number(pedido.revisao) || 0),
      ENVIADO_EM: new Date().toISOString(),
      RESUMO: JSON.stringify(pedido.resumo || {}),
    });
    return responder(Object.assign({ ok: true }, situacao(propriedades)));
  } finally {
    trava.releaseLock();
  }
}

function situacao(propriedades) {
  const enviadoEm = propriedades.getProperty('ENVIADO_EM');
  return {
    temBackup: Boolean(enviadoEm),
    revisao: Number(propriedades.getProperty('REVISAO') || 0),
    dispositivo: propriedades.getProperty('DISPOSITIVO') || null,
    enviadoEm: enviadoEm || null,
    resumo: JSON.parse(propriedades.getProperty('RESUMO') || '{}'),
  };
}

// --- Cópia completa ---------------------------------------------------------

// Grava por cima das linhas antigas e só depois limpa o que sobrou. Assim, se a
// gravação falhar no meio, a cópia anterior continua inteira.
function gravarBackup(planilha, texto) {
  const aba = planilha.getSheetByName(ABA_BACKUP) || planilha.insertSheet(ABA_BACKUP);
  const pedacos = [];
  for (let inicio = 0; inicio < texto.length; inicio += TAMANHO_DO_PEDACO) {
    pedacos.push([PREFIXO + texto.slice(inicio, inicio + TAMANHO_DO_PEDACO)]);
  }
  garantirTamanho(aba, pedacos.length, 1);
  aba.getRange(1, 1, pedacos.length, 1).setNumberFormat('@').setValues(pedacos);
  const sobra = aba.getLastRow() - pedacos.length;
  if (sobra > 0) aba.getRange(pedacos.length + 1, 1, sobra, 1).clearContent();
  return aba;
}

function lerBackup() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_BACKUP);
  if (!aba || aba.getLastRow() === 0) return null;
  return aba.getRange(1, 1, aba.getLastRow(), 1).getValues()
    .map(function (linha) { return String(linha[0]); })
    .filter(function (pedaco) { return pedaco.indexOf(PREFIXO) === 0; })
    .map(function (pedaco) { return pedaco.slice(PREFIXO.length); })
    .join('') || null;
}

// A planilha não deixa esconder a última aba visível; nesse caso, fica visível.
function esconder(aba) {
  try {
    if (!aba.isSheetHidden()) aba.hideSheet();
  } catch (erro) {
    Logger.log('Aba Backup visível: ' + erro);
  }
}

// --- Abas para ver ----------------------------------------------------------

function gravarTabela(planilha, nome, linhas) {
  if (!Array.isArray(linhas) || linhas.length === 0) return;
  const aba = planilha.getSheetByName(nome) || planilha.insertSheet(nome);
  const colunas = linhas.reduce(function (maior, linha) { return Math.max(maior, linha.length); }, 1);
  const valores = linhas.map(function (linha) {
    const copia = linha.map(valorDaCelula);
    while (copia.length < colunas) copia.push('');
    return copia;
  });
  aba.clearContents();
  garantirTamanho(aba, valores.length, colunas);
  aba.getRange(1, 1, valores.length, colunas).setValues(valores);
  aba.getRange(1, 1, 1, colunas).setFontWeight('bold');
  aba.setFrozenRows(1);
}

// Um texto que começa com =, +, - ou @ viraria fórmula: ganha um espaço na frente.
function valorDaCelula(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string' && /^[=+\-@]/.test(valor)) return ' ' + valor;
  return valor;
}

function prepararAbas(planilha) {
  const abas = planilha.getSheets();
  if (abas.length === 1 && abas[0].getLastRow() === 0 && !planilha.getSheetByName(ABAS_PARA_VER[0])) {
    abas[0].setName(ABAS_PARA_VER[0]);
  }
  ABAS_PARA_VER.forEach(function (nome) {
    if (!planilha.getSheetByName(nome)) planilha.insertSheet(nome);
  });
}

function garantirTamanho(aba, linhas, colunas) {
  if (aba.getMaxRows() < linhas) aba.insertRowsAfter(aba.getMaxRows(), linhas - aba.getMaxRows());
  if (aba.getMaxColumns() < colunas) aba.insertColumnsAfter(aba.getMaxColumns(), colunas - aba.getMaxColumns());
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
