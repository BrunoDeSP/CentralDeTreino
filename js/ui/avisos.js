// Aviso rápido no rodapé (com ação opcional, como "Desfazer") e caixa de
// confirmação para ações que não dá para desfazer.

let temporizador = null;

export function avisar(texto, { acao, aoClicar, duracao = 6000 } = {}) {
  const aviso = document.getElementById('aviso');
  const mensagem = document.createElement('span');
  mensagem.textContent = texto;
  aviso.replaceChildren(mensagem);

  if (acao) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'aviso-acao';
    botao.textContent = acao;
    botao.addEventListener('click', () => {
      esconderAviso();
      aoClicar?.();
    }, { once: true });
    aviso.append(botao);
  }

  aviso.classList.add('aviso--visivel');
  clearTimeout(temporizador);
  temporizador = setTimeout(esconderAviso, duracao);
}

export function esconderAviso() {
  document.getElementById('aviso')?.classList.remove('aviso--visivel');
}

export function confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
  const dialogo = document.getElementById('confirmacao');
  if (typeof dialogo?.showModal !== 'function') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
  }

  dialogo.querySelector('[data-titulo]').textContent = titulo;
  dialogo.querySelector('[data-texto]').textContent = texto;
  const confirmacao = dialogo.querySelector('[data-confirmar]');
  confirmacao.textContent = botao;
  confirmacao.classList.toggle('botao--perigo', perigo);
  dialogo.returnValue = '';

  return new Promise((resolver) => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue === 'sim'), { once: true });
    dialogo.showModal();
  });
}
