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