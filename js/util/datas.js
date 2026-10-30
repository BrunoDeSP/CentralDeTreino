// Datas sempre como texto "AAAA-MM-DD", no fuso do celular.
// (toISOString() usa UTC e pode virar o dia à noite no horário de Brasília.)

export function hojeISO() {
  return paraISO(new Date());
}

export function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function deISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function somarDias(iso, dias) {
  const data = deISO(iso);
  data.setDate(data.getDate() + dias);
  return paraISO(data);
}

// Quantos dias inteiros vão de "a" até "b" (negativo se "b" vier antes).
export function diferencaDias(a, b) {
  return Math.round((emUTC(b) - emUTC(a)) / 86_400_000);
}

function emUTC(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

// Dia da semana com a segunda-feira primeiro: 0 = segunda ... 6 = domingo.
export function diaDaSemana(iso) {
  return (deISO(iso).getDay() + 6) % 7;
}

// Segunda-feira da semana da data.
export function inicioDaSemana(iso) {
  return somarDias(iso, -diaDaSemana(iso));
}

// Mês como { ano, mes }, com mes de 0 (janeiro) a 11 (dezembro).
export function mesDe(iso) {
  const [ano, mes] = iso.split('-').map(Number);
  return { ano, mes: mes - 1 };
}

export function somarMeses({ ano, mes }, quantidade) {
  const data = new Date(ano, mes + quantidade, 1);
  return { ano: data.getFullYear(), mes: data.getMonth() };
}

export function mesmoMes(a, b) {
  return a.ano === b.ano && a.mes === b.mes;
}

// Todas as datas do mês, do dia 1 ao último.
export function diasDoMes({ ano, mes }) {
  const total = new Date(ano, mes + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => paraISO(new Date(ano, mes, i + 1)));
}

const formatoCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const formatoComSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const formatoExtenso = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatoMesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const formatoMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

// "26/10"
export function dataCurta(iso) {
  return formatoCurto.format(deISO(iso));
}

// "seg., 26/10"
export function dataComDiaDaSemana(iso) {
  return formatoComSemana.format(deISO(iso));
}

// "segunda-feira, 26 de outubro"
export function dataPorExtenso(iso) {
  return formatoExtenso.format(deISO(iso));
}

// "outubro de 2026" ou só "outubro"
export function nomeDoMes({ ano, mes }, { comAno = true } = {}) {
  return (comAno ? formatoMesAno : formatoMes).format(new Date(ano, mes, 1));
}

const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Data e hora de um instante salvo (ISO): "hoje, 18:42", "ontem, 09:10" ou "28/10, 18:42".
export function dataEHora(instante) {
  const data = new Date(instante);
  if (Number.isNaN(data.getTime())) return '';
  const dia = paraISO(data);
  const hoje = hojeISO();
  const quando = dia === hoje ? 'hoje' : dia === somarDias(hoje, -1) ? 'ontem' : dataCurta(dia);
  return `${quando}, ${formatoHora.format(data)}`;
}
