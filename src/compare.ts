import { readFileSync } from 'node:fs';
import { Encontro } from './types';

// Uso: node dist/compare.js <meu.json> <gabarito.json>
const [meu, gabarito] = process.argv.slice(2).map(
  (f) => JSON.parse(readFileSync(f, 'utf8')) as Encontro[],
);

// Identifica um encontro por par (em ordem), timestamp e tipo.
const chave = (e: Encontro): string => {
  const [a, b] = [...e.monitoradosEncontro].sort((x, y) => x - y);
  return `${a}-${b}|${e.timestamp}|${e.tipo}`;
};

const meus = new Set(meu.map(chave));
const gab = new Set(gabarito.map(chave));
const corretos = [...meus].filter((k) => gab.has(k)).length;
const falsos = [...meus].filter((k) => !gab.has(k));    // meus que não estão no gabarito
const faltando = [...gab].filter((k) => !meus.has(k));  // do gabarito que não achei

console.log(`corretos=${corretos} falsos=${falsos.length} faltando=${faltando.length} score=${corretos - falsos.length}`);
if (falsos.length) console.log('falsos:', falsos.slice(0, 5));
if (faltando.length) console.log('faltando:', faltando.slice(0, 5));