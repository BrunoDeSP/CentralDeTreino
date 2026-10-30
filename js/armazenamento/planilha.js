import { PLANILHA } from '../config.js';

// Conversa com o Apps Script da planilha (apps-script/Codigo.gs).
//
// Tudo vai por POST com o corpo em texto puro. Assim o navegador não faz a
// consulta prévia de CORS, que o Apps Script não responde. A resposta chega em
// JSON depois de um redirecionamento do Google, que o fetch segue sozinho.

const ENDERECO = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/|macros\/)s\/[\w-]+\/exec$/;

const MENSAGENS = {
  chave: 'A chave não confere. Rode "configurar" no Apps Script e copie a chave de novo.',
  acesso: 'Não deu para falar com a planilha. Confira a internet, o endereço (termina em /exec) e se a implantação está com acesso para "Qualquer pessoa".',
  rede: 'Sem internet agora. Os dados ficam neste celular e a cópia vai depois.',
  tempo: 'A planilha demorou demais para responder. O app tenta de novo depois.',
  'outro-aparelho': 'Outro aparelho passou a salvar nesta planilha, então este parou de enviar.',
  servidor: 'A planilha deu erro ao salvar. O app tenta de novo depois.',
  vazia: 'A planilha ainda não tem dados para trazer.',
  formato: 'Os dados da planilha não puderam ser lidos.',
};

export class ErroDaPlanilha extends Error {
  constructor(codigo, detalhe = '', resposta = null) {
    super(detalhe || codigo);
    this.codigo = codigo;
    this.resposta = resposta;
  }
}

export function mensagemDoErro(codigo) {
  return MENSAGENS[codigo] ?? MENSAGENS.servidor;
}

// Limpa o endereço colado ("…/exec?x=1 " → "…/exec"). Devolve null se não for
// o endereço de um app da Web do Apps Script.
export function limparEndereco(texto) {
  const endereco = String(texto ?? '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  return ENDERECO.test(endereco) ? endereco : null;
}

export async function chamarPlanilha({ url, chave }, acao, extras = {}) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), PLANILHA.tempoLimite);
  let corpo;
  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...extras, acao, chave }),
      signal: controle.signal,
    });
    if (!resposta.ok) throw new ErroDaPlanilha('acesso', `HTTP ${resposta.status}`);
    // Sem acesso para "Qualquer pessoa", o Google devolve uma página de login.
    corpo = await resposta.json().catch((erro) => {
      throw erro?.name === 'AbortError' ? erro : new ErroDaPlanilha('acesso');
    });
  } catch (erro) {
    if (erro instanceof ErroDaPlanilha) throw erro;
    if (erro?.name === 'AbortError') throw new ErroDaPlanilha('tempo');
    throw new ErroDaPlanilha(navigator.onLine === false ? 'rede' : 'acesso', String(erro?.message ?? erro));
  } finally {
    clearTimeout(limite);
  }
  if (!corpo?.ok) throw new ErroDaPlanilha(corpo?.erro ?? 'servidor', corpo?.detalhe ?? '', corpo);
  return corpo;
}
