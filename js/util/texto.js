// "1 treino", "3 treinos"
export function plural(quantidade, singular, pluralForma = `${singular}s`) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralForma}`;
}
