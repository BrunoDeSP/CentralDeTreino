// Template de HTML com escape automático: tudo que entra em ${...} vira texto
// seguro, a não ser que já seja HTML montado por html`` ou marcado com cru().

class HtmlSeguro {
  constructor(valor) {
    this.valor = valor;
  }
  toString() {
    return this.valor;
  }
}

export function html(partes, ...valores) {
  let saida = partes[0];
  valores.forEach((valor, i) => {
    saida += converter(valor) + partes[i + 1];
  });
  return new HtmlSeguro(saida);
}

export function cru(valor) {
  return new HtmlSeguro(String(valor));
}

function converter(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (Array.isArray(valor)) return valor.map(converter).join('');
  if (valor instanceof HtmlSeguro) return valor.valor;
  return escapar(String(valor));
}

function escapar(texto) {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
