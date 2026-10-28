// Guarda tudo no navegador do celular (localStorage).
//
// A interface é assíncrona de propósito: o adaptador do Google Planilhas vai
// ter as mesmas três funções, e o resto do app não precisa mudar.

const CHAVE = 'central-de-treino';

export const armazenamentoLocal = {
  async carregar() {
    try {
      const salvo = localStorage.getItem(CHAVE);
      return salvo ? JSON.parse(salvo) : null;
    } catch (erro) {
      console.error('Não foi possível ler os dados salvos.', erro);
      return null;
    }
  },

  async salvar(estado) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (erro) {
      console.error('Não foi possível salvar os dados.', erro);
      return false;
    }
  },

  async apagar() {
    try {
      localStorage.removeItem(CHAVE);
      return true;
    } catch (erro) {
      console.error('Não foi possível apagar os dados.', erro);
      return false;
    }
  },
};
