// Só aceita estes três textos; erro de digitação vira erro de compilação.
export type TipoEncontro = 'generico' | 'faccao' | 'protetiva';

export interface Posicionamento {
  id: number;    
  faccao: string;
  lat: number;   
  lon: number;   
  vitima: boolean; // medidaProtetiva - true = vítima, false = agressor
  
  // utilizando set ao invés de array pois set ja responde se o ID que queremos esta na lista ao inves de percorrer a lista inteira e não guarda id repetido
  restricoes: ReadonlySet<number>; //idsRestricaoMedida: os ids dos agressores dessa vítima.

}

// Todos os registros de um mesmo timestamp.
export interface GrupoTimestamp {
  timestamp: string;
  registros: Posicionamento[];
}

// Formato exato da saída exigida.
export interface Encontro {
  tipo: TipoEncontro;
  monitoradosEncontro: [number, number];
  timestamp: string;
  posicoes: Record<string, { lat: number; lon: number }>;
  distanciaMetros: number; // sem arredondar
}