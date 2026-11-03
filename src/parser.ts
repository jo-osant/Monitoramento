import { createReadStream } from 'node:fs';
import { GrupoTimestamp, Posicionamento } from './types';

// Um conjunto vazio compartilhado: quem não é vítima não precisa de um Set novo.
const SEM_RESTRICOES: ReadonlySet<number> = new Set();

// Tira as aspas do texto.
function semAspas(texto: string): string {
  return texto.includes('"') ? texto.replace(/"/g, '') : texto;
}

// "1,2,3" -> Set{1,2,3}.
const cacheRestricoes = new Map<string, ReadonlySet<number>>();
function lerRestricoes(bruto: string): ReadonlySet<number> {
  const limpo = semAspas(bruto).replace(/[\[\]\s]/g, ''); // tira aspas, colchetes, espaços
  if (limpo === '') return SEM_RESTRICOES;
  let conjunto = cacheRestricoes.get(limpo);
  if (!conjunto) { // só monta o Set na primeira vez que vê esse texto
    conjunto = new Set(limpo.split(',').filter(Boolean).map(Number));
    cacheRestricoes.set(limpo, conjunto);
  }
  return conjunto;
}

// Converte uma linha em { timestamp, registro }. Linha inválida devolve null.
function lerLinha(linha: string): { timestamp: string; registro: Posicionamento } | null {
  const c = linha.split(';'); // as 7 colunas
  if (c.length < 6) return null;

  const id = Number(c[0]);
  const lat = Number(c[3]);
  const lon = Number(c[4]);
  if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const vitima = c[5].trim().toLowerCase() === 'true'; // texto -> booleano
  return {
    timestamp: semAspas(c[2]).trim(),
    registro: {
      id,
      faccao: semAspas(c[1]).trim(),
      lat,
      lon,
      vitima,
      restricoes: vitima ? lerRestricoes(c[6] ?? '') : SEM_RESTRICOES, // só vítima tem lista
    },
  };
}

// Lê o arquivo em pedaços e devolve UM grupo por timestamp (async generator).
export async function* lerPorTimestamp(caminho: string): AsyncGenerator<GrupoTimestamp> {
  // Pedaços de 16 MB: o arquivo nunca é carregado inteiro na memória.
  const stream = createReadStream(caminho, { encoding: 'utf8', highWaterMark: 1 << 24 });

  const encerrados = new Set<string>();  // timestamps já entregues
  let tsAtual: string | null = null;     // timestamp que estamos juntando
  let grupo = new Map<number, Posicionamento>(); // por id: se repetir, a última vence
  let resto = '';                        // pedaço de linha cortado no fim de um bloco
  let cabecalhoLido = false;

  function* processar(linha: string): Generator<GrupoTimestamp> {
    if (linha.endsWith('\r')) linha = linha.slice(0, -1); // quebra de linha do Windows
    if (linha === '') return;
    if (!cabecalhoLido) { cabecalhoLido = true; return; } // ignora o cabeçalho

    const lida = lerLinha(linha);
    if (!lida) return; // linha inválida: ignora

    if (lida.timestamp !== tsAtual) { // mudou o instante: o grupo anterior terminou
      if (tsAtual !== null) {
        encerrados.add(tsAtual);
        yield { timestamp: tsAtual, registros: [...grupo.values()] }; // entrega
        grupo = new Map();
      }
      if (encerrados.has(lida.timestamp)) { // arquivo fora de ordem: melhor falhar
        throw new Error(`Timestamp ${lida.timestamp} reapareceu fora de ordem.`);
      }
      tsAtual = lida.timestamp;
    }
    grupo.set(lida.registro.id, lida.registro);
  }

  for await (const pedaco of stream) {
    const linhas = (resto + pedaco).split('\n'); // junta a sobra do bloco anterior
    resto = linhas.pop() ?? '';                  // a última pode estar cortada: guarda
    for (const linha of linhas) yield* processar(linha);
  }
  if (resto !== '') yield* processar(resto);
  if (tsAtual !== null) yield { timestamp: tsAtual, registros: [...grupo.values()] }; // último grupo
}