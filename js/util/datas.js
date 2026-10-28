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

const formatoCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const formatoComSemana = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

// "26/10"
export function dataCurta(iso) {
  return formatoCurto.format(deISO(iso));
}

// "seg., 26/10"
export function dataComDiaDaSemana(iso) {
  return formatoComSemana.format(deISO(iso));
}
