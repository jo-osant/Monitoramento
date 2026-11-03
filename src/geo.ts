export const raio_terra = 6_371_000; // raio da Terra
export const limite = 20;            // encontro = distância menor que 20

const rad = Math.PI / 180;  // transformando garus pra radianos para as funções trigonometricas

// Distância em metros entre dois pontos da esfera (fórmula de Haversine).
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * rad; //phi = Latitude e Lambda = Longitude
  const phi2 = lat2 * rad;
  const dPhi = (lat2 - lat1) * rad;     // diferença de latitude 
  const dLambda = (lon2 - lon1) * rad;  // diferença de longitude

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;

  return 2 * raio_terra * Math.asin(Math.sqrt(a));
}

// Pré-filtro: a distância real nunca é menor que a diferença de latitude em metros.
// Se só a latitude já passa de 20 m, nem calculamos o Haversine.
// O 1.0001 é uma folga contra erro de arredondamento.
export const LIMITE_GRAUS_LAT = (limite / (raio_terra * rad)) * 1.0001;