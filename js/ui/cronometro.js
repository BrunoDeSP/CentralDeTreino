import { tempo } from '../util/texto.js';

// Cronômetro da pausa.
// - O tempo é calculado pelo horário de término, então continua certo mesmo
//   se a tela apagar ou o app for fechado e aberto de novo.
// - O bipe é agendado no relógio de áudio assim que a pausa começa. No
//   iPhone, o som só é liberado depois de um toque, por isso prepararAudio()
//   é chamado no próprio toque do botão.
// - A tela pode ficar ligada durante o treino, nos navegadores que permitem.

let intervalo = null;
let audio = null;
let bipes = [];
let travaDaTela = null;
let querTelaLigada = false;

// Precisa ser chamado dentro de um toque, antes de qualquer await.
export function prepararAudio() {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    audio ??= new Contexto();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

export function agendarBipe(fimEm) {
  cancelarBipe();
  if (!audio) return;
  const inicio = audio.currentTime + Math.max(0, (fimEm - Date.now()) / 1000);
  [0, 0.28, 0.56].forEach((atraso) => {
    const oscilador = audio.createOscillator();
    const volume = audio.createGain();
    const instante = inicio + atraso;
    oscilador.type = 'sine';
    oscilador.frequency.value = 880;
    volume.gain.setValueAtTime(0.0001, instante);
    volume.gain.exponentialRampToValueAtTime(0.35, instante + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, instante + 0.2);
    oscilador.connect(volume).connect(audio.destination);
    oscilador.start(instante);
    oscilador.stop(instante + 0.22);
    bipes.push(oscilador);
  });
}

export function cancelarBipe() {
  bipes.forEach((oscilador) => {
    try {
      oscilador.stop();
    } catch {
      // já tocou
    }
  });
  bipes = [];
}

export function vibrar() {
  try {
    navigator.vibrate?.([250, 120, 250, 120, 250]);
  } catch {
    // sem suporte a vibração
  }
}

// Atualiza todo elemento com data-cronometro até o fim da pausa.
export function acompanharPausa(obterFimEm, aoAcabar) {
  pararAcompanhamento();
  const atualizar = () => {
    const fimEm = obterFimEm();
    if (!fimEm) {
      pararAcompanhamento();
      return;
    }
    const restante = (fimEm - Date.now()) / 1000;
    document.querySelectorAll('[data-cronometro]').forEach((elemento) => {
      elemento.textContent = tempo(restante);
    });
    if (restante <= 0) {
      pararAcompanhamento();
      aoAcabar();
    }
  };
  atualizar();
  intervalo = setInterval(atualizar, 250);
}

export function pararAcompanhamento() {
  clearInterval(intervalo);
  intervalo = null;
}

export async function manterTelaLigada(ligar) {
  querTelaLigada = ligar;
  if (!ligar) {
    const trava = travaDaTela;
    travaDaTela = null;
    await trava?.release().catch(() => {});
    return;
  }
  if (travaDaTela || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    travaDaTela = await navigator.wakeLock.request('screen');
    travaDaTela.addEventListener('release', () => {
      travaDaTela = null;
    });
  } catch {
    travaDaTela = null;
  }
}

// O navegador solta a trava quando o app sai da tela; pede de novo na volta.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && querTelaLigada) manterTelaLigada(true);
});
