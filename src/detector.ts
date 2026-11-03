import { LIMITE_GRAUS_LAT, limite, haversine } from './geo';
import { Encontro, Posicionamento, TipoEncontro } from './types';

// vítima não é genérico.
export const generico_vitima =  false;

// É protetiva se um é vítima, o outro é agressor, e o agressor está na lista dela.
function protetiva(a: Posicionamento, b: Posicionamento): boolean {
  if (a.vitima === b.vitima) return false; // precisa ser um de cada
  return a.vitima ? a.restricoes.has(b.id) : b.restricoes.has(a.id);
}

// Escolhe um tipo por par. Prioridade: protetiva > faccao > generico.
export function classificar(a: Posicionamento, b: Posicionamento): TipoEncontro | null {
  if (protetiva(a, b)) return 'protetiva';
  if (a.vitima || b.vitima) return generico_vitima ? 'generico' : null;
  if (a.faccao !== '' && a.faccao === b.faccao) return 'faccao'; // facção vazia não conta
  return 'generico';
}

// Acha os encontros de um timestamp, testando todos os pares.
export function detectar(timestamp: string, registros: Posicionamento[]): Encontro[] {
  const encontros: Encontro[] = [];

  for (let i = 0; i < registros.length; i++) {
    const a = registros[i];
    for (let j = i + 1; j < registros.length; j++) { // j = i+1: cada par uma vez só
      const b = registros[j];

      if (Math.abs(a.lat - b.lat) > LIMITE_GRAUS_LAT) continue;

      const distancia = haversine(a.lat, a.lon, b.lat, b.lon);
      if (!(distancia < limite)) continue; // estritamente menor que 20

      const tipo = classificar(a, b);
      if (tipo === null) continue;

      encontros.push({
        tipo,
        monitoradosEncontro: a.id < b.id ? [a.id, b.id] : [b.id, a.id], // ids em ordem
        timestamp,
        posicoes: {
          [a.id]: { lat: a.lat, lon: a.lon },
          [b.id]: { lat: b.lat, lon: b.lon },
        },
        distanciaMetros: distancia,
      });
    }
  }
  return encontros;
}