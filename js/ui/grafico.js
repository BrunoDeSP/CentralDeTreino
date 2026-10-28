import { html } from './html.js';
import { dataCurta } from '../util/datas.js';
import { numero } from '../util/texto.js';

// Gráfico de linha em SVG, sem biblioteca: um ponto por treino, do mais
// antigo ao mais recente, com o último valor em destaque.
// pontos: [{ data, valor }]   unidade: 'kg' | 'reps' | 's' | 'min'

const LARGURA = 320;
const ALTURA = 160;
const MARGEM = { topo: 24, direita: 16, baixo: 26, esquerda: 38 };

export function graficoDeEvolucao(pontos, { unidade, descricao }) {
  if (pontos.length < 2) return null;

  let menor = Math.min(...pontos.map((ponto) => ponto.valor));
  let maior = Math.max(...pontos.map((ponto) => ponto.valor));
  if (menor === maior) {
    menor -= 2;
    maior += 2;
  }
  const folga = (maior - menor) * 0.2;
  menor = Math.max(0, menor - folga);
  maior += folga;

  const x = (i) => MARGEM.esquerda + (i / (pontos.length - 1)) * (LARGURA - MARGEM.esquerda - MARGEM.direita);
  const y = (valor) => MARGEM.topo + (1 - (valor - menor) / (maior - menor)) * (ALTURA - MARGEM.topo - MARGEM.baixo);
  const base = ALTURA - MARGEM.baixo;
  const linha = pontos.map((ponto, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(ponto.valor).toFixed(1)}`).join(' ');
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`;
  const ultimo = pontos.at(-1);
  const marcas = [menor, (menor + maior) / 2, maior];
  const comUnidade = (valor) => `${numero(valor)} ${unidade}`;

  return html`
    <svg class="grafico" viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-label="${descricao}">
      ${marcas.map((valor) => html`
        <line class="grafico-grade" x1="${MARGEM.esquerda}" x2="${LARGURA - MARGEM.direita}" y1="${y(valor).toFixed(1)}" y2="${y(valor).toFixed(1)}" />
        <text class="grafico-texto" x="${MARGEM.esquerda - 6}" y="${(y(valor) + 3).toFixed(1)}" text-anchor="end">${numero(Math.round(valor))}</text>`)}
      <path class="grafico-area" d="${area}" />
      <path class="grafico-linha" d="${linha}" />
      ${pontos.map((ponto, i) => html`<circle class="grafico-ponto ${i === pontos.length - 1 ? 'grafico-ponto--ultimo' : ''}" cx="${x(i).toFixed(1)}" cy="${y(ponto.valor).toFixed(1)}" r="${i === pontos.length - 1 ? 4.5 : 3.5}" />`)}
      <text class="grafico-valor" x="${x(pontos.length - 1).toFixed(1)}" y="${(y(ultimo.valor) - 10).toFixed(1)}" text-anchor="end">${comUnidade(ultimo.valor)}</text>
      <text class="grafico-texto" x="${MARGEM.esquerda}" y="${ALTURA - 6}" text-anchor="start">${dataCurta(pontos[0].data)}</text>
      <text class="grafico-texto" x="${LARGURA - MARGEM.direita}" y="${ALTURA - 6}" text-anchor="end">${dataCurta(ultimo.data)}</text>
    </svg>`;
}
